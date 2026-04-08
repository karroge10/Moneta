# Moneta

Personal finance web app: **Next.js** (App Router) on Vercel, **PostgreSQL** (Prisma), **Clerk** auth, and a **Python PDF processor** deployed separately (e.g. Render) for bank-statement import.

## Quick start

```bash
npm install
npm run dev
```

The dev server prefers port **3000**; if it is taken, use the URL shown in the terminal.

## PDF bank statement import

### Local (full stack on your machine)

1. Install Python deps: `pip install -r python/requirements.txt` (and `python-service/requirements.txt` if you run the Flask service locally).
2. `npm run dev` and open `/transactions/import`.
3. Upload a PDF; the app queues processing and polls job status.

### Production: Vercel + external PDF service

Next.js on **Vercel** does not run the Python extractor. Production upload uses **`PYTHON_SERVICE_URL`**: the Next.js API forwards the PDF to your deployed processor (HTTP `POST …/process-pdf`).

Set on **Vercel** (all environments that should import PDFs):

| Variable | Purpose |
|----------|---------|
| `PYTHON_SERVICE_URL` | Base URL of the PDF service, **no trailing slash** (e.g. `https://moneta-pdf-processor.onrender.com`) |

If this is set correctly, PDF import works from production; local dev can use the same URL or a local Flask instance.

### Deploying the PDF service (Render / similar)

See `python-service/README.md` and `render.yaml`. Typical start command: `python python-service/app.py` (or Gunicorn as in `render.yaml`).

**Render / PDF service environment (optional):**

| Variable | Purpose |
|----------|---------|
| `INTERNAL_API_SECRET` | If set, sent to the Next.js progress callback for internal routes. |

PDF categorization uses **keyword heuristics** (and translation in the Python pipeline where needed). The optional `CATEGORIES_MODEL_PATH` joblib hook exists only in `python-service` / `python` docs if you ever add a custom model; the app does not require it.

## Other environment variables

- `NEXT_PUBLIC_CONTACT_EMAIL` — optional; landing page support mailto (defaults to `hello@moneta.app` if unset).
- Database, Clerk, and other secrets are standard for this stack (see your Vercel / `.env.local` setup).

## Statistics — demographic “peers”

Comparisons use **other users** who have **data sharing** on (excluding you), filtered to the same **age group**, **country**, or **profession** as your profile. Fill those fields in Settings for the dimension you pick.

**Local / demo cohort (pick one or both)**

1. **Database seed (realistic, same code path as production)**  
   After `npm run seed`, run:

   ```bash
   npm run seed:demographic
   ```

   Creates ~33 `demo_*` users (no Clerk id) with sharing on and sample transactions. Replace them anytime:

   ```bash
   npm run seed:demographic -- --reset
   ```

   Then for **your** Clerk user: turn on **data sharing** in Settings and set **date of birth / country / profession** so they match at least one seeded bucket (e.g. country **Georgia**, profession **Developer**, age in **18–24** is heavily seeded).

2. **Synthetic peers (no extra DB users)** — **development only** (`NODE_ENV !== 'production'`). In `.env.local`:

   ```bash
   FAKE_DEMOGRAPHIC_COHORT=true
   # optional: FAKE_DEMOGRAPHIC_COHORT_SIZE=24
   ```

   If no real peers match your profile, the API fills comparisons with a **deterministic fake sample** and the Statistics UI notes “illustrative demo cohort”.  
   On production builds this stays **off** unless you also set `ALLOW_FAKE_DEMOGRAPHIC_COHORT_IN_PRODUCTION=true` (not recommended for a real product).

Transaction display uses a **fixed Georgian→English phrase map** in `src/lib/transaction-utils.ts` (no external translation API).

## Repo layout (high level)

- `src/app` — Next.js routes and API routes  
- `src/components` — UI  
- `prisma` — schema and migrations  
- `python/` — PDF extraction + categorization CLI (`process_pdf.py`)  
- `python-service/` — Flask app exposed to Vercel via `PYTHON_SERVICE_URL`
