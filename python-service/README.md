# Python PDF Processing Service

This is a Flask service that processes PDF bank statements and extracts transactions.

## Deployment on Render

### Manual Setup (Recommended)

When creating the service on Render, use these settings:

- **Name**: `pdf-processor`
- **Environment**: `Python 3`
- **Build Command**: 
  ```bash
  pip install -r python-service/requirements.txt && pip install -r python/requirements.txt
  ```
- **Start Command**: 
  ```bash
  python python-service/app.py
  ```
- **Root Directory**: Leave empty (uses repo root)

### Environment Variables

Set these in Render dashboard:

- `PORT`: `5000` (Render sets this automatically)
- `CATEGORIES_MODEL_PATH`: `python/models/categories.ftz` (optional)
- `PYTHONUNBUFFERED`: `1` (for better logging)

### Using render.yaml (Recommended for Production)

If you want to use the `render.yaml` file, make sure it's in the root of your repository and Render is configured to use it.

The `render.yaml` configuration uses Gunicorn with:
- **Timeout**: 900 seconds (15 minutes) to handle very large PDFs (Render allows up to 100 minutes)
- **Workers**: 2 workers with 2 threads each for better concurrency
- **Worker Class**: gthread for better I/O handling

This is recommended for production as it handles large PDFs (500+ transactions) without timing out.

### Concurrency and Scaling

**Free Tier:**
- ~2 concurrent requests (limited by resources)
- If 100 users upload simultaneously, they'll queue up
- Fine for low-moderate traffic

**Paid Tier:**
- More workers/instances available
- Can scale horizontally to handle hundreds of concurrent users
- Recommended for production with 100+ users

**Current Setup:**
- 2 Gunicorn workers = 2 requests processed simultaneously
- Remaining requests wait in queue (first-come-first-served)
- Each request is independent (no shared queue between workers)

**Future Optimization (Batching):**
- Split PDF into chunks (e.g., pages 1-15, 16-30)
- Process chunks in parallel across multiple requests
- Merge results on client/server side
- Pro: Faster per-request, better UX
- Con: Complex implementation, more API calls, potential rate limiting
- Recommended only if timeout becomes an issue or for very large PDFs (1000+ transactions)

## Local Development

1. Install dependencies:
   ```bash
   pip install -r python-service/requirements.txt
   pip install -r python/requirements.txt
   ```

2. Run the service:
   ```bash
   python python-service/app.py
   ```

3. Test the health endpoint:
   ```bash
   curl http://localhost:5000/health
   ```

## Async Processing Architecture

The PDF processing now uses an **async/queue pattern**:

1. **Upload Endpoint** (`/api/transactions/upload-bank-statement`):
   - Accepts PDF file
   - Creates job in PostgreSQL database
   - Returns job ID immediately (<1 second)

2. **Background Worker** (`python-service/worker.py`):
   - Polls PostgreSQL for queued jobs
   - Processes PDFs (extraction, translation, categorization)
   - Updates progress in database (0-100%)
   - Creates notification when complete

3. **Status Endpoint** (`/api/jobs/[jobId]/status`):
   - Frontend polls this every 2 seconds
   - Returns job status, progress, and transactions when ready

4. **Frontend**:
   - Polls status endpoint
   - Updates progress bar in real-time
   - Shows notification when processing completes

### Benefits

- ✅ **No timeout issues** - Processing happens in background
- ✅ **Better UX** - Immediate response, progress updates
- ✅ **Resilient** - Jobs can be retried if they fail
- ✅ **Scalable** - Workers can scale independently

### Worker Setup

The worker is configured in `render.yaml` as a separate service:

```yaml
- type: worker
  name: pdf-worker
  startCommand: cd python-service && PYTHONPATH=.. python worker.py
  envVars:
    - DATABASE_URL: ${DATABASE_URL}
```

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string (same as main app)
- `CATEGORIES_MODEL_PATH` - Path to category model (optional)

## API Endpoints

- `GET /health` - Health check
- `POST /process-pdf` - Process PDF file (multipart/form-data with 'file' field) - **Legacy, now uses async processing**

