# ONLYOFFICE setup

This app uses ONLYOFFICE Docs for in-browser editing of Word/Excel/PowerPoint and PDFs.

## Local Docker

1) Create a secret (use a strong value in production):

```
export ONLYOFFICE_JWT_SECRET=change-me
```

2) Start ONLYOFFICE:

```
docker compose -f docker-compose.onlyoffice.yml up -d
```

3) Configure the app:

```
VITE_ONLYOFFICE_URL=http://localhost:8080
VITE_ONLYOFFICE_SIGN_URL=http://localhost:54321/functions/v1/onlyoffice-sign
```

## Railway deployment

1) Deploy ONLYOFFICE Docs as a Docker service.
2) Set the environment variables in Railway:

```
ONLYOFFICE_JWT_SECRET=your-strong-secret
```

3) Set the app env vars in Railway for the web app:

```
VITE_ONLYOFFICE_URL=https://your-onlyoffice-service.up.railway.app
VITE_ONLYOFFICE_SIGN_URL=https://your-supabase-project.functions.supabase.co/onlyoffice-sign
```

4) Deploy the Supabase Edge Function:

```
supabase functions deploy onlyoffice-sign
```

## Notes

- The ONLYOFFICE JWT secret is used to sign editor configs.
- The document URLs must be publicly accessible (Supabase public bucket) for ONLYOFFICE to load them.
- Deploy the `onlyoffice-sign` Edge Function in Supabase with `ONLYOFFICE_JWT_SECRET` set.
