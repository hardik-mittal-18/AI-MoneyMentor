# AI Money Mentor

AI-powered financial advisor with SIP planning, broker simulation, and portfolio analysis.

## Features

- **AI Advisor**: Ask finance questions and get AI-assisted guidance.
- **SIP Automation**: Create and simulate SIP plans and execution.
- **Broker Dashboard**: Track balances, transactions, and portfolio views.
- **Membership System**: Free/Normal/Silver/Gold plans with gated features.
- **Payment Simulation**: Demo OTP-based flow to add funds.
- **PostgreSQL Integration**: Optional persistence via Supabase PostgreSQL.

## Tech Stack

### Frontend

- React + Vite
- Tailwind CSS + UI components

### Backend

- FastAPI (Python)
- Pydantic validation
- SQLAlchemy (optional DB mode)

### Database

- Supabase PostgreSQL (optional, via `DATABASE_URL`)

## How to Run

### 1) Install dependencies

Frontend:

```bash
npm install
```

Backend:

```bash
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2) Add `.env`

Create `backend/.env` (or copy from `backend/.env.example` if present) and set at minimum:

- `DATABASE_URL` (optional) — Supabase Postgres connection string

If `DATABASE_URL` is not set or the DB is unreachable, the backend runs in demo fallback mode.

### 3) Run the backend

```bash
cd backend
\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend docs:

- http://127.0.0.1:8000/docs

### 4) Run the frontend

```bash
npm run dev
```

Frontend:

- http://127.0.0.1:5173

## Author

- Hardik Mittal (hardikmittal2908@gmail.com)

## Git Setup (GitHub)

You can either run the helper script:

```powershell
./scripts/git-setup.ps1
```

Or run the commands manually:

```bash
git init
git config user.name "hardik-mittal-18"
git config user.email "hardikmittal2908@gmail.com"
git add .
git commit -m "Initial commit - AI Money Mentor"
git branch -M main

# If remote exists, remove and re-add
git remote remove origin
git remote add origin https://github.com/hardik-mittal-18/AI-MoneyMentor.git

git push -u origin main
```
