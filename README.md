# ClaroEd — local development and deployment

This is a cleaned source workspace based on your latest my-school-app.zip. Open this folder in VS Code. Keep frontend and backend together in one repository; deploy them together as ONE Vercel project. React serves pages and assets; Django handles /api on the same domain.

## Folder guide

| Folder/file | Purpose |
| --- | --- |
| frontend/src | React pages, components, hooks, and API clients |
| frontend/src/api/config.ts | Single API URL configuration |
| frontend/vite.config.ts | Local proxy and frontend build settings |
| vercel.json | Single-project React build, Django function and routing |
| api/index.py | Vercel entry point for Django |
| backend/LMS | Django models, views, serializers, migrations |
| backend/backend/settings.py | Environment-based Django settings |
| backend/requirements.txt | UTF-8 Python dependency pins |
| scripts/setup.py | Create environment files, venv, install dependencies |
| scripts/backend.py | Run Django commands using the local venv |
| docs/DEPLOYMENT.md | Vercel, Supabase database and storage setup |
| docs/CHANGES.md | Changes and validation limits |

## Start locally (Windows, macOS or Linux)

Install Python 3.12. Setup installs Node.js 22 and npm inside the same .venv using nodeenv; no global Node installation is required. Internet access is needed for dependency downloads. In a terminal at this folder:

```bash
python scripts/setup.py
python scripts/backend.py migrate
python scripts/backend.py createsuperuser
```

Choose ADMIN for the superuser's role. The setup command creates missing .env files but never overwrites an existing one. The default backend environment uses a NEW local SQLite database. Your Supabase records are not deleted, copied or modified by setup. Migrations are a separate explicit command.

Activate the environment in each terminal before running npm. On Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

On Windows Command Prompt use `.venv\Scripts\activate.bat`; on macOS/Linux use `source .venv/bin/activate`. Verify `node --version` and `npm --version`. React packages still live in frontend/node_modules. Vercel uses its own Node runtime; do not upload .venv.

Start two terminals at this folder:

```bash
# Terminal 1: Django
python scripts/backend.py runserver
```

```bash
# Terminal 2: React
npm run dev
```

Open http://localhost:5173. Django runs at http://127.0.0.1:8000. Vite proxies /api and /media to Django. To change the local backend port, edit DEV_API_TARGET in frontend/.env. No changes to page code are needed.

To use your existing Supabase database locally, put its connection URL in backend/.env as DATABASE_URL. Use a development database when possible. Before running migrate, verify the URL points to the database you intend to change. Local login accounts will differ from Supabase accounts when you use SQLite.

## Daily commands

```bash
npm run dev
npm run build
python scripts/backend.py check
python scripts/backend.py makemigrations
python scripts/backend.py migrate
```

Run makemigrations only after intended model changes, review the generated migration, then migrate. Existing migrations are included. `npm run preview` previews the frontend build only; the Vite development proxy is not a production server.

## API settings

Use VITE_API_BASE_URL=/api locally and on Vercel (or omit it to use the default). Remove any old external backend URL from Vercel environment variables. Login and quiz/group requests use the same origin. The local Vite proxy and production Vercel routes both forward /api to Django.

Vite embeds this value during build. Redeploy the project after changing it. Never put database passwords, OpenAI keys or S3 credentials in variables starting with VITE_.

## Existing data and credentials

The cleaned ZIP excludes .git history, node_modules, virtual environments, .env files, SQLite databases, user uploads, compiled dist/staticfiles output, and caches. Keep your original project and media folder as a backup. This ZIP is a source bundle, not a database or upload backup.

The original settings contained a database password and Django secret. Rotate the database password and set a new deployment DJANGO_SECRET_KEY. The new key invalidates previously issued JWTs; users need to sign in again. Neither credential is included here.

For existing uploads, restore your old backend/media folder for local use, or upload its contents to the deployment bucket while preserving the relative paths stored in the database. Switching storage does not move old files automatically.

See docs/DEPLOYMENT.md before deploying. No deployment, remote migration, database connection or credential rotation was performed for you.
