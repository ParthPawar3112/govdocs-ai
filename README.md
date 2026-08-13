# GovDocs AI

**Smart Digital Documentation System for Government Offices**

GovDocs AI is a smart document management system designed to help government offices move from paper-based records to a searchable and organized digital system.

It takes scanned documents, extracts their text using OCR, uses Gemini AI to generate useful metadata, and then sends the document through a review and approval workflow. The goal is simple: **make government documents easier to find, manage, review, and track.**

---

## Problem Statement

Government offices deal with a huge number of paper documents such as land records, certificates, applications, and official correspondence. Managing these records manually can make even simple tasks time-consuming.

Some of the main problems are:

* **Slow retrieval** — finding an old document can take a lot of time.
* **No proper search** — paper documents cannot be searched by their actual content.
* **Limited tracking** — it can be difficult to know who accessed or modified a document.
* **Manual approvals** — document review and approval often happen without a proper digital workflow.
* **Risk of damage or loss** — physical records can be affected by water, fire, misfiling, or general wear.

---

## Our Solution

GovDocs AI brings the complete document process into one system.

An officer can upload a scanned image or PDF. The system first extracts the text using OCR. Gemini AI then analyzes the extracted content and creates useful information such as the document title, department, category, keywords, summary, and confidence score.

The document can then be reviewed by an admin, who can approve it, reject it, or send it back for correction. Important actions are also recorded in an audit log.

In short, the system turns:

**Paper Document → Digital Text → AI Metadata → Review → Approval → Searchable Record**

---

## Key Features

* **OCR-based digitization** — extracts text from scanned JPG, PNG, and multi-page PDF documents using Tesseract OCR.
* **AI metadata extraction** — Gemini AI generates the title, summary, department, category, keywords, and confidence score.
* **Smart Search** — search through filenames, titles, OCR text, summaries, and keywords, with fuzzy matching for small spelling mistakes.
* **Document workflow** — documents move through stages such as Uploaded → OCR Processing → AI Processing → Pending Review → Approved/Rejected/Archived.
* **Review and approval** — admins can edit AI-generated information, add remarks, and approve, reject, or send documents back.
* **Analytics dashboard** — shows useful information such as upload trends, approval ratios, processing success rates, and department/category statistics.
* **Audit logging** — important actions such as login, upload, processing, review, downloads, and password changes are recorded.
* **Secure document management** — JWT authentication, role-based access, password hashing, and server-side file validation are implemented.

### Some additional features

The system also includes live processing status updates, document preview with zoom controls, AI metadata JSON export, one-page PDF summary export, password change functionality, and light/dark mode.

---

## Technology Stack

### Frontend

* React 18
* Vite
* Tailwind CSS

### Backend

* FastAPI
* Python
* SQLite
* SQLAlchemy

### AI & OCR

* Google Gemini API
* Tesseract OCR
* PyMuPDF
* pytesseract

---

## System Architecture

```text
┌───────────────────────────────────────────────┐
│             React + Vite Frontend             │
│       Tailwind CSS · Axios · JWT State        │
└──────────────────────┬────────────────────────┘
                       │ REST API
                       │ Bearer JWT
┌──────────────────────▼────────────────────────┐
│                FastAPI Backend                 │
│   Routers → Services → SQLAlchemy Models      │
│                                               │
│  Auth · Documents · Analytics · Audit         │
│  Settings · OCR · AI · Search · File Storage │
└──────┬───────────────┬───────────────┬─────────┘
       │               │               │
┌──────▼─────┐   ┌─────▼──────┐  ┌────▼─────────┐
│   SQLite   │   │  Tesseract │  │  Gemini API  │
│  Database  │   │     OCR    │  │ AI Metadata  │
└────────────┘   └────────────┘  └──────────────┘
```

The backend is structured so that the routers mainly handle API requests, while the actual processing logic is kept inside separate service modules. This makes the system easier to maintain and extend.

---

## AI Processing Workflow

```text
Upload Document
      ↓
OCR Extraction
      ↓
Gemini AI Metadata Generation
      ↓
Validation
      ↓
Database & File Storage
      ↓
Search + Review Workflow
      ↓
Approval / Rejection / Archive
```

The frontend also shows the current processing stage automatically, so the user can see when OCR is running, when AI processing starts, and when the document is ready for review.

If OCR or AI processing fails, the error is shown and the process can be retried.

---

## Security

Security was also considered while building the system.

* JWT-based authentication
* Admin and Officer role-based access
* Password hashing using bcrypt
* File extension, size, and content-signature validation
* Login rate limiting
* Audit logs for important actions
* Secrets stored in `.env`
* No direct filesystem access exposed to the frontend
* API responses do not expose passwords, API keys, or raw server paths

---

## Installation

### Prerequisites

* Python 3.11+
* Node.js 18+
* Tesseract OCR
* Gemini API key

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate

pip install -r requirements.txt

copy .env.example .env
```

Add your Gemini API key to `.env`, then start the backend:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Access the application

| Service      | URL                              |
| ------------ | -------------------------------- |
| Frontend     | http://localhost:5173            |
| Backend API  | http://127.0.0.1:8000            |
| Swagger Docs | http://127.0.0.1:8000/docs       |
| Health Check | http://127.0.0.1:8000/api/health |

The database and default accounts are created automatically when the backend starts for the first time.

---

## Default Login

| Role    | Username  | Password     |
| ------- | --------- | ------------ |
| Admin   | `admin`   | `admin123`   |
| Officer | `officer` | `officer123` |

**For any real deployment, these credentials should be changed immediately.**

---

## Future Improvements

Some features we would like to add in the future:

* PostgreSQL for larger multi-user deployments
* Alembic database migrations
* WebSocket/SSE-based live updates
* Redis-based distributed rate limiting
* Custom department and category management
* Bulk document upload and review
* Email/SMS notifications
* More regional-language OCR support
* Automated CI/CD and test coverage

---

## Team

| Name              | Role                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Parth Pawar**   | Full Backend + Frontend Development, system architecture, AI/OCR integration, and overall technical implementation |
| **Tanmay Shinde** | PPT Design and UI/UX Inputs                                                                                        |
| **Sukhada Ugale** | Speaker / Project Presenter                                                                                        |
| **Ishwari More**  | Speaker / Project Presenter                                                                                        |

---

**Built for the Smart Kopargaon Hackathon.**
