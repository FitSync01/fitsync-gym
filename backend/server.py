from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
load_dotenv(ROOT_DIR / 'backend' / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio, os, uuid, bcrypt, jwt, logging, secrets
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from typing import Optional, List
from contextlib import asynccontextmanager
from google import genai
from google.genai import types as genai_types
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

def split_csv_env(name: str, default: str = "") -> List[str]:
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def env_flag(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'fitsync_gym')]
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALG = "HS256"
SEED_DATABASE = env_flag("SEED_DATABASE", True)
CORS_ORIGINS = split_csv_env(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:8081,http://localhost:19006",
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Models ────────────────────────────────────────
class RegisterIn(BaseModel):
    email: str
    password: str
    name: str
    phone: str = ""
    role: str = "member"

class LoginIn(BaseModel):
    email: str
    password: str

class GoogleSessionIn(BaseModel):
    id_token: str

class ResetPwIn(BaseModel):
    new_password: str

class GymCreateIn(BaseModel):
    name: str
    address: str = ""
    phone: str = ""

class JoinGymIn(BaseModel):
    gym_code: str

class MemberCreateIn(BaseModel):
    email: str
    name: str
    phone: str = ""
    temporary_password: str = ""

class StaffCreateIn(BaseModel):
    email: str
    name: str
    phone: str = ""
    temporary_password: str = ""

class PlanIn(BaseModel):
    plan_name: str
    duration_days: int
    price: float
    active: bool = True

class ScanIn(BaseModel):
    member_id: str
    method: str = "manual"

class CashReqIn(BaseModel):
    plan_id: str

class AssistantIn(BaseModel):
    message: str

class PaymentIn(BaseModel):
    member_id: str
    amount: float
    method: str = "cash"
    plan_name: str = ""
    note: str = ""

class MemberUpdateIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    suspended: Optional[bool] = None

class PurchasePlanIn(BaseModel):
    plan_id: str

class StaffIssueIn(BaseModel):
    title: str
    description: str = ""

class SetRoleIn(BaseModel):
    role: str

# ─── Auth Helpers ──────────────────────────────────
def hp(pw: str) -> str:
    return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def vp(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

def make_token(uid: str, email: str, role: str, hours=24) -> str:
    return jwt.encode({"sub": uid, "email": email, "role": role, "exp": datetime.now(timezone.utc) + timedelta(hours=hours), "type": "access"}, JWT_SECRET, algorithm=JWT_ALG)

def make_refresh(uid: str) -> str:
    return jwt.encode({"sub": uid, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}, JWT_SECRET, algorithm=JWT_ALG)

async def current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        p = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if p.get("type") != "access":
            raise HTTPException(401, "Invalid token")
        u = await db.users.find_one({"user_id": p["sub"]}, {"_id": 0})
        if not u:
            raise HTTPException(401, "User not found")
        u.pop("password_hash", None)
        return u
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

# ─── Seed Import ──────────────────────────────────
from seed import seed_database

# ─── Lifespan ─────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("google_sub", unique=True, sparse=True)
    await db.gyms.create_index("gym_id", unique=True)
    await db.gyms.create_index("code")
    await db.members.create_index([("gym_id", 1), ("member_id", 1)])
    await db.members.create_index([("gym_id", 1), ("user_id", 1)])
    await db.attendance_logs.create_index([("gym_id", 1), ("timestamp", -1)])
    await db.payments.create_index([("gym_id", 1), ("paid_at", -1)])
    if SEED_DATABASE:
        await seed_database(db)
    else:
        logger.info("Skipping seed data because SEED_DATABASE is disabled")
    logger.info("FitSync Gym API started")
    yield
    client.close()

app = FastAPI(title="FitSync Gym API", lifespan=lifespan)
auth = APIRouter(prefix="/api/auth", tags=["Auth"])
api = APIRouter(prefix="/api", tags=["API"])


@app.get("/healthz", tags=["Infra"])
async def healthz():
    return {"status": "ok"}

# ─── Auth Routes ──────────────────────────────────
@auth.post("/register")
async def register(data: RegisterIn, response: Response):
    email = data.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    uid = f"user_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    role = data.role if data.role in ["owner", "member"] else "member"
    user = {"user_id": uid, "email": email, "password_hash": hp(data.password), "name": data.name, "phone": data.phone, "role": role, "gym_id": None, "must_reset_password": False, "primary_auth_provider": "email", "linked_auth_providers": ["email"], "created_at": now, "updated_at": now, "last_login_at": now}
    await db.users.insert_one(user)
    tk = make_token(uid, email, role)
    rt = make_refresh(uid)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"user": user, "access_token": tk, "refresh_token": rt}

@auth.post("/login")
async def login(data: LoginIn, response: Response):
    email = data.email.lower().strip()
    u = await db.users.find_one({"email": email}, {"_id": 0})
    if not u or not vp(data.password, u.get("password_hash", "")):
        raise HTTPException(401, "Invalid credentials")
    await db.users.update_one({"user_id": u["user_id"]}, {"$set": {"last_login_at": datetime.now(timezone.utc).isoformat()}})
    tk = make_token(u["user_id"], email, u["role"])
    rt = make_refresh(u["user_id"])
    u.pop("password_hash", None)
    return {"user": u, "access_token": tk, "refresh_token": rt}

@auth.get("/me")
async def me(request: Request):
    return await current_user(request)

@auth.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}

@auth.post("/google-session")
async def google_session(data: GoogleSessionIn, response: Response):
    configured_client_ids = [client_id.strip() for client_id in os.environ.get("GOOGLE_CLIENT_IDS", "").split(",") if client_id.strip()]
    if not configured_client_ids:
        raise HTTPException(501, "Google sign-in is not configured yet. Set GOOGLE_CLIENT_IDS on the backend.")

    try:
        google_data = google_id_token.verify_oauth2_token(data.id_token, google_requests.Request())
        audience = (google_data.get("aud") or "").strip()
        if audience not in configured_client_ids:
            raise ValueError("Unexpected Google token audience")
        if not google_data.get("email_verified"):
            raise ValueError("Google account email is not verified")
        email = (google_data.get("email") or "").lower().strip()
        if not email:
            raise ValueError("Google account email missing")
    except Exception as e:
        logger.warning(f"Google auth verification failed: {e}")
        raise HTTPException(401, f"Google auth failed: {str(e)}")

    now = datetime.now(timezone.utc).isoformat()
    google_sub = google_data.get("sub", "")
    display_name = (google_data.get("name") or "").strip()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        linked_auth_providers = existing.get("linked_auth_providers") or []
        if "google" not in linked_auth_providers:
            linked_auth_providers = [*linked_auth_providers, "google"]
        updates = {
            "last_login_at": now,
            "updated_at": now,
            "linked_auth_providers": linked_auth_providers,
        }
        if display_name:
            updates["name"] = display_name
        if google_sub and not existing.get("google_sub"):
            updates["google_sub"] = google_sub
        if not existing.get("primary_auth_provider"):
            updates["primary_auth_provider"] = "google"
        await db.users.update_one({"user_id": existing["user_id"]}, {"$set": updates})
        u = await db.users.find_one({"user_id": existing["user_id"]}, {"_id": 0})
    else:
        uid = f"user_{uuid.uuid4().hex[:12]}"
        u = {
            "user_id": uid,
            "email": email,
            "password_hash": "",
            "name": display_name,
            "phone": "",
            "role": "",
            "gym_id": None,
            "must_reset_password": False,
            "primary_auth_provider": "google",
            "linked_auth_providers": ["google"],
            "google_sub": google_sub,
            "created_at": now,
            "updated_at": now,
            "last_login_at": now,
        }
        await db.users.insert_one(u)

    u.pop("password_hash", None)
    u.pop("_id", None)
    tk = make_token(u["user_id"], email, u.get("role", ""))
    rt = make_refresh(u["user_id"])
    return {"user": u, "access_token": tk, "refresh_token": rt}

@auth.post("/reset-password")
async def reset_pw(data: ResetPwIn, request: Request):
    u = await current_user(request)
    await db.users.update_one({"user_id": u["user_id"]}, {"$set": {"password_hash": hp(data.new_password), "must_reset_password": False, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Password updated"}

@auth.post("/set-role")
async def set_role(data: SetRoleIn, request: Request):
    u = await current_user(request)
    if data.role not in ["owner", "member", "staff"]:
        raise HTTPException(400, "Invalid role")
    await db.users.update_one({"user_id": u["user_id"]}, {"$set": {"role": data.role, "updated_at": datetime.now(timezone.utc).isoformat()}})
    updated = await db.users.find_one({"user_id": u["user_id"]}, {"_id": 0})
    updated.pop("password_hash", None)
    return updated

# ─── Gym Routes ───────────────────────────────────
@api.post("/gyms")
async def create_gym(data: GymCreateIn, request: Request):
    u = await current_user(request)
    gid = f"gym_{uuid.uuid4().hex[:8]}"
    code = uuid.uuid4().hex[:6].upper()
    gym = {"gym_id": gid, "name": data.name, "code": code, "owner_id": u["user_id"], "address": data.address, "phone": data.phone, "active": True, "subscription_status": "trial", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.gyms.insert_one(gym)
    await db.users.update_one({"user_id": u["user_id"]}, {"$set": {"role": "owner", "gym_id": gid}})
    gym.pop("_id", None)
    return gym

@api.get("/gyms/{gym_id}")
async def get_gym(gym_id: str, request: Request):
    g = await db.gyms.find_one({"gym_id": gym_id}, {"_id": 0})
    if not g:
        raise HTTPException(404, "Gym not found")
    return g

@api.get("/gyms/code/{code}")
async def get_gym_by_code(code: str):
    g = await db.gyms.find_one({"code": code.upper()}, {"_id": 0})
    if not g:
        raise HTTPException(404, "Gym not found")
    return g

@api.post("/gyms/join")
async def join_gym(data: JoinGymIn, request: Request):
    u = await current_user(request)
    g = await db.gyms.find_one({"code": data.gym_code.upper()}, {"_id": 0})
    if not g:
        raise HTTPException(404, "Invalid gym code")
    existing = await db.members.find_one({"gym_id": g["gym_id"], "user_id": u["user_id"]})
    if existing:
        raise HTTPException(400, "Already a member of this gym")
    mid = f"mem_{uuid.uuid4().hex[:8]}"
    member = {"member_id": mid, "user_id": u["user_id"], "gym_id": g["gym_id"], "name": u["name"], "email": u["email"], "phone": u.get("phone", ""), "membership_status": "none", "membership_end_date": None, "plan_name": None, "payment_status": "none", "joined_at": datetime.now(timezone.utc).isoformat(), "suspended": False}
    await db.members.insert_one(member)
    await db.users.update_one({"user_id": u["user_id"]}, {"$set": {"role": "member", "gym_id": g["gym_id"]}})
    await db.attendance_status.insert_one({"gym_id": g["gym_id"], "member_id": mid, "checked_in": False, "last_scan_at": None})
    await db.notifications.insert_one({"notification_id": f"notif_{uuid.uuid4().hex[:8]}", "gym_id": g["gym_id"], "user_id": u["user_id"], "title": "Welcome!", "message": f"Welcome to {g['name']}! Check out membership plans.", "type": "welcome", "read": False, "created_at": datetime.now(timezone.utc).isoformat()})
    member.pop("_id", None)
    return member

# ─── Member Routes ────────────────────────────────
@api.get("/gyms/{gym_id}/members")
async def list_members(gym_id: str, request: Request):
    await current_user(request)
    return await db.members.find({"gym_id": gym_id}, {"_id": 0}).to_list(500)

@api.post("/gyms/{gym_id}/members")
async def add_member(gym_id: str, data: MemberCreateIn, request: Request):
    u = await current_user(request)
    if u["role"] not in ["owner", "super_admin"]:
        raise HTTPException(403, "Forbidden")
    uid = f"user_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    pw = data.temporary_password or "Temp@123"
    user_doc = {"user_id": uid, "email": data.email.lower(), "password_hash": hp(pw), "name": data.name, "phone": data.phone, "role": "member", "gym_id": gym_id, "must_reset_password": True, "primary_auth_provider": "email", "linked_auth_providers": ["email"], "created_at": now, "updated_at": now, "last_login_at": None}
    try:
        await db.users.insert_one(user_doc)
    except Exception:
        raise HTTPException(400, "Email already exists")
    mid = f"mem_{uuid.uuid4().hex[:8]}"
    member = {"member_id": mid, "user_id": uid, "gym_id": gym_id, "name": data.name, "email": data.email.lower(), "phone": data.phone, "membership_status": "none", "membership_end_date": None, "plan_name": None, "payment_status": "none", "joined_at": now, "suspended": False}
    await db.members.insert_one(member)
    await db.attendance_status.insert_one({"gym_id": gym_id, "member_id": mid, "checked_in": False, "last_scan_at": None})
    member.pop("_id", None)
    return member

@api.put("/gyms/{gym_id}/members/{member_id}")
async def update_member(gym_id: str, member_id: str, data: MemberUpdateIn, request: Request):
    u = await current_user(request)
    if u["role"] not in ["owner", "super_admin"]:
        raise HTTPException(403, "Forbidden")
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if updates:
        await db.members.update_one({"gym_id": gym_id, "member_id": member_id}, {"$set": updates})
    return await db.members.find_one({"gym_id": gym_id, "member_id": member_id}, {"_id": 0})

@api.get("/gyms/{gym_id}/members/search")
async def search_members(gym_id: str, q: str = "", request: Request = None):
    if request:
        await current_user(request)
    if not q:
        return await db.members.find({"gym_id": gym_id}, {"_id": 0}).to_list(50)
    return await db.members.find({"gym_id": gym_id, "$or": [{"name": {"$regex": q, "$options": "i"}}, {"member_id": {"$regex": q, "$options": "i"}}, {"email": {"$regex": q, "$options": "i"}}]}, {"_id": 0}).to_list(50)

# ─── Staff Routes ─────────────────────────────────
@api.get("/gyms/{gym_id}/staff")
async def list_staff(gym_id: str, request: Request):
    await current_user(request)
    return await db.staff.find({"gym_id": gym_id}, {"_id": 0}).to_list(100)

@api.post("/gyms/{gym_id}/staff")
async def add_staff(gym_id: str, data: StaffCreateIn, request: Request):
    u = await current_user(request)
    if u["role"] not in ["owner", "super_admin"]:
        raise HTTPException(403, "Forbidden")
    uid = f"user_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    pw = data.temporary_password or "Staff@123"
    user_doc = {"user_id": uid, "email": data.email.lower(), "password_hash": hp(pw), "name": data.name, "phone": data.phone, "role": "staff", "gym_id": gym_id, "must_reset_password": True, "primary_auth_provider": "email", "linked_auth_providers": ["email"], "created_at": now, "updated_at": now, "last_login_at": None}
    try:
        await db.users.insert_one(user_doc)
    except Exception:
        raise HTTPException(400, "Email already exists")
    sid = f"staff_{uuid.uuid4().hex[:8]}"
    staff = {"staff_id": sid, "user_id": uid, "gym_id": gym_id, "name": data.name, "email": data.email.lower(), "phone": data.phone, "active": True, "created_at": now}
    await db.staff.insert_one(staff)
    staff.pop("_id", None)
    return staff

# ─── Plan Routes ──────────────────────────────────
@api.get("/gyms/{gym_id}/plans")
async def list_plans(gym_id: str):
    return await db.membership_plans.find({"gym_id": gym_id, "active": True}, {"_id": 0}).to_list(50)

@api.post("/gyms/{gym_id}/plans")
async def create_plan(gym_id: str, data: PlanIn, request: Request):
    u = await current_user(request)
    if u["role"] not in ["owner", "super_admin"]:
        raise HTTPException(403, "Forbidden")
    pid = f"plan_{uuid.uuid4().hex[:8]}"
    plan = {"plan_id": pid, "gym_id": gym_id, "plan_name": data.plan_name, "duration_days": data.duration_days, "price": data.price, "active": data.active, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.membership_plans.insert_one(plan)
    plan.pop("_id", None)
    return plan

# ─── Attendance Routes ────────────────────────────
@api.post("/gyms/{gym_id}/attendance/scan")
async def scan_attendance(gym_id: str, data: ScanIn, request: Request):
    await current_user(request)
    member = await db.members.find_one({"gym_id": gym_id, "member_id": data.member_id}, {"_id": 0})
    if not member:
        raise HTTPException(404, "Member not found")
    if member.get("suspended"):
        raise HTTPException(400, "Member suspended")
    status = await db.attendance_status.find_one({"gym_id": gym_id, "member_id": data.member_id})
    if status and status.get("last_scan_at"):
        last = datetime.fromisoformat(status["last_scan_at"]) if isinstance(status["last_scan_at"], str) else status["last_scan_at"]
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        if (datetime.now(timezone.utc) - last).total_seconds() < 30:
            raise HTTPException(400, "Duplicate scan, wait 30 seconds")
    checked_in = not (status.get("checked_in", False) if status else False)
    now = datetime.now(timezone.utc).isoformat()
    await db.attendance_status.update_one({"gym_id": gym_id, "member_id": data.member_id}, {"$set": {"checked_in": checked_in, "last_scan_at": now}}, upsert=True)
    log = {"log_id": f"log_{uuid.uuid4().hex[:8]}", "gym_id": gym_id, "member_id": data.member_id, "member_name": member["name"], "type": "check_in" if checked_in else "check_out", "method": data.method, "timestamp": now}
    await db.attendance_logs.insert_one(log)
    log.pop("_id", None)
    return {"status": "checked_in" if checked_in else "checked_out", "member_name": member["name"], "log": log}

@api.get("/gyms/{gym_id}/attendance/today")
async def today_attendance(gym_id: str, request: Request):
    await current_user(request)
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    return await db.attendance_logs.find({"gym_id": gym_id, "timestamp": {"$gte": today}}, {"_id": 0}).sort("timestamp", -1).to_list(500)

@api.get("/gyms/{gym_id}/attendance/logs")
async def attendance_logs(gym_id: str, request: Request, limit: int = 100):
    await current_user(request)
    return await db.attendance_logs.find({"gym_id": gym_id}, {"_id": 0}).sort("timestamp", -1).to_list(limit)

@api.get("/gyms/{gym_id}/attendance/status/{member_id}")
async def attendance_status(gym_id: str, member_id: str):
    s = await db.attendance_status.find_one({"gym_id": gym_id, "member_id": member_id}, {"_id": 0})
    return s or {"checked_in": False, "last_scan_at": None}

@api.get("/members/{member_id}/attendance")
async def member_attendance(member_id: str, request: Request, limit: int = 50):
    await current_user(request)
    return await db.attendance_logs.find({"member_id": member_id}, {"_id": 0}).sort("timestamp", -1).to_list(limit)

# ─── Payment Routes ───────────────────────────────
@api.get("/gyms/{gym_id}/payments")
async def list_payments(gym_id: str, request: Request, limit: int = 100):
    await current_user(request)
    return await db.payments.find({"gym_id": gym_id}, {"_id": 0}).sort("paid_at", -1).to_list(limit)

@api.post("/gyms/{gym_id}/payments")
async def record_payment(gym_id: str, data: PaymentIn, request: Request):
    u = await current_user(request)
    if u["role"] not in ["owner", "super_admin"]:
        raise HTTPException(403, "Forbidden")
    pay = {"payment_id": f"pay_{uuid.uuid4().hex[:8]}", "gym_id": gym_id, "member_id": data.member_id, "amount": data.amount, "method": data.method, "status": "completed", "plan_name": data.plan_name, "paid_at": datetime.now(timezone.utc).isoformat(), "note": data.note}
    await db.payments.insert_one(pay)
    pay.pop("_id", None)
    return pay

# ─── Cash Request Routes ─────────────────────────
@api.post("/gyms/{gym_id}/cash-requests")
async def create_cash_request(gym_id: str, data: CashReqIn, request: Request):
    u = await current_user(request)
    plan = await db.membership_plans.find_one({"plan_id": data.plan_id, "gym_id": gym_id}, {"_id": 0})
    if not plan:
        raise HTTPException(404, "Plan not found")
    member = await db.members.find_one({"gym_id": gym_id, "user_id": u["user_id"]}, {"_id": 0})
    if not member:
        raise HTTPException(404, "Member not found")
    rid = f"req_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc)
    req_doc = {"request_id": rid, "gym_id": gym_id, "member_id": member["member_id"], "member_name": member["name"], "plan_id": data.plan_id, "plan_name": plan["plan_name"], "amount": plan["price"], "status": "pending", "expires_at": (now + timedelta(hours=24)).isoformat(), "created_at": now.isoformat(), "resolved_at": None, "resolved_by": None}
    await db.cash_payment_requests.insert_one(req_doc)
    req_doc.pop("_id", None)
    return req_doc

@api.get("/gyms/{gym_id}/cash-requests")
async def list_cash_requests(gym_id: str, request: Request):
    await current_user(request)
    reqs = await db.cash_payment_requests.find({"gym_id": gym_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    now = datetime.now(timezone.utc)
    for r in reqs:
        if r["status"] == "pending":
            exp = datetime.fromisoformat(r["expires_at"])
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if now > exp:
                r["status"] = "expired"
                await db.cash_payment_requests.update_one({"request_id": r["request_id"]}, {"$set": {"status": "expired"}})
    return reqs

@api.put("/gyms/{gym_id}/cash-requests/{request_id}/approve")
async def approve_cash_request(gym_id: str, request_id: str, request: Request):
    u = await current_user(request)
    if u["role"] not in ["owner", "super_admin"]:
        raise HTTPException(403, "Forbidden")
    req = await db.cash_payment_requests.find_one({"request_id": request_id, "gym_id": gym_id}, {"_id": 0})
    if not req:
        raise HTTPException(404, "Request not found")
    if req["status"] != "pending":
        raise HTTPException(400, f"Request already {req['status']}")
    now = datetime.now(timezone.utc)
    exp = datetime.fromisoformat(req["expires_at"])
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if now > exp:
        await db.cash_payment_requests.update_one({"request_id": request_id}, {"$set": {"status": "expired"}})
        raise HTTPException(400, "Request expired")
    plan = await db.membership_plans.find_one({"plan_id": req["plan_id"]}, {"_id": 0})
    end_date = (now + timedelta(days=plan["duration_days"])).isoformat()
    await db.members.update_one({"gym_id": gym_id, "member_id": req["member_id"]}, {"$set": {"membership_status": "active", "membership_end_date": end_date, "plan_name": req["plan_name"], "payment_status": "paid"}})
    await db.cash_payment_requests.update_one({"request_id": request_id}, {"$set": {"status": "approved", "resolved_at": now.isoformat(), "resolved_by": u["user_id"]}})
    await db.payments.insert_one({"payment_id": f"pay_{uuid.uuid4().hex[:8]}", "gym_id": gym_id, "member_id": req["member_id"], "amount": req["amount"], "method": "cash", "status": "completed", "plan_name": req["plan_name"], "paid_at": now.isoformat(), "note": "Cash payment approved"})
    return {"message": "Approved"}

@api.put("/gyms/{gym_id}/cash-requests/{request_id}/reject")
async def reject_cash_request(gym_id: str, request_id: str, request: Request):
    u = await current_user(request)
    if u["role"] not in ["owner", "super_admin"]:
        raise HTTPException(403, "Forbidden")
    await db.cash_payment_requests.update_one({"request_id": request_id, "gym_id": gym_id}, {"$set": {"status": "rejected", "resolved_at": datetime.now(timezone.utc).isoformat(), "resolved_by": u["user_id"]}})
    return {"message": "Rejected"}

# ─── Analytics Routes ─────────────────────────────
@api.get("/gyms/{gym_id}/analytics/kpis")
async def gym_kpis(gym_id: str, request: Request):
    await current_user(request)
    total = await db.members.count_documents({"gym_id": gym_id})
    active = await db.members.count_documents({"gym_id": gym_id, "membership_status": "active"})
    expired = await db.members.count_documents({"gym_id": gym_id, "membership_status": "expired"})
    live = await db.attendance_status.count_documents({"gym_id": gym_id, "checked_in": True})
    now = datetime.now(timezone.utc)
    week = (now + timedelta(days=7)).isoformat()
    expiring = await db.members.count_documents({"gym_id": gym_id, "membership_status": "active", "membership_end_date": {"$lte": week, "$gte": now.isoformat()}})
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    payments = await db.payments.find({"gym_id": gym_id, "paid_at": {"$gte": month_start}, "status": "completed"}, {"_id": 0, "amount": 1}).to_list(1000)
    monthly_revenue = sum(p["amount"] for p in payments)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_checkins = await db.attendance_logs.count_documents({"gym_id": gym_id, "type": "check_in", "timestamp": {"$gte": today}})
    pending_cash = await db.cash_payment_requests.count_documents({"gym_id": gym_id, "status": "pending"})
    return {"total_members": total, "active_members": active, "expired_members": expired, "live_crowd": live, "expiring_soon": expiring, "monthly_revenue": round(monthly_revenue, 2), "today_checkins": today_checkins, "pending_cash_requests": pending_cash}

@api.get("/gyms/{gym_id}/analytics/attendance-chart")
async def attendance_chart(gym_id: str, request: Request):
    await current_user(request)
    now = datetime.now(timezone.utc)
    data = []
    for i in range(7):
        d = now - timedelta(days=6 - i)
        start = d.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        end = d.replace(hour=23, minute=59, second=59, microsecond=0).isoformat()
        count = await db.attendance_logs.count_documents({"gym_id": gym_id, "type": "check_in", "timestamp": {"$gte": start, "$lte": end}})
        data.append({"day": d.strftime("%a"), "date": d.strftime("%m/%d"), "count": count})
    return data

@api.get("/gyms/{gym_id}/analytics/revenue-chart")
async def revenue_chart(gym_id: str, request: Request):
    await current_user(request)
    now = datetime.now(timezone.utc)
    data = []
    for i in range(6):
        if i == 0:
            d = now
        else:
            d = now.replace(day=1) - timedelta(days=30 * i)
        start = d.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        next_m = (d.replace(day=28) + timedelta(days=4)).replace(day=1)
        end = next_m.isoformat()
        payments = await db.payments.find({"gym_id": gym_id, "paid_at": {"$gte": start, "$lt": end}, "status": "completed"}, {"_id": 0, "amount": 1}).to_list(1000)
        total = sum(p["amount"] for p in payments)
        data.append({"month": d.strftime("%b"), "revenue": round(total, 2)})
    return list(reversed(data))

@api.get("/gyms/{gym_id}/analytics/risk-members")
async def risk_members(gym_id: str, request: Request):
    await current_user(request)
    members = await db.members.find({"gym_id": gym_id, "membership_status": "active"}, {"_id": 0}).to_list(500)
    now = datetime.now(timezone.utc)
    risks = []
    for m in members:
        risk = "low"
        reasons = []
        if m.get("membership_end_date"):
            end = datetime.fromisoformat(m["membership_end_date"])
            if end.tzinfo is None:
                end = end.replace(tzinfo=timezone.utc)
            days_left = (end - now).days
            if days_left <= 7:
                risk = "high"
                reasons.append(f"Expiring in {days_left} days")
            elif days_left <= 15:
                if risk != "high":
                    risk = "medium"
                reasons.append(f"Expiring in {days_left} days")
        ten_days_ago = (now - timedelta(days=10)).isoformat()
        recent = await db.attendance_logs.count_documents({"member_id": m["member_id"], "type": "check_in", "timestamp": {"$gte": ten_days_ago}})
        if recent == 0:
            risk = "high"
            reasons.append("No attendance in 10 days")
        if risk != "low":
            risks.append({"member_id": m["member_id"], "name": m["name"], "risk": risk, "reasons": reasons})
    return sorted(risks, key=lambda x: 0 if x["risk"] == "high" else 1)

# ─── AI Assistant ─────────────────────────────────
@api.post("/gyms/{gym_id}/assistant/chat")
async def assistant_chat(gym_id: str, data: AssistantIn, request: Request):
    u = await current_user(request)
    try:
        total = await db.members.count_documents({"gym_id": gym_id})
        active = await db.members.count_documents({"gym_id": gym_id, "membership_status": "active"})
        expired = await db.members.count_documents({"gym_id": gym_id, "membership_status": "expired"})
        now = datetime.now(timezone.utc)
        week = (now + timedelta(days=7)).isoformat()
        expiring = await db.members.count_documents({"gym_id": gym_id, "membership_status": "active", "membership_end_date": {"$lte": week}})
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        pmts = await db.payments.find({"gym_id": gym_id, "paid_at": {"$gte": month_start}}, {"_id": 0, "amount": 1}).to_list(1000)
        revenue = sum(p["amount"] for p in pmts)
        live = await db.attendance_status.count_documents({"gym_id": gym_id, "checked_in": True})
        system_msg = f"""You are FitSync Gym AI Assistant. Current gym data:
- Total members: {total}, Active: {active}, Expired: {expired}
- Expiring within 7 days: {expiring}
- Monthly revenue: ${revenue:.2f}
- Currently in gym: {live}
Answer concisely about gym operations. Provide actionable insights."""
        gemini_api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        if not gemini_api_key:
            return {"response": "AI assistant is disabled until you set your own GEMINI_API_KEY on the backend."}

        model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"
        ai_client = genai.Client(api_key=gemini_api_key)
        resp = await asyncio.to_thread(
            ai_client.models.generate_content,
            model=model,
            contents=data.message,
            config=genai_types.GenerateContentConfig(
                system_instruction=system_msg,
                thinking_config=genai_types.ThinkingConfig(thinking_budget=0),
            ),
        )

        answer = (getattr(resp, "text", "") or "").strip()
        return {"response": answer or "AI assistant returned an empty response."}
    except Exception as e:
        logger.error(f"AI error: {e}")
        return {"response": f"AI assistant temporarily unavailable. Error: {str(e)}"}

# ─── Admin Routes ─────────────────────────────────
@api.get("/admin/gyms")
async def admin_list_gyms(request: Request):
    u = await current_user(request)
    if u["role"] != "super_admin":
        raise HTTPException(403, "Forbidden")
    gyms = await db.gyms.find({}, {"_id": 0}).to_list(500)
    for g in gyms:
        g["member_count"] = await db.members.count_documents({"gym_id": g["gym_id"]})
        g["active_members"] = await db.members.count_documents({"gym_id": g["gym_id"], "membership_status": "active"})
    return gyms

@api.get("/admin/stats")
async def admin_stats(request: Request):
    u = await current_user(request)
    if u["role"] != "super_admin":
        raise HTTPException(403, "Forbidden")
    total_gyms = await db.gyms.count_documents({})
    active_gyms = await db.gyms.count_documents({"active": True})
    total_members = await db.members.count_documents({})
    pmts = await db.payments.find({}, {"_id": 0, "amount": 1}).to_list(10000)
    total_revenue = sum(p["amount"] for p in pmts)
    return {"total_gyms": total_gyms, "active_gyms": active_gyms, "total_members": total_members, "total_revenue": round(total_revenue, 2)}

@api.put("/admin/gyms/{gym_id}/toggle")
async def toggle_gym(gym_id: str, request: Request):
    u = await current_user(request)
    if u["role"] != "super_admin":
        raise HTTPException(403, "Forbidden")
    gym = await db.gyms.find_one({"gym_id": gym_id}, {"_id": 0})
    if not gym:
        raise HTTPException(404, "Gym not found")
    new_active = not gym["active"]
    await db.gyms.update_one({"gym_id": gym_id}, {"$set": {"active": new_active}})
    return {"gym_id": gym_id, "active": new_active}

# ─── Notification Routes ─────────────────────────
@api.get("/notifications")
async def list_notifications(request: Request, limit: int = 50):
    u = await current_user(request)
    return await db.notifications.find({"user_id": u["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(limit)

@api.put("/notifications/{notification_id}/read")
async def mark_read(notification_id: str, request: Request):
    u = await current_user(request)
    await db.notifications.update_one({"notification_id": notification_id, "user_id": u["user_id"]}, {"$set": {"read": True}})
    return {"message": "Read"}

# ─── Member Self-Service ─────────────────────────
@api.get("/member/me")
async def get_my_membership(request: Request):
    u = await current_user(request)
    if not u.get("gym_id"):
        raise HTTPException(404, "Not in a gym")
    member = await db.members.find_one({"gym_id": u["gym_id"], "user_id": u["user_id"]}, {"_id": 0})
    if not member:
        raise HTTPException(404, "Member not found")
    status = await db.attendance_status.find_one({"gym_id": u["gym_id"], "member_id": member["member_id"]}, {"_id": 0})
    member["checked_in"] = status.get("checked_in", False) if status else False
    return member

@api.post("/member/purchase-plan")
async def purchase_plan(data: PurchasePlanIn, request: Request):
    u = await current_user(request)
    if not u.get("gym_id"):
        raise HTTPException(400, "Not in a gym")
    plan = await db.membership_plans.find_one({"plan_id": data.plan_id, "gym_id": u["gym_id"]}, {"_id": 0})
    if not plan:
        raise HTTPException(404, "Plan not found")
    member = await db.members.find_one({"gym_id": u["gym_id"], "user_id": u["user_id"]}, {"_id": 0})
    if not member:
        raise HTTPException(404, "Member not found")
    now = datetime.now(timezone.utc)
    end = (now + timedelta(days=plan["duration_days"])).isoformat()
    await db.members.update_one({"member_id": member["member_id"]}, {"$set": {"membership_status": "active", "membership_end_date": end, "plan_name": plan["plan_name"], "payment_status": "paid"}})
    await db.payments.insert_one({"payment_id": f"pay_{uuid.uuid4().hex[:8]}", "gym_id": u["gym_id"], "member_id": member["member_id"], "amount": plan["price"], "method": "online", "status": "completed", "plan_name": plan["plan_name"], "paid_at": now.isoformat(), "note": "Online purchase"})
    return {"message": "Plan activated", "end_date": end}

@api.get("/member/gym")
async def get_member_gym(request: Request):
    u = await current_user(request)
    if not u.get("gym_id"):
        raise HTTPException(404, "Not in a gym")
    g = await db.gyms.find_one({"gym_id": u["gym_id"]}, {"_id": 0})
    return g

# ─── Staff Issues ─────────────────────────────────
@api.post("/gyms/{gym_id}/staff-issues")
async def report_issue(gym_id: str, data: StaffIssueIn, request: Request):
    u = await current_user(request)
    issue = {"issue_id": f"issue_{uuid.uuid4().hex[:8]}", "gym_id": gym_id, "reported_by": u["user_id"], "reporter_name": u["name"], "title": data.title, "description": data.description, "status": "open", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.staff_issues.insert_one(issue)
    issue.pop("_id", None)
    return issue

# ─── Include Routers + CORS ──────────────────────
app.include_router(auth)
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS or ["*"],
    allow_credentials=not (CORS_ORIGINS == ["*"] or not CORS_ORIGINS),
    allow_methods=["*"],
    allow_headers=["*"],
)
