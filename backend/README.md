# AI Money Mentor Backend (FastAPI)

## Setup

```bash
cd backend
# Recommended: use Python 3.12 or 3.13 (prebuilt wheels for FastAPI/Pydantic)
py -3.12 -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create a `.env` file:

```bash
copy .env.example .env
```

## Supabase PostgreSQL (Persistence)

This backend supports **real persistence** (Supabase Postgres) via SQLAlchemy.

- Set `DATABASE_URL` in `.env`.
- On startup, the backend will attempt to connect and create tables.
- If `DATABASE_URL` is missing or the DB is unreachable, the API continues in **demo fallback mode**.

Example:

```bash
DATABASE_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
# If needed
# DATABASE_URL=postgresql://.../postgres?sslmode=require
```

Notes:
- The app identifies users via the `X-User-Id` header (the frontend sends the logged-in email).
- Pool tuning is optional: `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`.

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open API docs:

- Swagger UI: http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json

## Endpoints

- `GET /health`
- `POST /analyze-finance`
- `POST /ai-advice`
- `POST /ai-sip-plan`
- `GET /balance`
- `GET /portfolio`
- `GET /transactions`
- `POST /add-funds`
- `POST /sip/create`
- `GET /sip/status`
- `POST /sip/run`

- `GET /broker/portfolio`
- `GET /broker/balance`
- `POST /send-otp` (Demo Payment Gateway)
- `POST /verify-otp` (Demo Payment Gateway)
- `POST /reset-demo`

## Demo Payment Gateway (OTP Email)

This project includes a **demo-only** payment flow for adding funds to the in-memory `broker_balance`.

### SMTP configuration (optional)

If SMTP env vars are not set, the backend will **simulate** sending (and log the OTP server-side).

If you want OTPs to be delivered to Gmail/Outlook **for real** (no simulated delivery and no OTP echoed back to the UI), set:

```bash
OTP_REQUIRE_SMTP=true
```

Set these in `.env`:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@example.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@example.com
SMTP_TLS=true
```

Outlook / Microsoft 365 example:

```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USERNAME=your-email@outlook.com
SMTP_PASSWORD=your-password-or-app-password
SMTP_FROM=your-email@outlook.com
SMTP_TLS=true
```

Notes:
- Gmail typically requires an **App Password** (2-step verification enabled).
- Outlook/Microsoft 365 may require **SMTP AUTH** to be enabled for the account/tenant.
- If SMTP fails/not configured, the backend uses **simulated delivery** (and the UI will show the OTP).

Demo-only helpers:

```bash
# clamp between 120 and 300 seconds
DEMO_OTP_TTL_SECONDS=180

# if true, API responses include `demo_otp` for local testing
DEMO_RETURN_OTP=true
```

### Example: /analyze-finance

```bash
curl -X POST http://localhost:8000/analyze-finance \
  -H "Content-Type: application/json" \
  -d '{"income":80000,"expenses":45000,"savings":200000,"goal":"Buy a home down payment","years":5}'
```

### Example: /ai-advice

```bash
curl -X POST http://localhost:8000/ai-advice \
  -H "Content-Type: application/json" \
  -d '{"question":"How can I save more every month?","income":80000,"expenses":45000}'
```
