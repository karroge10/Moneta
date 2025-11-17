FROM python:3.10-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY python-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python processing code
COPY python/ ./python/

# Copy Flask app
COPY python-service/app.py .

# Expose port
EXPOSE 5000

# Run Flask app
CMD ["python", "app.py"]

