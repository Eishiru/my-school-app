"""Vercel WSGI entry point; Django runs normally via manage.py locally."""
import os
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

try:
    from backend.wsgi import application
    app = application
except Exception as e:
    import traceback
    print(f"CRITICAL ERROR loading Django application: {e}", file=sys.stderr)
    traceback.print_exc()
    raise
