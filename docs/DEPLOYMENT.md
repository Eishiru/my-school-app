# Vercel deployment

Use ONE Git repository and TWO Vercel projects. Do not copy the old root vercel.json or manually copy frontend/dist into Django. Commit the source and lockfile; Vercel builds the frontend itself.

## 1. Backend project

Import the repository into Vercel with Root Directory = backend. Use Django framework detection. Leave build/output defaults unless Vercel asks for an override; do not set the backend output directory to frontend/dist. backend/manage.py and backend/backend/wsgi.py are the Django entry points. The .python-version file pins Python 3.12.

Set the following environment variables for the deployment environment you will use (Production and/or Preview):

| Variable | Value |
| --- | --- |
| DJANGO_DEBUG | false |
| DJANGO_SECRET_KEY | New random secret; generate with `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| DATABASE_URL | PostgreSQL connection URL from Supabase; use a supported pooler connection and URL-encode special password characters |
| DATABASE_SSL_REQUIRED | true |
| DJANGO_ALLOWED_HOSTS | Backend's stable hostname only, e.g. school-api.vercel.app; comma-separated for multiple hosts |
| DJANGO_CORS_ALLOWED_ORIGINS | Frontend's exact HTTPS origin, e.g. https://school-ui.vercel.app |
| DJANGO_CSRF_TRUSTED_ORIGINS | Frontend's exact HTTPS origin |
| OPENAI_API_KEY | Your backend-only key if you use AI features |
| OPENAI_MODEL | Your desired supported model; existing model default is preserved |

The current deployment hostname from VERCEL_URL is also allowed. Add your stable custom/production hostname explicitly. For preview testing, add the exact preview frontend origin to CORS/CSRF settings. Do not use '*' for authenticated school data.

## 2. Persistent uploads (required for the Vercel backend)

Create a private Supabase Storage bucket and obtain S3 access credentials in Supabase Storage settings. Set on the BACKEND project:

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

## 4. Frontend project

Import the same repository as another Vercel project:

| Setting | Value |
| --- | --- |
| Root Directory | frontend |
| Framework | Vite |
| Install Command | npm ci |
| Build Command | npm run build |
| Output Directory | dist |
| Node.js | 22.x |
| VITE_API_BASE_URL | https://YOUR-BACKEND.vercel.app/api |

Set the variable before building. frontend/vercel.json sends client-side page routes to index.html and leaves assets/API paths out of that fallback. The frontend's /api path is only proxied in LOCAL Vite development; deployed frontend API calls use the full backend URL above.

Update the backend CORS/CSRF origins with the frontend's final URL, then redeploy the backend. Environment changes only affect new deployments. Confirm your configured Git branch matches the branch containing this code.

## 5. Verify

- Backend /api/health/ returns {"status":"ok"}. This checks process availability, not database connectivity.
- Frontend CSS and JS requests return 200 with correct content types.
- Login Network requests go to your backend HTTPS domain, never 127.0.0.1.
- Login and a subject-list request work (these exercise the database).
- Refresh a nested React page and confirm it loads.
- Upload/download a test attachment and check the private bucket.
- Check browser Console and Vercel runtime logs for errors.

A 401 from an authenticated endpoint without a token is expected. A CORS error requires matching the exact FRONTEND origin in BACKEND CORS settings. A settings error about missing DATABASE_URL, secret or bucket means backend environment variables are incomplete.

## Official references

- https://vercel.com/templates/backend/django-hello-world
- https://vercel.com/docs/functions/runtimes/python
- https://vite.dev/guide/env-and-mode
- https://vite.dev/config/server-options
- https://supabase.com/docs/guides/storage/s3/authentication
- https://django-storages.readthedocs.io/en/latest/backends/amazon-S3.html
