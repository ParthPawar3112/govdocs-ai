# GovDocs AI — Demo Checklist

A quick-reference checklist for presenting GovDocs AI to judges. Work through **Before Demo** the night before or morning of; **During Demo** is the suggested walkthrough order; **After Demo** wraps up cleanly.

---

## Before Demo

- [ ] **Gemini API key replaced with a real, working key.** `backend/.env` currently still has the placeholder `GEMINI_API_KEY=your_api_key` from `.env.example` — AI metadata extraction **will fail** until this is replaced with a real key from https://aistudio.google.com/apikey. Test it: upload one document and confirm the AI Analysis panel completes (not "AI Failed") before you're on stage.
- [ ] **Backend running** — `cd backend`, activate the virtualenv, `python -m uvicorn app.main:app --reload --port 8000`. Confirm `http://127.0.0.1:8000/api/health` returns `{"status":"ok","database":"connected"}`.
- [ ] **Frontend running** — `cd frontend`, `npm run dev`. Confirm `http://localhost:5173` loads the login page.
- [ ] **Demo accounts verified** — log in as both:
  - Officer: `officer` / `officer123`
  - Admin: confirm your current Admin password works (the seeded `admin`/`admin123` default has been changed during development testing — if you don't remember the current password, log in as `officer`, or use another Admin account, or set a fresh one via the database before the demo).
- [ ] **Database backup created** — copy `backend/govdocs.db` and `backend/uploads/` somewhere safe before the demo, so a mistake on stage (e.g. an accidental delete) doesn't cost you your prepared data.
- [ ] Have 1–2 real-looking sample documents (a PDF and an image) ready on your desktop to upload live.
- [ ] Pick one already-processed, AI-completed document ahead of time as a fallback in case a live Gemini call is slow or rate-limited during the demo.

## During Demo

1. **Login** — show both roles if time allows: Officer (upload access, no admin tools) and Admin (full access, including Review Queue/Analytics/Audit Logs/Settings in the sidebar).
2. **Upload a document** — drag & drop a PDF or image. Point out the "Document uploaded successfully" confirmation and the automatic hand-off into the Document Viewer.
3. **Show OCR processing** — the viewer opens automatically and live-updates from "Extracting text..." to "Text extraction complete," with the extracted text visible immediately, no manual refresh.
4. **Show AI metadata extraction** — the AI Analysis panel picks up right after OCR, showing title, department, category, summary, keywords, and a confidence score once Gemini responds.
5. **Show Smart Search** — search by a word from the OCR text, then by something only present in the AI-generated summary/keywords, to show it searches both the raw text and the AI understanding of the document.
6. **Show the Review Workflow** — switch to Admin, open Review Queue, open a pending document, edit an AI field if you want to show that's possible, then Approve (or Send Back with a remark, to show that path too).
7. **Show Analytics** — upload trends, approval ratio, OCR/AI success rates, department/category breakdowns.
8. **Show Audit Logs** — filter by action or user to show every step (login, upload, OCR, AI, review decision) is traceable.
9. **Show Security Features** — mention JWT auth + role-based access (Officers can't see Review Queue/Analytics/Audit/Settings — show the sidebar difference), and that repeated failed logins get rate-limited if asked.

## After Demo

- [ ] Stop both servers (close the terminals or Ctrl+C).
- [ ] Preserve the frozen version — avoid further edits to the working tree until judging/evaluation is complete, so the demoed state stays reproducible.
- [ ] If you made any changes during the demo (test uploads, review actions), consider whether to leave them as evidence of real usage or restore your pre-demo backup.

---

*Companion to `README.md`. See that file for full installation instructions and architecture details.*
