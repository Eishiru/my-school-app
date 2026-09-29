"""Vercel WSGI entry point for Django backend (ClaroEd)."""
import os
import sys
from pathlib import Path

# On Vercel, __file__ is /var/task/api/index.py
# We need /var/task/backend on sys.path so `backend.settings` resolves
_this_file = Path(__file__).resolve()
_api_dir = _this_file.parent          # /var/task/api
_root_dir = _api_dir.parent           # /var/task
_backend_dir = _root_dir / "backend"  # /var/task/backend

# Insert in order: backend/ first (so 'backend.settings' works as a package),
# then root (so 'backend' package itself is importable either way).
for _p in [str(_backend_dir), str(_root_dir)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

try:
    from django.core.wsgi import get_wsgi_application
    application = get_wsgi_application()
    app = application
except Exception as exc:
    import traceback
    traceback.print_exc(file=sys.stderr)
    raise
