"""Vercel WSGI entry point; Django also runs normally via manage.py locally."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from backend.wsgi import application

app = application
