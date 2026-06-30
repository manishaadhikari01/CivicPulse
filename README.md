# CivicPulse

AI-powered hyperlocal infrastructure reporter for Dehradun, India.

## Stack

- **Frontend:** React + Vite + Tailwind CSS + React-Leaflet
- **Backend:** FastAPI + SQLAlchemy + SQLite
- **AI:** Claude Sonnet Vision API

## Features

- AI issue photo analysis with auto-filled report forms
- Live community map with color-coded pins
- Government dashboard with SLA timers (Critical 4h, High 24h, Medium 72h, Low 7d)
- Gamification: +10 XP per report, +5 XP on resolve, badges, weekly leaderboard
- Rate limiting on all API endpoints (60/min default, 10/min on auth)
- reCAPTCHA on login & signup pages

## Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env     # Add ANTHROPIC_API_KEY and optional RECAPTCHA keys
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Dehradun Departments

- PWD (Public Works)
- Jal Sansthan (Water)
- UPCL (Power)
- Nagar Nigam (Municipal)

## Demo Government Login

Use **Demo Official Login** on the Gov tab, or `POST /api/auth/demo-official`.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude Vision API key |
| `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA secret |
| `RECAPTCHA_SITE_KEY` | Google reCAPTCHA site key |
| `SECRET_KEY` | JWT signing key |

Without reCAPTCHA keys, captcha is bypassed in development mode.
