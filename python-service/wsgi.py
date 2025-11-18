"""
WSGI entry point for Gunicorn
This file allows Gunicorn to properly import the Flask app
"""
import sys
from pathlib import Path

# Add project root to path (parent of python-service)
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

# Now we can import app directly since sys.path includes project root
# The app.py file is in python-service/, but we're importing it as a module
# We'll load it using importlib to avoid hyphen issues
import importlib.util

app_file = Path(__file__).parent / 'app.py'
spec = importlib.util.spec_from_file_location('app', app_file)
app_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app_module)

# Export the Flask app instance for Gunicorn
application = app_module.app

