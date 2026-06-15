# Resume Parser AI

Resume Parser AI is a full-stack hackathon-ready web app for parsing resumes, extracting candidate details, scoring resumes for ATS completeness, and matching candidates against a job description.

## Features

- Upload PDF and DOCX resumes
- Extract raw text using PyMuPDF and python-docx
- Parse candidate name, email, phone, skills, education, experience, projects, and certifications
- Calculate ATS score out of 100
- Paste a job description and calculate job match score
- Show matched skills and missing skills
- Save candidates in SQLite
- Update duplicate candidates by email instead of creating duplicates
- Browse candidates in a responsive HR dashboard
- View full candidate profile
- Download parsed candidate data as JSON
- Serve uploaded resumes from the backend

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router v6
- Backend: FastAPI, Python
- Database: SQLite
- Parsing: PyMuPDF, python-docx
- Matching: Regex and section-based parsing

## Folder Structure

```text
resume-parser-ai/
├── backend/
│   ├── main.py
│   ├── parser.py
│   ├── database.py
│   ├── models.py
│   ├── requirements.txt
│   └── uploads/
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── tailwind.config.js
│   └── .env
└── README.md
```

## Backend Setup

```bash
cd resume-parser-ai/backend
python -m venv .venv
```

Activate the virtual environment.

Windows PowerShell:

```bash
.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the backend:

```bash
uvicorn main:app --reload
```

Backend URL:

```text
http://localhost:8000
```

FastAPI docs:

```text
http://localhost:8000/docs
```

## Frontend Setup

Open a second terminal:

```bash
cd resume-parser-ai/frontend
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

The frontend uses this environment variable in `frontend/.env`:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

## API Endpoints

### `POST /upload-resume`

Uploads a PDF or DOCX resume, parses it, saves it, and returns the candidate profile.

Form fields:

- `file`: resume file
- `job_description`: optional job description text

### `POST /match-score`

Matches a saved candidate against a job description.

```json
{
  "candidate_id": 1,
  "job_description": "Looking for React, Python, FastAPI, SQL, Docker, and AWS."
}
```

### `GET /candidates`

Returns all saved candidates for the dashboard.

### `GET /candidate/{id}`

Returns the full parsed candidate profile.

### `GET /candidate/{id}/download`

Downloads the parsed candidate profile as JSON.

## Deployment Plan

- Frontend: deploy the `frontend` folder to Vercel
- Backend: deploy the `backend` folder to Render as a Python web service
- Database: use SQLite for hackathon/demo mode, then migrate to PostgreSQL for production

## Notes

- Uploaded files must be PDF or DOCX.
- Maximum upload size is 5 MB.
- SQLite database is created automatically at `backend/resume_parser.db`.
- Uploaded resumes are stored in `backend/uploads/`.
- Duplicate candidates are checked by email and updated in place.
