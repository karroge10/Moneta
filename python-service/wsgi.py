"""
WSGI entry point for Gunicorn, e.g. `cd python-service && gunicorn wsgi:application`.

Works from any working directory: the service folder and the repo root (for
`python.process_pdf`) are put on sys.path before importing the app.
"""
import sys
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parent
for import_root in (SERVICE_DIR, SERVICE_DIR.parent):
    if str(import_root) not in sys.path:
        sys.path.insert(0, str(import_root))

from app import app as application  # noqa: E402
