# CivicPulse

AI-powered hyperlocal infrastructure reporting platform for smarter cities.

CivicPulse enables citizens to report civic infrastructure issues using AI-powered image analysis while helping local governments prioritize repairs through community verification and predictive infrastructure insights.

---

## Features

### Citizen Portal

- AI-powered issue detection from uploaded photos
- Automatic issue classification and department routing
- Dynamic GPS location detection
- Duplicate report detection
- Community verification (support existing reports instead of creating duplicates)
- Evidence gallery for supported reports
- Complaint history
- XP, badges and leaderboard
- Pulse mascot-guided user experience

---

### Government Dashboard

- Live issue management
- Status updates
- SLA tracking
- Department filtering
- Community Verified reports
- Predictive Infrastructure Risk (Beta)
- Analytics dashboard

---

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- React Leaflet

### Backend

- FastAPI
- SQLAlchemy
- SQLite
- JWT Authentication

### AI

- Google Gemini Vision API

### Cloud

- Google Cloud Run
- Google Cloud Storage

---

## AI Features

- Vision AI issue identification
- Severity estimation
- Automatic department assignment
- Invalid image detection ("No issue found")
- Duplicate issue detection using:
  - AI category matching
  - GPS proximity
- Community-supported evidence aggregation

---

## Project Structure

```
CivicPulse/
│
├── frontend/
├── backend/
├── assets/
└── README.md
```

---

## Local Setup

### Clone

```bash
git clone https://github.com/YOUR_USERNAME/CivicPulse.git
cd CivicPulse
```

---

### Backend

```bash
cd backend

python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt

copy .env.example .env

# Add your environment variables

uvicorn app.main:app --reload
```

---

### Frontend

```bash
cd frontend

npm install

npm run dev
```

Frontend:

```
http://localhost:5173
```

Backend:

```
http://localhost:8000
```

---

## Environment Variables

Create a `.env` file inside the backend folder.

Required:

```
GEMINI_API_KEY=
SECRET_KEY=
DATABASE_URL=
```

Optional:

```
RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=
```

---

## Departments

- PWD
- Nagar Nigam
- Jal Sansthan
- UPCL
- Traffic Police

---

## Demo Highlights

- AI-powered infrastructure issue reporting
- Community verification to reduce duplicate complaints
- Government analytics dashboard
- Predictive Infrastructure Risk (Beta)
- Gamified citizen participation with Pulse mascot

---

## Built With

- Google Gemini API
- Google Cloud
- FastAPI
- React
- Tailwind CSS
- SQLAlchemy
- SQLite