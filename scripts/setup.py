"""Run once from any directory: python scripts/setup.py"""
from pathlib import Path
import shutil, subprocess, sys, venv
root = Path(__file__).resolve().parents[1]
for folder in ('frontend', 'backend'):
    source, target = root / folder / '.env.example', root / folder / '.env'
    if not target.exists(): shutil.copyfile(source, target)
env = root / '.venv'
if not env.exists(): venv.EnvBuilder(with_pip=True).create(env)
python = env / ('Scripts/python.exe' if sys.platform == 'win32' else 'bin/python')
subprocess.run([str(python), '-m', 'pip', 'install', '-r', str(root / 'backend/requirements.txt')], check=True)
npm = shutil.which('npm.cmd' if sys.platform == 'win32' else 'npm')
if not npm: raise SystemExit('Install Node.js, then rerun setup.')
subprocess.run([npm, 'ci'], cwd=root / 'frontend', check=True)
print('Setup complete. Edit backend/.env before connecting to an existing database.')
