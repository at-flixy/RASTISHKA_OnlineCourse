# RASTISHKA Online Course

Next.js 16 + Prisma + PostgreSQL project for deployment on Heroku.

## Local Development

Requirements:

- Node.js 20
- PostgreSQL
- `DATABASE_URL` in `.env`

Commands:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## Heroku Deployment

The app is configured for Heroku via:

- [Procfile](/Users/amirhanordobaev/DataspellProjects/RASTISHKA_OnlineCourse/Procfile:1)
- [app.json](/Users/amirhanordobaev/DataspellProjects/RASTISHKA_OnlineCourse/app.json:1)
- Prisma release phase with automatic seed on first deploy

### Required config vars

- `AUTH_SECRET`
- `SITE_URL`

Recommended:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `NEXT_PUBLIC_APP_URL`

Heroku Postgres provides `DATABASE_URL` automatically.

### First deploy behavior

During the `release` phase Heroku runs:

```bash
npm run db:setup
```

That command:

1. Applies Prisma migrations
2. Seeds the database
3. Creates the admin user if it does not exist yet

If `ADMIN_PASSWORD` is set, an existing admin password is updated to that value on deploy.
If `ADMIN_PASSWORD` is not set, an existing admin password is left unchanged.

### Create the app

```bash
heroku create
heroku addons:create heroku-postgresql:essential-0
heroku config:set AUTH_SECRET="$(openssl rand -base64 32)"
heroku config:set SITE_URL="https://<your-app>.herokuapp.com"
heroku config:set NEXT_PUBLIC_APP_URL="https://<your-app>.herokuapp.com"
heroku config:set ADMIN_EMAIL="admin@example.com"
heroku config:set ADMIN_PASSWORD="<strong-password>"
git push heroku main
```

### Notes

- Public Prisma-backed pages are forced to runtime rendering so `next build` does not require a live database.
- Database connections are normalized with `sslmode=require`, which matches Heroku Postgres expectations.
- The app starts with `npm start` and listens on the Heroku-provided `PORT`.
