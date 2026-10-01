FROM python:3.12-slim

WORKDIR /app

COPY python-service/requirements.txt ./python-service/requirements.txt
RUN pip install --no-cache-dir -r python-service/requirements.txt

COPY python/ ./python/
COPY python-service/ ./python-service/

WORKDIR /app/python-service
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PORT=5000

EXPOSE 5000

CMD gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 2 --timeout 900 --worker-class gthread --log-level info wsgi:application
