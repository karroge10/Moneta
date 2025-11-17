## Moneta Import Workflow Plan

### ✅ Completed
- Added dedicated `/transactions/import` page with drag-and-drop upload, review table, search, and pagination.
- Implemented Next.js API route for PDF uploads that spawns the Python worker and returns structured data.
- Replaced `fastText` with `pdfplumber` + scikit-learn-compatible pipeline and keyword heuristics.
- Integrated Google Translate (via `deep-translator`) to auto-translate descriptions to English.
- Extended UI state to surface translated text, category suggestions, formatted amounts, and progress feedback.
- Added detailed logging inside `python/process_pdf.py` for page processing and translation progress.
- Defined shared TypeScript models for `UploadedTransaction` and response metadata across API and UI.
- **Database Integration:**
  - Set up Prisma ORM with Neon PostgreSQL database
  - Created unified `Transaction` table replacing `Expense` and `Income` tables
  - Integrated Clerk authentication with database user sync
  - Replaced in-memory storage with database persistence
  - Implemented bulk insert for fast transaction imports (191 transactions in seconds)
  - Removed `translatedDescription` column to optimize storage (stores only original description)
  - Added category matching during import
  - Created database schema with: User, Transaction, Goal, Investment, Bill, Category, Notification tables

### ⏳ In Progress / Upcoming
- Seed Category table with standard categories (currently empty, causing categoryId to be null)
- Train or tune a real scikit-learn classification model (`transactions_model.joblib`) for better categories & confidence.
- Stream Python worker progress to the frontend (SSE/WebSocket) to complement server-side logs.
- Harden PDF parsing heuristics for additional statement layouts; add regression tests.
- Create API routes for: Goals CRUD, Investments CRUD, Bills CRUD, User settings
- Deployment prep: Render (Node+Python) + Vercel (Next.js) configuration, environment variable wiring.
