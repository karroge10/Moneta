# Deployment Guide

## Recommended: Vercel (Frontend) + Render (Python Service)

This is the recommended approach for best performance and cost efficiency.

### Step 1: Deploy Python Service to Render

**⚠️ Important**: Make sure all files in `python-service/` are committed to git before deploying!

1. **Commit the Python service files:**
   ```bash
   git add python-service/
   git commit -m "Add Python PDF processing service"
   git push
   ```

2. **Create a new Web Service on Render**
   - Go to https://render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository and branch (usually `main`)

3. **Configure the service:**
   - **Name**: `pdf-processor` (or your choice)
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
   
   **Note**: If you get "file not found" errors, make sure:
   - All files are committed to git
   - The paths in build/start commands are correct
   - Root Directory is empty (not set to `python-service`)

3. **Set Environment Variables:**
   - `PORT`: `5000` (Render sets this automatically, but good to have)
   - `CATEGORIES_MODEL_PATH`: `python/models/categories.ftz` (optional)
   - `PYTHONUNBUFFERED`: `1` (for better logging)

4. **Deploy**
   - Render will automatically deploy when you push to your main branch
   - Note the service URL (e.g., `https://pdf-processor-xyz.onrender.com`)

### Step 2: Update Vercel Deployment

1. **Set Environment Variable in Vercel:**
   - Go to your Vercel project settings
   - Add environment variable:
     - **Key**: `PYTHON_SERVICE_URL`
     - **Value**: `https://your-pdf-processor.onrender.com` (from Step 1)

2. **Update the API Route:**
   - Option A: Use the external service version
     - Rename `src/app/api/transactions/upload-bank-statement/route.external-service.ts.example` 
     - To: `src/app/api/transactions/upload-bank-statement/route.ts`
     - (Backup the original first!)
   
   - Option B: Make it work with both (recommended)
     - Update the existing route to check for `PYTHON_SERVICE_URL`
     - If set, use external service; otherwise, use local Python

3. **Redeploy on Vercel**
   - Push your changes
   - Vercel will automatically redeploy

### Step 3: Test

1. Upload a PDF through your app
2. Check that transactions are extracted correctly
3. Monitor logs on both Vercel and Render

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

