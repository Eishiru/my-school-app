# Changes and checks

- Preserved the frontend/backend layout and existing business modules, UI and migrations.
- Replaced hardcoded localhost API URLs in login, assignment, analytics and quiz/group dialogs with one config module.
- Added a Vite dev proxy for /api and /media; deployment uses the same /api path on one Vercel domain.
- Moved Django secrets, database, host and CORS/CSRF settings to environment variables.
- Added an isolated SQLite default only for explicit debug mode; deployment requires PostgreSQL configuration.
- Added Django storage configuration for private S3-compatible uploads and WhiteNoise static assets.
- Removed obsolete Django React-template fallback and static dist-folder dependency. Django handles API requests; both are built into one Vercel deployment.
- Removed backend/backend/main.py, the standalone database probe using unrelated environment names. Django now owns database configuration.
- Added a health endpoint, setup/management scripts, root npm shortcuts and deployment instructions.
- Generated UTF-8 requirements from installed metadata in the archive, excluding pip/setuptools and redundant psycopg2 packages; selected psycopg[binary] for portable PostgreSQL runtime support.
- Preserved package-lock.json, including platform-specific optional dependency entries. Do not ship Windows node_modules to Linux/Vercel; run npm ci on the target machine.
- Omitted private .env files, database/uploads, git history, installed dependencies, compiled build output and caches from the deliverable.

Validation completed:
- TypeScript `tsc -b` passed against the supplied frontend dependencies.
- Django model checks passed.
- All supplied Django migrations applied successfully to a fresh isolated temporary SQLite database.
- Python files parse and generated JSON/environment placeholders checked.
- No hardcoded localhost API URLs remain in frontend/src.

Limits:
- Full Vite bundling could not run here: the uploaded node_modules contain Windows native binaries and lack the Linux rolldown binding. The lockfile includes the Linux dependency; setup runs npm ci to install for the target OS.
- A Python dependency download was blocked by network timeout. Model/migration checks used pure-Python dependencies from the archive; full Django URL/API, PostgreSQL, storage, AI and browser integration remain untested.
- No remote database was accessed, and no deployment was performed.

Single-project revision:
- Added root static/Python builders, WSGI adapter and UTF-8 requirements entry.
- Removed separate frontend/backend Vercel configuration.
- Static assets resolve before React page fallback; missing asset URLs return 404.
- One domain and /api path are used throughout the local/deployed workflow.
- Verified Python syntax, configuration paths, route cases and WSGI adapter import using available Django dependencies. Live Vercel build remains untested.

Local environment revision: setup installs nodeenv and Node 22/npm into the Python .venv and invokes that npm with the venv first on PATH. Existing local Node is preserved on reruns. Setup script syntax checked; Windows installation was not executed here.
