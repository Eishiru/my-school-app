"""Vercel WSGI entry point for Django backend (ClaroEd)."""
import os
import sys
from pathlib import Path

# On Vercel, __file__ is /var/task/api/index.py
_root_dir = Path(__file__).resolve().parent.parent   # /var/task
_backend_dir = _root_dir / "backend"                 # /var/task/backend

for _p in [str(_backend_dir), str(_root_dir)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

from django.core.wsgi import get_wsgi_application  # noqa: E402

application = get_wsgi_application()
app = application
