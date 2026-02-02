# Deploy ONLYOFFICE on Railway

## Option A: Railway template (fastest)
1) Deploy ONLYOFFICE using Railway’s template:
   https://railway.com/deploy/onlyoffice
2) Open the service → Settings → Networking → Generate Domain.
3) Set the ONLYOFFICE service env vars:

```
JWT_ENABLED=true
JWT_SECRET=your-strong-secret
JWT_HEADER=Authorization
JWT_IN_BODY=true
```

## Option B: Docker image service
1) Railway → Project → Add a Service → Docker Image.
2) Image: `onlyoffice/documentserver:latest`.
3) Generate Domain in Networking.
4) Set env vars (same as above).

## App env vars (web app)
Set these on your web app service:

```
VITE_ONLYOFFICE_URL=https://your-onlyoffice-service.up.railway.app
VITE_ONLYOFFICE_SIGN_URL=https://your-supabase-project.functions.supabase.co/onlyoffice-sign
```

## Health check
Open:

```
https://your-onlyoffice-service.up.railway.app/healthcheck
```

You should get 200 OK when the doc server is running.

## Notes
- Document URLs must be publicly accessible (Supabase public bucket) for ONLYOFFICE to load them.
- The ONLYOFFICE JWT secret should be set in Supabase for the signer function.
