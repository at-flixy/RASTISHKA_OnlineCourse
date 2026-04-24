# RASTISHKA Online Course

Next.js 16 + Prisma + PostgreSQL project with Freedom Pay and Stripe payments, plus Railway deployment.

## Local development

Requirements:

- Node.js 24
- PostgreSQL
- `.env` with `DATABASE_URL`

Commands:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## Railway deployment

Production deployment is configured for Railway via:

- [railway.toml](/C:/Users/Lenovo/Desktop/RASPROD/RASTISHKA_OnlineCourse/railway.toml:1)
- [Dockerfile](/C:/Users/Lenovo/Desktop/RASPROD/RASTISHKA_OnlineCourse/Dockerfile:1)
- [start.sh](/C:/Users/Lenovo/Desktop/RASPROD/RASTISHKA_OnlineCourse/start.sh:1)

The container build runs `npm run build`.
At boot, `start.sh` applies Prisma migrations with `npm run db:migrate:deploy` and then starts the standalone Next.js server.

## Required environment variables

Core:

- `AUTH_SECRET`
- `AUTH_TRUST_HOST=true`
- `SITE_URL`
- `NEXT_PUBLIC_APP_URL`
- `FREEDOMPAY_MERCHANT_ID`
- `FREEDOMPAY_SECRET_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

Operational:

- `GETCOURSE_ACCOUNT`
- `GETCOURSE_API_KEY`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Railway Postgres provides `DATABASE_URL` automatically when the `Postgres` service is attached.

## Freedom Pay setup

This project uses hosted Freedom Pay redirect flow as the default payment method.

Set the following environment variables:

- `FREEDOMPAY_MERCHANT_ID`
- `FREEDOMPAY_SECRET_KEY`

Configure the merchant callbacks in the Freedom Pay init request or merchant cabinet:

- Result URL: `https://<your-domain>/api/freedompay/result`
- Success URL: `https://<your-domain>/checkout/success`
- Failure URL: `https://<your-domain>/checkout/cancel`

The app treats `Result URL` and `get_status3.php` reconciliation as the source of truth for payment confirmation.

## Stripe setup

Stripe remains available as a secondary checkout provider via hosted [Stripe Checkout](https://docs.stripe.com/payments/checkout).

Create a webhook endpoint:

- URL: `https://<your-domain>/api/stripe/webhook`
- Events:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `payment_intent.payment_failed`

Put the signing secret into `STRIPE_WEBHOOK_SECRET`.

## Go-live checklist

- Confirm Freedom Pay merchant credentials, callback URLs, and supported currencies (`KGS`, `USD`) in production.
- Test Freedom Pay successful payment, failed payment, cancellation, and callback/status reconciliation flows.
- Confirm the Stripe account is activated in a supported country and can accept live card payments.
- Configure business details, support email, statement descriptor, and Checkout branding in Stripe Dashboard.
- Verify `SITE_URL` and `NEXT_PUBLIC_APP_URL` point to the production domain.
- Test successful payment, failed payment, cancellation, and 3D Secure flows in Stripe.
- Verify post-payment emails and GetCourse access sync from Railway production logs.
