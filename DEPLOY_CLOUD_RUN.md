# Deploy FitSync Backend to Cloud Run

This repo already contains a production-ready FastAPI backend under `backend/`.

## 1. What you should own

- Your own Google Cloud project
- Your own Cloud Run service
- Your own Secret Manager secrets
- Your own MongoDB database
- Your own Google OAuth client IDs

Current project ID provided:

- `fitsync-a5a4c`
- Region: `asia-south1`
- Service name: `fitsync-api`

## 2. Create secrets in Secret Manager

Store these as secrets instead of hardcoding them:

- `fitsync-mongo-url`
- `fitsync-jwt-secret`
- `fitsync-gemini-api-key` (optional)

Do not put the Google web client secret in the Expo app or commit it to the repo. This implementation uses Google ID tokens and only needs the client IDs.

Example PowerShell commands:

```powershell
gcloud config set project fitsync-a5a4c
Set-Content -Path .\mongo_url.txt -NoNewline -Value 'YOUR_MONGO_URL'
Set-Content -Path .\jwt_secret.txt -NoNewline -Value 'YOUR_LONG_RANDOM_JWT_SECRET'
Set-Content -Path .\gemini_api_key.txt -NoNewline -Value 'YOUR_GEMINI_API_KEY'
gcloud secrets create fitsync-mongo-url --data-file=.\mongo_url.txt
gcloud secrets create fitsync-jwt-secret --data-file=.\jwt_secret.txt
gcloud secrets create fitsync-gemini-api-key --data-file=.\gemini_api_key.txt
```

If the secrets already exist, add a new version instead:

```powershell
gcloud secrets versions add fitsync-mongo-url --data-file=.\mongo_url.txt
gcloud secrets versions add fitsync-jwt-secret --data-file=.\jwt_secret.txt
gcloud secrets versions add fitsync-gemini-api-key --data-file=.\gemini_api_key.txt
```

## 3. Deploy from source

Example command:

```bash
gcloud run deploy fitsync-api \
  --project fitsync-a5a4c \
  --source ./backend \
  --region asia-south1 \
  --allow-unauthenticated \
  --env-vars-file ./backend/cloudrun.env.example \
  --update-secrets MONGO_URL=fitsync-mongo-url:latest,JWT_SECRET=fitsync-jwt-secret:latest,GEMINI_API_KEY=fitsync-gemini-api-key:latest
```

## 4. Required runtime env

Non-secret env:

- `DB_NAME`
- `SEED_DATABASE=false`
- `CORS_ORIGINS`
- `GOOGLE_CLIENT_IDS`
- `GEMINI_MODEL` (optional)

Secret env:

- `MONGO_URL`
- `JWT_SECRET`
- `GEMINI_API_KEY` (optional)

## 5. Frontend app config you still need

The Expo app also needs your own values for:

- backend URL
- Android package name
- iOS bundle identifier
- app scheme
- Google web / Android / iOS client IDs

Current app values provided:

- Android package: `com.fitsync.gym`
- iOS bundle identifier: `com.fitsync.gym`
- App scheme: `fitsync`
- Current frontend origin for CORS: `https://fitsync.vercel.app`

## 6. Production notes

- Keep `SEED_DATABASE=false` in production so demo users are not created.
- Set `CORS_ORIGINS` to your real frontend origin, not `*`.
- Google sign-in will work only when the client IDs in the frontend and backend match your Google Cloud project.
- If AI is enabled, keep `GEMINI_API_KEY` only in Secret Manager, not in tracked files.
