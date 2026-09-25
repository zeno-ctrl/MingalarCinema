# Mingalar Cinema

A production-quality, full-stack movie ticket booking platform for a multi-branch
cinema chain in Myanmar, built with Next.js (App Router), TypeScript, Tailwind CSS,
Prisma, and PostgreSQL.

The brand — name, logo text, colors, hotline, and social links — is stored in the
database (see **Site Settings** in the admin dashboard) and editable without a
code change.

## Tech stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS, CSS variables for theming (light/dark)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth (Credentials + Google), argon2 password hashing, TOTP 2FA
- **Validation:** Zod on every API route
- **Payments:** Stripe (card) and KBZPay (QR/deep-link) behind a shared
  `PaymentProvider` interface, with a local mock adapter for development
- **Email:** Resend (falls back to console logging in development)
- **Images:** Cloudinary (falls back to pasting an image URL in the admin UI)
- **Testing:** Vitest, running against a real Postgres instance

## Project structure

```
prisma/
  schema.prisma        # full data model
  seed.ts               # sample branches/halls/movies/showtimes + first SUPER_ADMIN
src/
  app/
    (site)/             # customer-facing pages (home, movies, cinemas, profile, tickets)
    admin/(dashboard)/  # admin dashboard (movies, branches, halls, showtimes, ...)
    admin/setup-2fa/    # forced 2FA enrollment for admin accounts
    checkout/           # seat selection -> pay -> processing (booking flow)
    api/                # route handlers (customer, admin, checkout, webhooks)
  components/           # UI, booking, admin, layout, auth components
  lib/
    auth.ts             # NextAuth config
    seat-lock.ts         # atomic seat holding (double-booking prevention)
    payments/            # PaymentProvider interface + Stripe/KBZPay/mock adapters
    webhook-handler.ts   # shared, idempotent webhook processing
    validations/         # Zod schemas
tests/                  # Vitest suite (seat locking, webhooks, admin roles)
```

## Prerequisites

- Node.js 20+
- A PostgreSQL 14+ database (local, or a managed provider like [Neon](https://neon.tech)
  or [Supabase](https://supabase.com))

## Local setup

```bash
npm install
cp .env.example .env
# edit .env — at minimum set DATABASE_URL, NEXTAUTH_SECRET, APP_URL/NEXTAUTH_URL

npx prisma migrate dev
npm run db:seed

npm run dev
```

Then open <http://localhost:3000>.

The seed script creates:

- The first **SUPER_ADMIN** account (`SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`
  in your `.env`, defaults to `admin@cinetown.mm` / `ChangeMe123!` — **change
  this password in any shared environment**)
- A sample customer account (`customer@example.com` / `Customer123!`)
- Four branches (North Okkalapa, South Dagon, Insein, Tarmwe), each with two
  halls and a full seat layout
- Five movies (three Now Showing, two Coming Soon) and a week of showtimes
- A sample promotion and a `WELCOME20` promo code (20% off, min spend 6,000 Ks)

Admin accounts require two-factor authentication. Logging in as the seeded
super admin for the first time redirects to `/admin/setup-2fa`, where you scan
the QR code with any TOTP authenticator app (Google Authenticator, Authy,
1Password, etc.) and save the recovery codes shown afterward.

## Environment variables

See `.env.example` for the full list with inline comments. The important
groups:

| Group | Variables | Notes |
|---|---|---|
| Database | `DATABASE_URL` | Postgres connection string |
| Auth | `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `APP_URL` | `NEXTAUTH_SECRET`: `openssl rand -base64 32` |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional — "Continue with Google" is hidden if unset in your own OAuth consent screen, but the button still renders; leave blank to just not use it |
| Apple OAuth | `APPLE_ID`, `APPLE_SECRET` | Optional — requires a paid Apple Developer Program membership; `APPLE_SECRET` is a JWT you generate yourself (see comments in `.env.example`), not a static value |
| Email | `RESEND_API_KEY`, `EMAIL_FROM` | Without a key, emails are logged to the server console instead of sent |
| Images | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Without these, the admin image fields fall back to a "paste a URL" input |
| Stripe | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CURRENCY` | See **Payments** below |
| KBZPay | `KBZPAY_MERCHANT_ID`, `KBZPAY_APP_ID`, `KBZPAY_MERCHANT_KEY`, `KBZPAY_BASE_URL` | See **Payments** below |
| Rate limiting | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Optional — falls back to an in-memory limiter (fine for a single dev server, **not** safe across multiple serverless instances in production) |

## Authentication & roles

- **USER**: can browse everything without an account; needs one to book.
  Sign-up asks for name, email, optional phone, and password; email
  verification is required before first login (the link is emailed via
  Resend, or logged to the console in development).
- **ADMIN / SUPER_ADMIN**: created only via invite (`Admin Invites` in the
  dashboard, super-admin only) — there is no public admin signup. Invite
  links expire after 48 hours. Every admin account must enroll in TOTP 2FA
  before it can do anything else in `/admin`.
- **CASHIER**: staff role for the `/cashier` ticket-counter dashboard (see
  **Reservations & cashier counter** below). A super-admin promotes an
  existing account to `CASHIER` from `Users` in the admin dashboard. Unlike
  ADMIN/SUPER_ADMIN, cashiers aren't required to enroll in 2FA.
- Sessions are JWT-based (required by NextAuth's Credentials provider) but
  carry a `sessionVersion` that's checked against the database on every
  request, so disabling an account, changing its role, or using "Log out of
  all devices" (Profile page) takes effect immediately rather than waiting
  for the token to expire.

## Reservations & cashier counter

Booking a showtime always creates a `Booking` reserved for **2 hours**
(`RESERVATION_WINDOW_MS` in `src/lib/booking.ts`) before it's automatically
released back to other customers — the seat-availability queries already
treat an expired `PENDING` booking as inactive, and `expireStaleBookings()`
lazily flips its status the next time anyone checks. A single booking is
capped at **5 seats** (`MAX_SEATS_PER_BOOKING` in `src/lib/constants.ts`).

At checkout, alongside paying immediately by Card or KBZPay, customers can
choose **Reserve & Pay Later**: this creates the booking and hands back its
code (e.g. `MC-AB12-CD34`) right away without charging anything. That code
can then be used to pay two ways, whichever is more convenient:

- **Online, later**: open `/my-tickets/<reference>` (linked from "My
  Tickets") and pay by Card or KBZPay from there.
- **In person**: a cashier looks the code up under `/cashier` → "Pay a
  reservation" and confirms cash payment.

The `/cashier` dashboard (CASHIER/ADMIN/SUPER_ADMIN only) also supports
walk-in sales for customers with no account: pick a showtime, select seats,
take the customer's name/phone, and complete a cash sale — this creates an
already-`PAID` booking directly (no reservation window) and shows a
printable ticket (QR + PDF) immediately.

## Payments

Card and KBZPay both sit behind one `PaymentProvider` interface
(`src/lib/payments/types.ts`). Three adapters implement it:

- **Stripe** (`stripe.ts`) — real sandbox integration via PaymentIntents and
  Stripe Elements. Stripe doesn't support MMK; `STRIPE_CURRENCY` (default
  `usd`) picks a currency your Stripe account supports for the sandbox. A
  production deployment settling in MMK should swap in a regional gateway
  (e.g. 2C2P) behind the same interface instead.
- **KBZPay** (`kbzpay.ts`) — shaped to KBZPay's commonly published merchant
  pattern (sorted-params + merchant-key MD5 signing for both order creation
  and webhook verification). **Confirm the exact request/response field
  names against the merchant integration guide KBZ Bank provides** once you
  have real UAT credentials, and adjust `sign()`/the request payload in that
  file to match — everything else (booking state machine, webhook
  idempotency) is unaffected by that adjustment.
- **Mock** (`mock.ts`) — used automatically whenever real keys aren't
  configured, so the full booking flow works out of the box. It still goes
  through a real HMAC-signed webhook round-trip (not a shortcut), so the
  code path it exercises is the same one that runs with real providers. The
  "Simulate payment" buttons only work when a booking's `Payment` row is
  provider `MOCK` — once real Stripe/KBZPay keys are set, new bookings get a
  real `Payment` row instead and the simulate endpoint has nothing to act on
  for them, so it can't be used to fake a real payment.

Switching from "no keys" to sandbox, or from sandbox to live, is **only** an
environment variable change (see `src/lib/payments/index.ts`) — no
application code differs.

**Payments are confirmed only by a signature-verified webhook**, never by the
browser's return redirect, and processing the same webhook twice is a safe
no-op. Point your provider's webhook at:

```
https://<your-domain>/api/webhooks/stripe
https://<your-domain>/api/webhooks/kbzpay
```

For local testing with real Stripe sandbox keys, use the
[Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Running tests

```bash
npm run db:seed   # tests assume seed data exists
npm test
```

The suite runs against your real `DATABASE_URL` (no mocking) because the
properties under test — that a seat can never be double-booked under
concurrent requests, and that a forged or replayed payment webhook can never
confirm a booking — are exactly the kind of thing an in-memory mock would
hide. Each test cleans up the rows it creates.

Covered:

- **Seat locking** (`tests/seat-lock.test.ts`): 20 concurrent requests for the
  same seat produce exactly one winner; expired holds are reclaimable;
  a live hold blocks everyone but its owner; a seat already on a PAID
  booking can never be held.
- **Webhooks** (`tests/webhook.test.ts`): a forged/wrongly-signed webhook
  (including a Stripe event signed with the wrong secret) is rejected
  outright; a valid webhook delivered twice only confirms the booking once;
  a FAILED webhook cancels the booking so the seat frees up.
- **Admin role protection** (`tests/admin-role-protection.test.ts`): the
  role-ranking logic every `requireApiRole`/`requirePageRole` guard depends
  on.

## Deployment (Vercel + managed Postgres)

1. **Database**: create a Postgres instance on [Neon](https://neon.tech) or
   [Supabase](https://supabase.com) and copy its connection string.
2. **Deploy**: import the repo into [Vercel](https://vercel.com), set the
   environment variables from `.env.example` in the project settings
   (`NEXTAUTH_URL`/`APP_URL` should be your production domain), and deploy.
3. **Migrate**: run `npx prisma migrate deploy` against the production
   database (e.g. from your local machine with `DATABASE_URL` pointed at
   production, or as a Vercel build step) before the first deploy serves
   traffic.
4. **Seed** (optional, first deploy only): `npm run db:seed` against the
   production database to create the first SUPER_ADMIN and sample data — or
   skip the sample branches/movies/showtimes and just create the super admin
   manually if you don't want demo content in production.
5. **Webhooks**: point Stripe's and KBZPay's dashboards at
   `https://<your-domain>/api/webhooks/stripe` and `/api/webhooks/kbzpay`.
6. **OAuth**: add `https://<your-domain>/api/auth/callback/google` as an
   authorized redirect URI in the Google Cloud Console, and (if using Apple)
   `https://<your-domain>/api/auth/callback/apple` as the Return URL on your
   Apple "Sign in with Apple" Services ID.

## Security notes

- Every mutating API route re-checks the caller's session and role itself
  (`requireApiRole`/`requireApiUser`), independent of the edge middleware —
  admin protection never relies on the UI or middleware alone.
- Seat double-booking is prevented by a single atomic
  `INSERT ... ON CONFLICT` SQL statement, not an application-level
  check-then-write (see `src/lib/seat-lock.ts`).
- Passwords are hashed with argon2; TOTP secrets are encrypted at rest
  (AES-256-GCM, keyed off `NEXTAUTH_SECRET`); recovery codes are stored
  hashed.
- Rate limiting covers login (both per-IP and the existing per-account
  lockout), OTP verification, signup, password reset, and payment/booking
  creation endpoints.
- CSRF: the session cookie is `SameSite=Lax` (NextAuth's default), and the
  edge middleware additionally rejects any mutating (`POST`/`PUT`/`PATCH`/
  `DELETE`) request to our own `/api/**` routes whose `Origin` header doesn't
  match our own origin — except `/api/auth/**` (NextAuth manages its own CSRF
  token) and `/api/webhooks/**` (real providers call those from their own
  servers; those are protected by signature verification instead).
- Security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy,
  Permissions-Policy) are set in `next.config.mjs`.
- **Known residual risk**: `next-auth@4`/`@auth/core` currently have a small
  number of upstream advisories with no fix published yet at the time of
  writing (see `npm audit`) — an email-normalization edge case and an
  OAuth-state-binding edge case. This app mitigates the practical impact by
  normalizing/lowercasing all emails itself before any lookup (see
  `normalizeEmail()`) and by only enabling one OAuth provider (Google),
  which removes the multi-provider state-confusion scenario the advisory
  describes. Re-run `npm audit` before going to production and upgrade once
  a fix ships.

## What's stubbed vs. real

Everything above is implemented and tested against a real running server
except:

- **Real Stripe/KBZPay credentials**: this environment has no network access
  to external payment sandboxes, so end-to-end testing used the built-in
  Mock provider (which exercises the identical webhook-verification and
  booking-confirmation code paths). Wire up real sandbox keys and it should
  work unchanged — the KBZPay field names are worth double-checking against
  the real merchant guide first (see **Payments** above).
- **Cloudinary image uploads**: without real Cloudinary credentials, the
  admin UI's "Choose File" upload button will show a friendly error and you
  paste an image URL instead (fully functional, just not exercising the
  actual Cloudinary API call).
- **Google OAuth**: needs a real Google Cloud OAuth client to test
  end-to-end; the email/password flow was used for all local testing.
