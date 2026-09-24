"""Run once from any directory: python scripts/setup.py"""
from pathlib import Path
import json, os, shutil, subprocess, sys, venv
from urllib.request import urlopen
root = Path(__file__).resolve().parents[1]
for folder in ('frontend', 'backend'):
    source, target = root / folder / '.env.example', root / folder / '.env'
    if not target.exists(): shutil.copyfile(source, target)
env = root / '.venv'
if not env.exists(): venv.EnvBuilder(with_pip=True).create(env)
python = env / ('Scripts/python.exe' if sys.platform == 'win32' else 'bin/python')
subprocess.run([str(python), '-m', 'pip', 'install', '-r', str(root / 'backend/requirements.txt')], check=True)
# Install Node into the same venv using nodeenv's Python integration.
subprocess.run([str(python), '-m', 'pip', 'install', 'nodeenv'], check=True)
bin_dir = python.parent
local_env = os.environ.copy()
local_env['VIRTUAL_ENV'] = str(env)
local_env['PATH'] = str(bin_dir) + os.pathsep + local_env.get('PATH', '')
node = bin_dir / ('node.exe' if sys.platform == 'win32' else 'node')
if not node.exists():
    # Resolve the current Node 22 patch rather than installing an old security release.
    with urlopen('https://nodejs.org/dist/index.json', timeout=60) as response:
        releases = json.load(response)
    versions = [r['version'][1:] for r in releases if r['version'].startswith('v22.')]
    version = max(versions, key=lambda v: tuple(map(int, v.split('.'))))
    subprocess.run([str(python), '-m', 'nodeenv', '-p', '--node=' + version],
                   env=local_env, check=True)
npm = bin_dir / ('npm.cmd' if sys.platform == 'win32' else 'npm')
if not node.exists() or not npm.exists():
    raise SystemExit('Node setup is incomplete. Check the nodeenv output and rerun setup.')
subprocess.run([str(node), '--version'], env=local_env, check=True)
subprocess.run([str(npm), 'ci'], cwd=root / 'frontend', env=local_env, check=True)
print('Setup complete. Edit backend/.env before connecting to an existing database.')
