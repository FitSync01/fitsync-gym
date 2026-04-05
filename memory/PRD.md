# FitSync Gym - Product Requirements Document

## Overview
FitSync Gym is a SaaS gym operations platform built with Expo (React Native) + FastAPI + MongoDB. It supports 4 user roles: Gym Owner, Staff, Member, and Super Admin.

## Tech Stack
- **Frontend**: Expo SDK 54, React Native, Expo Router (file-based routing)
- **Backend**: FastAPI (Python), MongoDB (Motor async driver)
- **Auth**: JWT (Email/Password) + optional self-owned Google OAuth
- **AI**: Optional Gemini integration using your own API key

## User Roles & Access
| Role | Access |
|------|--------|
| Owner | Full gym management, member/staff CRUD, payments, analytics, AI assistant |
| Staff | Attendance operations, member search, manual check-in |
| Member | View dashboard, purchase plans, attendance history, notifications |
| Super Admin | Global gym management, enable/disable gyms, platform stats |

## Core Features
### Authentication
- Email/password registration and login
- Google sign-in can be enabled with your own Google OAuth credentials
- JWT Bearer token authentication
- Role-based post-login routing
- Forced password reset for owner-created accounts

### Owner Dashboard
- KPIs: total/active/expired members, monthly revenue, live crowd, expiring soon
- Recent activity timeline
- Gym code display for member onboarding
- Pending cash payment alerts

### Member Management
- List, search, add, edit, suspend members
- Automatic user account creation with temporary password

### Staff Management
- List and add staff with temporary credentials

### Attendance
- Manual check-in by member ID
- QR code scanning (expo-camera integration)
- NFC support (device-dependent)
- 30-second duplicate scan prevention
- Check-in/check-out toggle

### Membership Plans
- 3 default plans: Monthly ($29.99), Quarterly ($79.99), Annual ($249.99)
- Online plan activation
- Cash payment request workflow (pending → approved/rejected)

### Analytics
- Weekly attendance chart
- Monthly revenue chart
- At-risk member identification (high/medium risk based on attendance patterns and expiry)
- AI Gym Assistant for natural language gym queries using your own Gemini key

### Super Admin Panel
- Total gyms, active gyms, total members, total revenue KPIs
- Gym enable/disable toggle
- Gym overview with member counts

## Database Collections
users, gyms, members, staff, membership_plans, attendance_status, attendance_logs, payments, cash_payment_requests, notifications, staff_issues, ai_chat_history

## Seed Data
- 1 super admin, 1 owner, 2 staff, 20 members
- 3 membership plans
- 60 days of attendance and payment history
- Gym join code: FITSYNC

## API Endpoints
### Auth: /api/auth/*
POST /register, /login, /logout, /reset-password, /set-role
GET /me

### Gyms: /api/gyms/*
POST /gyms, /gyms/join
GET /gyms/{id}, /gyms/code/{code}

### Members: /api/gyms/{id}/members/*
GET /members, /members/search
POST /members
PUT /members/{id}

### Attendance: /api/gyms/{id}/attendance/*
POST /attendance/scan
GET /attendance/today, /attendance/logs, /attendance/status/{mid}

### Plans: /api/gyms/{id}/plans
GET, POST

### Payments: /api/gyms/{id}/payments
GET, POST

### Cash Requests: /api/gyms/{id}/cash-requests/*
GET, POST, PUT /approve, PUT /reject

### Analytics: /api/gyms/{id}/analytics/*
GET /kpis, /attendance-chart, /revenue-chart, /risk-members

### AI: POST /api/gyms/{id}/assistant/chat
### Admin: GET /api/admin/gyms, /api/admin/stats, PUT /api/admin/gyms/{id}/toggle
### Notifications: GET /api/notifications, PUT /api/notifications/{id}/read
### Member Self-Service: GET /api/member/me, /api/member/gym, POST /api/member/purchase-plan
