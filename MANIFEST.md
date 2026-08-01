# Phase 3 File Package - Manifest (fully wired & verified)

Everything in this zip mirrors your real `frontend/` folder structure.
Copy each file to the SAME relative path in your project, overwriting
where a file already exists there.

Wiring is done. I've run `npm install`, `npm run build` (0 errors, 1663
modules transformed), and booted both servers together to confirm login
and the dashboard shell work end-to-end.

## 🆕 Brand-new files (28) - just copy these in, nothing to overwrite

src/config/navigation.js
src/utils/format.js
src/hooks/useDarkMode.js
src/hooks/useCountUp.js
src/hooks/useClickOutside.js
src/components/ui/Card.jsx
src/components/ui/Button.jsx
src/components/ui/Badge.jsx
src/components/ui/Avatar.jsx
src/components/ui/EmptyState.jsx
src/components/ui/Skeleton.jsx
src/components/illustrations/DocScanIllustration.jsx
src/components/auth/LoginForm.jsx
src/components/layout/Sidebar.jsx
src/components/layout/TopNavbar.jsx
src/components/layout/DashboardLayout.jsx
src/components/dashboard/StatCard.jsx
src/components/dashboard/DashboardHeader.jsx
src/components/dashboard/RecentDocuments.jsx
src/components/dashboard/ActivityTimeline.jsx
src/components/dashboard/PendingApprovals.jsx
src/components/dashboard/QuickActions.jsx
src/components/dashboard/Announcements.jsx
src/components/dashboard/SystemStatus.jsx
src/components/dashboard/PlaceholderSection.jsx
src/components/dashboard/ProfileSection.jsx
src/components/dashboard/DashboardHome.jsx

## ✏️ Modified files (6) - overwrite your existing copy

src/pages/DashboardPage.jsx    (rewired - see "How DashboardPage works" below)
src/pages/LoginPage.jsx        (full redesign - split screen + glassmorphism)
src/index.css                  (added skeleton shimmer + focus-visible + reduced-motion)
tailwind.config.js             (added dark mode, brief's exact palette, custom animations)
index.html                     (added Inter font <link> tags)
package.json                   (added two new deps - run npm install after copying)

New dependencies in package.json:
  "lucide-react": "^0.469.0"   - icon set the brief asked for
  "clsx": "^2.1.1"             - tiny conditional-className helper used by every new component

## 🗑️ Delete these 3 old files - superseded and moved, now dead code

src/components/LoginForm.jsx   -> replaced by src/components/auth/LoginForm.jsx
src/components/Sidebar.jsx     -> replaced by src/components/layout/Sidebar.jsx
src/components/StatCard.jsx    -> replaced by src/components/dashboard/StatCard.jsx

## ✅ Not included, not touched

src/App.jsx - genuinely zero changes. Its `user ? <DashboardPage/> : <LoginPage/>`
logic is exactly what it was in your repo - untouched, so "don't change routing"
is honored to the letter.

## How DashboardPage.jsx works now

It owns two pieces of state - `activeSection` (which sidebar item is active,
starts on "dashboard") and `sessionStartedAt` (captured once, real sign-in
time - shared by the navbar's notification bell and the dashboard's activity
timeline so both show the same real event). It renders `<DashboardLayout>`
and switches content inside it:

  "dashboard" -> <DashboardHome />   (stats, recent docs, quick actions, etc.)
  "profile"   -> <ProfileSection />  (your real user.id/role/created_at)
  anything else -> <PlaceholderSection /> (honest "coming in Phase X" empty state)

## Install & run after copying everything in

    cd frontend
    npm install
    npm run dev

Backend is untouched from Phase 2 - just run it as before:

    cd backend
    .venv\Scripts\activate   (Windows)  or  source .venv/bin/activate (Mac/Linux)
    uvicorn app.main:app --reload --port 8000

Login with admin/admin123 or officer/officer123 exactly as before.
