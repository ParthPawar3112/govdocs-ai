# GovDocs AI

**Smart Digital Documentation System for Government Offices**

GovDocs AI turns scanned paper records into searchable, structured, auditable digital documents — combining OCR text extraction, Gemini-powered AI metadata generation, and a full review/approval workflow in one government-office-ready system.

---

## Problem Statement

Government offices handle enormous volumes of paper-based records — land records, certificates, correspondence, applications — that are filed manually, stored physically, and located only by manual search. This creates real, recurring costs:

- **Slow retrieval** — finding a single record among thousands of physical files can take hours.
- **No searchability** — paper archives can't be searched by content, only browsed by folder/date.
- **No audit trail** — there's no reliable record of who accessed, modified, or approved a document.
- **Inconsistent review** — approvals happen informally, with no enforced workflow or accountability.
- **Risk of loss/damage** — physical-only records are vulnerable to fire, water damage, and misfiling.

## Solution Overview

GovDocs AI digitizes the entire document lifecycle. An officer uploads a scanned document (image or PDF); the system automatically extracts its text via OCR, generates structured metadata (title, department, category, keywords, summary, confidence score) via Google's Gemini AI, and makes it instantly searchable. An admin then reviews the AI-assisted output and approves, rejects, or sends it back for correction — with every action logged to an audit trail. The result is a searchable, accountable, digital-first records system that fits directly into an existing government office workflow, requiring no change to how staff already think about document review.

---

## Key Features

- **OCR-based digitization** — Tesseract-powered text extraction from scanned JPG/PNG images and multi-page PDFs
- **AI metadata extraction** — Gemini AI generates title, summary, department, category, keywords, and a confidence score for every document
- **Smart Search** — full-text search across titles, filenames, OCR text, AI summaries, and keywords, with a typo-tolerant fuzzy-match fallback
- **Document lifecycle workflow** — every document moves through a clear, visible pipeline: Uploaded → OCR Processing → AI Processing → Pending Review → Approved/Rejected/Archived
- **Review and approval system** — admins approve, reject, or send documents back for correction, with editable AI metadata and reviewer remarks
- **Analytics dashboard** — upload trends, approval ratios, OCR/AI success rates, and department/category breakdowns
- **Audit logging** — every significant action (login, upload, OCR, AI processing, review decisions, downloads, password changes) is recorded with user, timestamp, and detail
- **Secure document management** — JWT-authenticated, role-scoped access with server-validated file uploads and no direct filesystem exposure

**Also included:** live processing status with automatic UI updates (no manual refresh), an in-viewer original document preview with zoom controls, AI-metadata (JSON) and one-page PDF summary exports, self-service password change, and full light/dark mode support.

---

## Technology Stack

**Frontend**
- React 18
- Vite
- Tailwind CSS

**Backend**
- FastAPI (Python)
- SQLite
- SQLAlchemy (ORM)

**AI**
- Google Gemini API (metadata extraction)
- Tesseract OCR (text extraction, via `pytesseract` + PyMuPDF for PDF rendering)

---

## System Architecture

```
┌───────────────────────────────────────────────┐
│            React + Vite Frontend               │
│   (Tailwind CSS · Axios · JWT session state)    │
└──────────────────────┬──────────────────────────┘
                        │  REST API (JSON, Bearer JWT)
┌──────────────────────▼──────────────────────────┐
│                 FastAPI Backend                 │
│   Routers  →  Services  →  SQLAlchemy Models    │
│   (auth · documents · analytics · audit ·       │
│    settings)                                    │
└───┬──────────────┬──────────────┬────────────────┘
    │              │              │
┌───▼────┐   ┌─────▼──────┐  ┌────▼─────────┐
│ SQLite │   │ Tesseract  │  │  Gemini API   │
│   DB   │   │ OCR Engine │  │ (AI metadata) │
└────────┘   └────────────┘  └───────────────┘
```

The backend follows a thin-router / fat-service pattern: routers handle HTTP concerns only, business logic lives in dedicated service modules (OCR, AI, search, audit, file storage), and every document processing stage exposes its live status through a single, polled `GET /documents/{id}` endpoint the frontend already reuses everywhere a document is shown.

---

## AI Processing Workflow

```
Upload Document
      ↓
OCR Extraction        (Tesseract — text pulled from the scanned image/PDF)
      ↓
AI Metadata Generation (Gemini — title, summary, department, category, keywords, confidence)
      ↓
Validation             (structured JSON response validated and clamped before saving)
      ↓
Storage                (extracted text + AI metadata persisted alongside the original file)
      ↓
Search & Workflow      (instantly searchable; enters the review queue for approval)
```

Every stage updates the document's status in real time — the frontend polls a single status endpoint and the UI transitions automatically from *OCR Processing* → *OCR Complete* → *AI Processing* → *AI Complete* → *Pending Review*, with no manual refresh. If OCR or AI extraction fails, the specific error is shown with a one-click retry.

---

## Security Implementation

- **JWT authentication** — short-lived bearer tokens signed with a configurable secret; expired/invalid/tampered tokens are rejected
- **Role-based access control** — Admin vs. Officer roles enforced consistently on every admin-only endpoint (review, audit logs, analytics, settings)
- **Password hashing** — bcrypt via Passlib; passwords are never logged or returned in any API response
- **File validation** — uploads are checked against an extension allow-list, a maximum size limit, and a magic-byte content signature check (so a mislabeled/renamed file is rejected, not just trusted by its extension)
- **Login rate limiting** — repeated failed login attempts on an account trigger a temporary lockout
- **Audit logs** — login, upload, OCR/AI processing, review decisions, downloads, and password changes are all recorded with user, timestamp, and action detail
- **Secure environment variables** — secrets (JWT key, Gemini API key) live only in a git-ignored `.env` file; `.env.example` ships placeholders only, and no API response ever returns a secret or raw filesystem path

---

## Installation Guide

### Prerequisites
- Python 3.11+
- Node.js 18+
- [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) installed and on your PATH (Windows installer link above)
- A free [Gemini API key](https://aistudio.google.com/apikey)

### Backend setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

pip install -r requirements.txt

copy .env.example .env          # Windows
# cp .env.example .env          # macOS/Linux
# then edit .env and set GEMINI_API_KEY

python -m uvicorn app.main:app --reload --port 8000
```

The SQLite database and default accounts are created automatically on first run.

### Frontend setup

```bash
cd frontend
npm install
npm run dev
```

### Access the app

| | |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://127.0.0.1:8000 |
| API docs (Swagger) | http://127.0.0.1:8000/docs |
| Health check | http://127.0.0.1:8000/api/health |

### Default login credentials

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Officer | `officer` | `officer123` |

*(Change these in production — the app's own Change Password feature works from first login.)*

---

## Future Improvements

- PostgreSQL support for multi-user production deployment (currently SQLite by design, for zero-setup local/demo use)
- Alembic-based schema migrations in place of the current lightweight startup migration
- WebSocket/SSE push updates in place of polling for live processing status
- Distributed (Redis-backed) rate limiting for multi-instance deployments
- Configurable department/category taxonomy via an admin UI, instead of a fixed list
- Bulk upload and bulk review actions
- Email/SMS notifications on approval, rejection, or send-back
- Multi-language OCR support
- CI/CD pipeline with automated test coverage on every commit

---

## Team Information

*Add your team name and members here before submission:*

| Name | Role |
|---|---|
| Parth Pawar | Full Backend + Frontend Development, system architecture, AI/OCR integration, and overall technical implementation |
| Tanmay Shinde | Design in ppt & UI/UX inputs |
| Sukhada Ugale | Speaker / Project Presenter |
| Ishwari More | Speaker / Project Presenter. |

---

*Built for the Smart Kopargaon Hackathon.*
