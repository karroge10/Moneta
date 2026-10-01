# PDF Processing Service

Extracts transactions from PDF bank statements with pdfplumber, translates
descriptions to English (deep-translator), and returns them as JSON.
Each transaction has `category: null` and `confidence: 0`; categories are
assigned on the Next.js side. A PDF that cannot be parsed yields zero
transactions. The
extraction code lives in `python/process_pdf.py`; this folder holds the HTTP
service and an optional database-polling worker.

## How it is used

The Next.js route `src/app/api/transactions/upload-bank-statement` stores a
`PdfProcessingJob` row, then:

- If `PYTHON_SERVICE_URL` is set (production), it creates the job as
  `processing` and POSTs the file to `POST /process-pdf` on this service. The
  service optionally reports progress to `callbackUrl`
  (`/api/internal/jobs/<jobId>/progress`), and the Next.js route also writes
  the final result from the HTTP response.
- If `PYTHON_SERVICE_URL` is not set, the job is created as `queued` and
  `worker.py` picks it up from Postgres.

## Endpoints (`app.py`)

- `GET /health`: public health check.
- `POST /process-pdf`: multipart form with `file` (required, max 10 MB),
  `jobId` and `callbackUrl` (optional). Requires the header
  `x-internal-secret: <INTERNAL_API_SECRET>`.
  - 503 if `INTERNAL_API_SECRET` is not set on the service, 401 if the header
    is wrong, 413 if the upload is over 10 MB, 400 if no transactions are found.
  - Progress callbacks are sent only when `callbackUrl` is https (http only for
    localhost) and, if `CALLBACK_ALLOWED_HOSTS` is set, its host is in that list.
    Otherwise the callback is ignored and the PDF is still processed; the result
    is returned in the response. Callbacks carry the same `x-internal-secret` header.

## Worker (`worker.py`)

Polls `PdfProcessingJob` every 2 seconds and claims the oldest `queued` job in
one statement (`UPDATE ... WHERE id = (SELECT ... FOR UPDATE SKIP LOCKED)`), so
several workers never take the same job. It writes progress, the result and
errors to the job row, clears `fileContent` after success, and creates a
`Notification` on failure.

## Environment variables

| Name | Service | Purpose |
| --- | --- | --- |
| `INTERNAL_API_SECRET` | web | Required. Shared secret; must equal `INTERNAL_API_SECRET` in the Next.js app. |
| `CALLBACK_ALLOWED_HOSTS` | web | Optional. Comma-separated hostnames allowed as callback targets, e.g. `monetafin.vercel.app`. Unset allows any https host (the caller already holds the secret). |
| `PORT` | web | Port to bind (Render sets it). |
| `DATABASE_URL` | worker | Postgres connection string (same database as the app). |
| `PYTHONUNBUFFERED` | both | `1` for unbuffered logs. |

## Run locally

From the repo root, `npm run setup` creates `.venv` and installs
`python-service/requirements.txt` into it (or do it by hand):

```bash
pip install -r python-service/requirements.txt
cd python-service
export INTERNAL_API_SECRET=dev-secret CALLBACK_ALLOWED_HOSTS=localhost
PYTHONPATH=.. python app.py          # dev server on :5000
PYTHONPATH=.. python worker.py       # worker, needs DATABASE_URL
python ../python/process_pdf.py statement.pdf   # CLI, prints JSON
```

```bash
curl http://localhost:5000/health
curl -H "x-internal-secret: dev-secret" -F file=@statement.pdf http://localhost:5000/process-pdf
```

Docker (build from the repo root): `docker build -f python-service/Dockerfile .`
runs the same gunicorn command as Render.

## Deployment (Render)

`render.yaml` in the repo root defines two services, both built with
`pip install -r python-service/requirements.txt`:

- `pdf-processor` (web): `cd python-service && PYTHONPATH=.. gunicorn ... wsgi:application`
  with 2 workers x 2 threads (gthread) and a 900 s timeout for large PDFs.
- `pdf-worker` (background worker): `cd python-service && PYTHONPATH=.. python worker.py`.

Set `INTERNAL_API_SECRET` (required) and optionally `CALLBACK_ALLOWED_HOSTS` in
the Render dashboard (they are marked `sync: false`).
