# Deployment Guide

## Recommended: Vercel (Frontend) + Render (Python Service)

This is the recommended approach for best performance and cost efficiency.

### Step 1: Deploy Python Services to Render

**⚠️ Important**: Make sure all files in `python-service/` are committed to git before deploying!

The system uses **async processing** with two services:

1. **Web Service** (`pdf-processor`) - Handles HTTP requests (legacy endpoint, not used in async flow)
2. **Worker Service** (`pdf-worker`) - Processes PDFs in background

#### Option A: Using render.yaml (Recommended)

1. **Ensure `render.yaml` is in repository root**
2. **Render will automatically detect and create both services:**
   - Web service: `pdf-processor`
   - Worker service: `pdf-worker`

3. **Set Environment Variables in Render Dashboard:**
   - For **both services**:
     - `DATABASE_URL`: Your Neon PostgreSQL connection string
   - `CATEGORIES_MODEL_PATH`: `python/models/categories.ftz` (optional)
   - `PYTHONUNBUFFERED`: `1` (for better logging)
   - For **web service only**:
     - `PORT`: `5000` (Render sets this automatically)

#### Option B: Manual Setup

1. **Create Web Service:**
   - Name: `pdf-processor`
   - Environment: `Python 3`
   - Build Command: `pip install -r python-service/requirements.txt && pip install -r python/requirements.txt`
   - Start Command: `cd python-service && PYTHONPATH=.. gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 2 --timeout 900 --worker-class gthread --log-level info wsgi:application`
   - Environment Variables: `PORT=5000`, `CATEGORIES_MODEL_PATH=python/models/categories.ftz`, `PYTHONUNBUFFERED=1`

2. **Create Worker Service:**
   - Name: `pdf-worker`
   - Type: `Background Worker`
   - Environment: `Python 3`
   - Build Command: `pip install -r python-service/requirements.txt && pip install -r python/requirements.txt`
   - Start Command: `cd python-service && PYTHONPATH=.. python worker.py`
   - Environment Variables: `DATABASE_URL=<your-database-url>`, `CATEGORIES_MODEL_PATH=python/models/categories.ftz`, `PYTHONUNBUFFERED=1`

### Step 2: Update Vercel Deployment

1. **Set Environment Variables in Vercel:**
   - `DATABASE_URL`: Your Neon PostgreSQL connection string (same as Render)
   - No need for `PYTHON_SERVICE_URL` anymore (processing is async)

2. **Deploy Database Migration:**
   - Run `npx prisma db push` or `npx prisma migrate deploy` to create `PdfProcessingJob` table

3. **Redeploy on Vercel**
   - Push your changes
   - Vercel will automatically redeploy

### Step 3: Test

1. Upload a PDF through your app
2. You should see:
   - Immediate response (<1 second)
   - Progress bar updating in real-time
   - Notification when processing completes
3. Check logs:
   - Vercel logs: Upload endpoint, status polling
   - Render worker logs: PDF processing progress

---

## Alternative: Everything on Render

If you prefer a simpler single-deployment setup:

### Deploy Full Next.js App to Render

1. **Create a new Web Service on Render**
   - Environment: `Node`
   - Build Command: `npm install && npm run build && pip install -r python/requirements.txt`
   - Start Command: `npm start`
   - Root Directory: Leave empty

2. **Set Environment Variables:**
   - `PYTHON_PATH`: `python3`
   - `CATEGORIES_MODEL_PATH`: `python/models/categories.ftz` (optional)
   - `DATABASE_URL`: Your database connection string
   - All other Next.js environment variables

3. **Deploy**
   - Render will build and deploy your full app
   - Python dependencies will be installed during build

### Pros/Cons

✅ **Pros:**
- Single deployment
- No network latency between services
- Simpler architecture

❌ **Cons:**
- Lose Vercel's Next.js optimizations
- Slower for static assets
- May be more expensive

---

## Local Development

For local development, you can use either approach:

### Option 1: Local Python (Current Setup)
- Just run `npm run dev`
- Python dependencies are installed via `postinstall` script
- Everything runs locally

### Option 2: Local Python Service
- Start Python service: `cd python-service && python app.py`
- Set `PYTHON_SERVICE_URL=http://localhost:5000` in `.env.local`
- Run Next.js: `npm run dev`

---

## Cost Comparison

### Vercel + Render
- **Vercel**: Free tier (hobby) or $20/month (pro)
- **Render**: Free tier (spins down after 15min inactivity) or $7/month (always on)
- **Total**: Free (with cold starts) or ~$27/month

### Render Only
- **Render**: $7/month (starter) or $25/month (standard)
- **Total**: $7-25/month

---

## Troubleshooting

### Python Service Not Responding
- Check Render logs for errors
- Verify `PYTHON_SERVICE_URL` is set correctly in Vercel
- Test the service directly: `curl https://your-service.onrender.com/health`

### CORS Errors
- The Flask service has CORS enabled
- If issues persist, check `python-service/app.py` CORS settings

### PDF Processing Fails
- Check Render logs for Python errors
- Verify Python dependencies are installed
- Test locally first with the test script: `python python/test_pdf_extraction.py path/to/file.pdf`

