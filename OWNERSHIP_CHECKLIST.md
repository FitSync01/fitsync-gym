# FitSync Ownership Checklist

This repo is now decoupled from Emergent-specific auth and AI services.

What you need to own to fully control the app:

- Source code repository and branch protection in your own GitHub account.
- MongoDB database and credentials used by `MONGO_URL`.
- Backend hosting for the FastAPI app.
- Google Cloud project / Cloud Run service if you deploy there.
- Frontend build and release accounts.
- Android signing key / Play Console access.
- Apple Developer account / iOS signing assets if you ship on iPhone.
- Domain, SSL, and DNS for your backend if you use a custom URL.
- All environment variables and API keys.

What this codebase uses now:

- Email/password auth is handled by your own backend and JWT secret.
- AI assistant uses your own `GEMINI_API_KEY` if you choose to enable it.
- Google sign-in can run from your own Google OAuth setup using your client IDs and backend `GOOGLE_CLIENT_IDS`.
- Payments are internal bookkeeping only. There is no live Stripe, Razorpay, PayPal, or other payment gateway wired in this repo.
- Notifications are stored in MongoDB. There is no push notification provider wired in this repo.

What I could not verify from code alone:

- Who owns the live deployment currently serving your app.
- Who owns the real MongoDB cluster used in production.
- Who owns your app store accounts, build service account, or domain.

Quick manual checks to finish ownership transfer:

- Confirm your backend URL points to infrastructure you control.
- Confirm your production MongoDB credentials belong to your own account.
- Rotate JWT, database, and AI keys into accounts you control.
- Create your own Google OAuth credentials and add the client IDs to backend and frontend env files.
- Decide and register your final Android package name and iOS bundle identifier before production builds.
- If you use Cloud Run, keep secrets in Secret Manager and disable demo seeding in production.
