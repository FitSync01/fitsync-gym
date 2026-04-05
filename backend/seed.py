import uuid
import bcrypt
import random
from datetime import datetime, timezone, timedelta


def hp(pw):
    return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


async def seed_database(db):
    existing = await db.users.find_one({"email": "admin@fitsync.com"})
    if existing:
        print("Seed data already exists, skipping")
        return

    now = datetime.now(timezone.utc)
    gym_id = "gym_demo0001"
    owner_id = "user_owner00001"

    # Super Admin
    await db.users.insert_one({
        "user_id": "user_admin00001", "email": "admin@fitsync.com", "password_hash": hp("Admin@123"),
        "name": "Super Admin", "phone": "+1-555-0100", "role": "super_admin", "gym_id": None,
        "must_reset_password": False, "primary_auth_provider": "email", "linked_auth_providers": ["email"],
        "created_at": (now - timedelta(days=90)).isoformat(), "updated_at": now.isoformat(), "last_login_at": now.isoformat()
    })

    # Owner
    await db.users.insert_one({
        "user_id": owner_id, "email": "owner@fitsync.com", "password_hash": hp("Owner@123"),
        "name": "Alex Thompson", "phone": "+1-555-0101", "role": "owner", "gym_id": gym_id,
        "must_reset_password": False, "primary_auth_provider": "email", "linked_auth_providers": ["email"],
        "created_at": (now - timedelta(days=90)).isoformat(), "updated_at": now.isoformat(), "last_login_at": now.isoformat()
    })

    # Gym
    await db.gyms.insert_one({
        "gym_id": gym_id, "name": "FitSync Premium Gym", "code": "FITSYNC",
        "owner_id": owner_id, "address": "123 Fitness Boulevard, New York, NY 10001",
        "phone": "+1-555-0200", "active": True, "subscription_status": "active",
        "created_at": (now - timedelta(days=90)).isoformat()
    })

    # Staff
    staff_list = [
        {"id": "user_staff00001", "sid": "staff_00000001", "name": "Mike Johnson", "email": "staff1@fitsync.com"},
        {"id": "user_staff00002", "sid": "staff_00000002", "name": "Sarah Williams", "email": "staff2@fitsync.com"},
    ]
    for s in staff_list:
        await db.users.insert_one({
            "user_id": s["id"], "email": s["email"], "password_hash": hp("Staff@123"), "name": s["name"],
            "phone": "", "role": "staff", "gym_id": gym_id, "must_reset_password": False,
            "primary_auth_provider": "email", "linked_auth_providers": ["email"],
            "created_at": (now - timedelta(days=80)).isoformat(), "updated_at": now.isoformat(), "last_login_at": now.isoformat()
        })
        await db.staff.insert_one({
            "staff_id": s["sid"], "user_id": s["id"], "gym_id": gym_id, "name": s["name"],
            "email": s["email"], "phone": "", "active": True, "created_at": (now - timedelta(days=80)).isoformat()
        })

    # Plans
    plans = [
        {"plan_id": "plan_monthly01", "plan_name": "Monthly Basic", "duration_days": 30, "price": 29.99},
        {"plan_id": "plan_quarter01", "plan_name": "Quarterly Pro", "duration_days": 90, "price": 79.99},
        {"plan_id": "plan_annual001", "plan_name": "Annual Elite", "duration_days": 365, "price": 249.99},
    ]
    for p in plans:
        await db.membership_plans.insert_one({**p, "gym_id": gym_id, "active": True, "created_at": (now - timedelta(days=90)).isoformat()})

    # Members
    member_names = [
        "James Wilson", "Emily Davis", "Robert Chen", "Jessica Martinez", "David Kim",
        "Amanda Foster", "Michael Brown", "Olivia Taylor", "Daniel Garcia", "Sophia Lee",
        "Ryan Anderson", "Isabella Thomas", "Nathan White", "Emma Jackson", "Chris Moore",
        "Mia Robinson", "Brandon Clark", "Ava Lewis", "Kevin Hall", "Grace Young"
    ]
    members = []
    for i, name in enumerate(member_names):
        mid = f"mem_{str(i + 1).zfill(8)}"
        uid = f"user_mem{str(i + 1).zfill(5)}"
        email = name.lower().replace(" ", ".") + "@email.com"

        if i < 12:  # Active
            plan = random.choice(plans)
            if i < 3:
                end_date = (now + timedelta(days=random.randint(2, 6))).isoformat()
            elif i < 6:
                end_date = (now + timedelta(days=random.randint(8, 14))).isoformat()
            else:
                end_date = (now + timedelta(days=random.randint(20, 120))).isoformat()
            status = "active"
            pay_status = "paid"
            plan_name = plan["plan_name"]
        elif i < 17:  # Expired
            plan = random.choice(plans)
            end_date = (now - timedelta(days=random.randint(5, 30))).isoformat()
            status = "expired"
            pay_status = "overdue"
            plan_name = plan["plan_name"]
        else:  # New
            end_date = None
            status = "none"
            pay_status = "none"
            plan_name = None

        joined = (now - timedelta(days=random.randint(30, 85))).isoformat()
        await db.users.insert_one({
            "user_id": uid, "email": email, "password_hash": hp("Member@123"), "name": name,
            "phone": f"+1-555-{str(1000 + i)}", "role": "member", "gym_id": gym_id,
            "must_reset_password": False, "primary_auth_provider": "email", "linked_auth_providers": ["email"],
            "created_at": joined, "updated_at": now.isoformat(), "last_login_at": now.isoformat()
        })
        member = {
            "member_id": mid, "user_id": uid, "gym_id": gym_id, "name": name, "email": email,
            "phone": f"+1-555-{str(1000 + i)}", "membership_status": status, "membership_end_date": end_date,
            "plan_name": plan_name, "payment_status": pay_status, "joined_at": joined, "suspended": False
        }
        await db.members.insert_one(member)
        members.append(member)
        await db.attendance_status.insert_one({"gym_id": gym_id, "member_id": mid, "checked_in": False, "last_scan_at": None})

    # Attendance logs (60 days)
    for day_offset in range(60):
        day = now - timedelta(days=59 - day_offset)
        if day.weekday() >= 5 and random.random() < 0.3:
            continue
        for i, m in enumerate(members[:17]):
            if i < 5:
                attend = random.random() < 0.85
            elif i < 10:
                attend = random.random() < 0.55
            elif i < 14:
                attend = random.random() < 0.25
            else:
                attend = random.random() < 0.1
            if attend:
                ci_time = day.replace(hour=random.randint(6, 20), minute=random.randint(0, 59), second=random.randint(0, 59))
                co_time = ci_time + timedelta(hours=random.randint(1, 3), minutes=random.randint(0, 30))
                await db.attendance_logs.insert_one({
                    "log_id": f"log_{uuid.uuid4().hex[:8]}", "gym_id": gym_id, "member_id": m["member_id"],
                    "member_name": m["name"], "type": "check_in", "method": random.choice(["manual", "qr", "nfc"]),
                    "timestamp": ci_time.isoformat()
                })
                await db.attendance_logs.insert_one({
                    "log_id": f"log_{uuid.uuid4().hex[:8]}", "gym_id": gym_id, "member_id": m["member_id"],
                    "member_name": m["name"], "type": "check_out", "method": random.choice(["manual", "qr", "nfc"]),
                    "timestamp": co_time.isoformat()
                })

    # Payments (2 months)
    for i, m in enumerate(members[:17]):
        plan = random.choice(plans)
        pay_date = (now - timedelta(days=random.randint(30, 60))).isoformat()
        await db.payments.insert_one({
            "payment_id": f"pay_{uuid.uuid4().hex[:8]}", "gym_id": gym_id, "member_id": m["member_id"],
            "amount": plan["price"], "method": random.choice(["cash", "online", "card"]),
            "status": "completed", "plan_name": plan["plan_name"], "paid_at": pay_date, "note": ""
        })
        if i < 12:
            pay_date2 = (now - timedelta(days=random.randint(1, 25))).isoformat()
            await db.payments.insert_one({
                "payment_id": f"pay_{uuid.uuid4().hex[:8]}", "gym_id": gym_id, "member_id": m["member_id"],
                "amount": plan["price"], "method": random.choice(["cash", "online", "card"]),
                "status": "completed", "plan_name": plan["plan_name"], "paid_at": pay_date2, "note": ""
            })

    # Notifications
    for m in members[:5]:
        await db.notifications.insert_one({
            "notification_id": f"notif_{uuid.uuid4().hex[:8]}", "gym_id": gym_id, "user_id": m["user_id"] if isinstance(m, dict) else "",
            "title": "Welcome to FitSync!", "message": "Start your fitness journey today. Check out our plans!",
            "type": "welcome", "read": False, "created_at": (now - timedelta(days=random.randint(1, 30))).isoformat()
        })

    # Pending cash request
    await db.cash_payment_requests.insert_one({
        "request_id": "req_pending01", "gym_id": gym_id, "member_id": members[15]["member_id"],
        "member_name": members[15]["name"], "plan_id": "plan_monthly01", "plan_name": "Monthly Basic",
        "amount": 29.99, "status": "pending", "expires_at": (now + timedelta(hours=20)).isoformat(),
        "created_at": (now - timedelta(hours=4)).isoformat(), "resolved_at": None, "resolved_by": None
    })

    print("Seed data created: 1 admin, 1 owner, 2 staff, 20 members, 3 plans, 60 days history")
    print("Gym join code: FITSYNC")
