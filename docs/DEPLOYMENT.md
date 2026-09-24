# One Vercel project: React + Django

Use one repository, one Vercel project and one public domain. Upload the CONTENTS of this folder to the repository root, replacing the old configuration. Keep frontend/ and backend/ as subfolders. Do not deploy either folder separately.

## 1. Project settings

| Setting | Value |
| --- | --- |
| Root Directory | Repository root (leave blank; NOT frontend or backend) |
| Framework Preset | Other |
| Node.js | 22.x |
| Install / Build / Output overrides | Disable old dashboard overrides; root vercel.json defines both builders |
| VITE_API_BASE_URL | /api, or leave unset |

The root vercel.json uses explicit builders because this project contains both a static frontend and a Python application. A notice that dashboard build settings are ignored because builds is present is expected. The static builder runs the root vercel-build script, installs frontend dependencies with npm ci, and publishes frontend/dist. The Python builder packages api/index.py and backend/ with dependencies from the root UTF-8 requirements.txt. Python is pinned to 3.12 at the root.

Do not retain the previous frontend-only vercel.json, old catch-all Django rewrite, or external VITE_API_BASE_URL. Select the Git branch containing these changes and redeploy.

Set these environment variables on this single project for Production and any Preview environments you use:

| Variable | Value |
| --- | --- |
| DJANGO_DEBUG | false |
| DJANGO_SECRET_KEY | New secret, generated with python -c "import secrets; print(secrets.token_urlsafe(64))" |
| DATABASE_URL | Supabase PostgreSQL connection URL; URL-encode password special characters |
| DATABASE_SSL_REQUIRED | true |
| DJANGO_ALLOWED_HOSTS | Your stable hostname, e.g. school.vercel.app; comma-separated for additional hosts |
| DJANGO_CSRF_TRUSTED_ORIGINS | Your HTTPS origin, e.g. https://school.vercel.app |
| OPENAI_API_KEY | Backend-only key if you use AI features |
| OPENAI_MODEL | Your supported model, if overriding the existing default |

VERCEL_URL automatically allows the current deployment hostname. Same-origin API requests need no cross-origin CORS entry. Never put secrets into VITE_ variables. Local .env files are excluded from deployment.

## 2. Persistent uploads (required for the Vercel backend)

Create a private Supabase Storage bucket and obtain S3 access credentials in Supabase Storage settings. Set on the SAME Vercel project:

| Variable | Value |
| --- | --- |
| AWS_STORAGE_BUCKET_NAME | Existing private bucket name |
| AWS_ACCESS_KEY_ID | Supabase S3 access key ID |
| AWS_SECRET_ACCESS_KEY | Supabase S3 secret access key |
| AWS_S3_ENDPOINT_URL | Exact S3 endpoint shown by Supabase, e.g. https://PROJECT_REF.storage.supabase.co/storage/v1/s3 |
| AWS_S3_REGION_NAME | Region shown for your project |

These are S3 credentials, not frontend publishable/anon keys. Uploaded-file URLs are signed and expire after one hour; refresh the page to obtain a new URL. Files remain private in the bucket. Test upload, download and delete before using real student work. Django uses filesystem media locally unless these variables are set. The Vercel configuration intentionally refuses to start without a bucket rather than attempting nonpersistent local uploads.

For existing files referenced by your database, copy the contents of the original media directory into the bucket preserving their relative paths. The code does not automatically migrate files.

## 3. Apply database migrations deliberately

Use a trusted local terminal with backend/.env temporarily pointing at the intended deployment database:

```bash
python scripts/backend.py showmigrations
python scripts/backend.py migrate
```

Back up existing data first. Create the first admin with createsuperuser only if needed. Migrations are NOT run at every build or server startup. Restore your local database environment afterwards.

## 4. Request routing

| Request | Destination |
| --- | --- |
| /api/... | Django WSGI function, with original request path |
| /media/... | Django; local files only work locally, production uploads use signed storage URLs |
| Existing CSS, JS, images | Built React static files |
| Missing /assets/... or file URLs | 404 instead of the React HTML page |
| React page routes | index.html for client-side routing |

Django's API is consumed by React; this configuration does not publish the optional Django browsable API stylesheet bundle. It does not affect the React interface.

## 5. Local development

Follow the root README. Run Django with python scripts/backend.py runserver and React with npm run dev in separate terminals. Open http://localhost:5173; Vite proxies /api and /media to Django. Two local processes provide hot reload while production uses one Vercel project. No source URL edits are needed between environments.

## 6. Verify after deployment

- /api/health/ returns {"status":"ok"}; this checks startup, not database connectivity.
- CSS and JS requests return 200 with appropriate content types.
- Login requests use https://YOUR-SITE.vercel.app/api/... on the same domain.
- Login and subject lists load, exercising the database.
- Refresh a nested React page and confirm it loads.
- Upload/download a test attachment through private storage.
- Check Vercel runtime logs for missing environment variables or other errors.

An unauthenticated API request may return 401. Use runtime logs to diagnose missing database, secret or storage configuration. Database migrations are never run automatically at build time.

## References

- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/functions/runtimes/python
- https://vite.dev/config/server-options
- https://supabase.com/docs/guides/storage/s3/authentication
