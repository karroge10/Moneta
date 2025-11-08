# Moneta

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## PDF Import Prototype

### Prerequisites

- Python 3.10+
- `pip install -r python/requirements.txt` (installs `pdfplumber` and the scikit-learn stack)
- Optional: `mineru` package if you want to experiment with the full extraction pipeline

### Local Workflow

1.  **Install Python Dependencies**:
    Ensure you have Python 3.8+ installed. Then, install the required libraries:
    ```bash
    pip install -r python/requirements.txt
    ```
    This installs `pdfplumber` for PDF extraction, `scikit-learn` for transaction categorization fallbacks, and `deep-translator` so the worker automatically translates non-English descriptions to English.

1. Start the Next.js dev server: `npm run dev`
2. Visit `http://localhost:3000/transactions/import`
3. Drag a PDF bank statement (for example `src/lib/credo_statement.pdf`) into the drop zone or click **Select PDF**
4. The UI shows the upload pipeline *(queued → uploading → processing → categorizing → ready)*
5. Review the editable table, tweak any fields, and press **Confirm Import** to POST to `/api/transactions/import`
6. Confirmed imports appear in the history table with search, filters, and pagination

### Python Worker

- Entry point: `python/process_pdf.py`
- Accepts `PDF_PATH` and optional `MODEL_PATH` (`python/models/categories.ftz` by default)
- Uses `pdfplumber` heuristics for GEL statements; falls back to MinerU/sample data if parsing fails
- Outputs JSON payload: `{ transactions: [...], metadata: { currency, source, periodStart, periodEnd } }`
- Run locally: `python python/process_pdf.py src/lib/credo_statement.pdf`

### Classifier Model

- A placeholder model lives at `python/models/transactions_model.joblib`; replace with a trained model when available
- Override its location with the `CATEGORIES_MODEL_PATH` environment variable if needed
-   A placeholder `python/models/README.md` explains how to train and save a `scikit-learn` model as `transactions_model.joblib`.
-   If `transactions_model.joblib` is not present, the Python worker will use keyword-based heuristics for categorization. It matches translated descriptions against weighted keywords (e.g. "conversion", "withdrawal", "fee") and derives a confidence score from the total weight it finds.

### Cleanup

- Temporary PDFs are saved under `tmp/uploads` and removed once processing finishes
- Override the temp directory with `TMPDIR`

## Deployment Prep (Render + Vercel)

- **Backend (Render)**
  - Deploy the Next.js server with Python available
  - Install requirements: `pip install -r python/requirements.txt`
  - Environment variables: `PYTHON_PATH`, `CATEGORIES_MODEL_PATH`, `TMPDIR`, and any future Supabase credentials
  - Ensure the service build step runs both `npm install` and `pip install`

- **Frontend (Vercel)**
  - Configure `NEXT_PUBLIC_API_BASE_URL` to point at the Render deployment (fallback to `http://localhost:3000` locally)

- **Supabase**
  - When ready, update `/api/transactions/import` to persist to Supabase and store credentials in environment variables

- **Static Assets**
  - Replace `python/models/categories.ftz` with the trained model or download from object storage at runtime

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
