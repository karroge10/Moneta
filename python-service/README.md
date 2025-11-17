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

### Using render.yaml (Alternative)

If you want to use the `render.yaml` file, make sure it's in the root of your repository and Render is configured to use it.

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

## API Endpoints

- `GET /health` - Health check
- `POST /process-pdf` - Process PDF file (multipart/form-data with 'file' field)

