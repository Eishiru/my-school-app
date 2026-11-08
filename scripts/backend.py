"""Use the local venv: python scripts/backend.py runserver (or migrate/check)."""
from pathlib import Path
import subprocess, sys
root = Path(__file__).resolve().parents[1]
python = root / '.venv' / ('Scripts/python.exe' if sys.platform == 'win32' else 'bin/python')
if not python.exists(): raise SystemExit('First run: python scripts/setup.py')
raise SystemExit(subprocess.call([str(python), 'manage.py', *(sys.argv[1:] or ['runserver'])], cwd=root / 'backend'))
