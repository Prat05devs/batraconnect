# Batra Connect backend

Independent Node 24 / Express 5 JavaScript service. Deploy this directory separately from `../app`.

## Run locally

```sh
cd backend
nvm use
npm ci
cp .env.example .env
# Set DB_PASSWORD and the matching password in DATABASE_URL.
docker compose -p batra-connect -f compose.yaml -f compose.dev.yaml up -d db
npm start
```

PostgreSQL is required in every environment. The development container stores data in a persistent volume and publishes PostgreSQL on localhost port 5433. Set `DATABASE_URL` to this database or your managed PostgreSQL instance. The schema is applied transactionally at startup; `npm run migrate` also applies it. Database credentials and `.env` are not committed.

- Liveness: `GET /health/live`
- Readiness / database check: `GET /health/ready`
- API prefix: `/api/v1`
- Development address: `http://127.0.0.1:4000`

Set `EXPO_PUBLIC_API_URL` in the app to this server. iOS Simulator and web can use `127.0.0.1`; Android Emulator uses `10.0.2.2`. Physical phones need the computer's LAN address and a backend listening on that interface. Public deployments require HTTPS.

## What the API provides

- **Identity:** citizen registration with email verification; optional mobile number with SMS verification; sign-in by password or one-time code (email or verified mobile); forgot/reset password; profile, email and password changes; device sessions with "sign out others"; account data export; and account deletion (anonymised). Citizens must verify a contact before sending reports, ideas or bookings.
- **Staff administration:** administrators invite staff (they set their own password from an emailed code), change roles, grant several district + category jurisdictions, and suspend or reactivate accounts. Every change goes to an append-only audit log. Roles are `field`, `department`, `executive` and `admin`.
- **Reports:** categories with service deadlines (SLA hours), including four Roorkee municipal categories. Reports carry Uttarakhand district validation, a Roorkee ward and optional GPS. Responsible-office routing picks the most specific match: ward + category, ward, district + category, then district.
- **Report search:** server-side search and filters (status, category, ward, district, past deadline, escalated, assigned to me, date range), sorting by deadline, and pagination.
- **Report workflow:** workload-aware assignment and reassignment, version-checked transitions, and mandatory closure photos. Reopening resets the deadline. Escalation runs automatically in three levels.
- **Ideas:** citizens submit; the office reviews, replies (publicly or internally) and moderates (hides).
- **Jan Samvad:** the office publishes sessions with capacity. Citizens book, reschedule and cancel; the office confirms or declines and records attendance. Booking the last place is race-safe, and reminders go out 24 hours ahead.
- **Content administration:** bilingual announcements, projects, achievements, profiles, photos, schemes and services. Drafts are versioned, with publish and archive; only published photos are publicly readable.
- **Notifications:** in-app notifications plus push (Expo), email (SMTP) and SMS (Twilio). Each user sets channel preferences and gets messages in their app language. Delivery goes through a retrying outbox.
- **Staff "work" summary:** counts what each role must act on, which drives the app's Today screen. Executive analytics cover trends, department and district comparisons, deadline compliance, and a CSV export with no personal data.
- **Hardening:**
  - full image decoding and re-encoding with EXIF/GPS removed; an upload quota and orphan cleanup
  - filesystem or S3-compatible media storage
  - PostgreSQL-backed rate limits shared across replicas
  - versioned migrations safe across replicas
  - production configuration validation
  - JSON request logs and Prometheus `/metrics`
  - Caddy HTTPS, nightly backups and a restore-check script

Deployment, first-day setup, monitoring and incident steps are in [docs/operations.md](docs/operations.md).

## Workflow contract v0.1

This is a newly implemented application policy, not a recovered original government contract:

1. Citizen submits: `Submitted`.
2. Department/admin assigns a field officer in the same district/category: `Assigned`.
3. Assigned field officer or responsible department/admin starts work: `In progress`.
4. Responsible staff submits a resolution explanation: `Resolved`.
5. Citizen accepts: `Closed`, or requests another review: `Reopened`.
6. Staff can reassign or resume reopened work.

Each staff mutation carries the current `version`; stale changes return HTTP 409. Invalid role/state changes are rejected. Counts and queues respect the authenticated user's scope. Exact municipal ward boundaries, escalations, SLA policy and mandatory closure-photo rules remain later delivery work.

## Endpoints (all under `/api/v1`)

| Area | Routes |
|---|---|
| Public | `GET districts`, `categories`, `wards`, `offices`, `content`, `content/:type/:slug`, `public/media/:id` |
| Sign-in | `POST auth/register`, `auth/login`, `auth/otp/request`, `auth/otp/verify`, `auth/password/forgot`, `auth/password/reset` |
| Account | `GET auth/me`, `POST auth/logout`, `POST auth/verify/request`, `auth/verify/confirm`, `PATCH account`, `POST account/password`, `GET account/sessions`, `POST account/sessions/revoke-others`, `GET account/export`, `DELETE account` |
| Reports | `POST media`, `GET media/:id`, `POST complaints` (Idempotency-Key), `GET complaints`, `GET complaints/:id`, `GET staff`, `POST complaints/:id/assign`, `POST complaints/:id/status` |
| Staff | `GET work`, `GET insights`, `GET insights/export.csv` |
| Ideas | `POST ideas`, `GET ideas`, `GET ideas/:id`, `POST ideas/:id/review` |
| Jan Samvad | `GET/POST appointments/slots`, `DELETE appointments/slots/:id`, `POST appointments`, `GET appointments`, `GET appointments/:id`, `POST appointments/:id/cancel`, `…/reschedule`, `…/decision` |
| Notifications | `GET notifications`, `POST notifications/:id/read`, `POST notifications/read-all`, `POST/DELETE push-tokens`, `GET/PUT notification-preferences` |
| Administration | `GET/POST admin/users`, `PATCH admin/users/:id`, `POST admin/users/:id/invite`, `GET admin/audit`, `GET/POST admin/categories`, `PATCH admin/categories/:name`, `PATCH admin/wards/:id`, `POST admin/offices`, `PUT admin/offices/:id`, `GET/POST admin/content`, `PUT admin/content/:id` |

Every route checks its role and data scope on the server. Request shapes are the zod schemas in `src/validation.js`; see [docs/architecture.md](docs/architecture.md) for the code layout and how to extend it.

## Deploy independently

A Dockerfile and `compose.yaml` are included. Provide a URL-safe strong `DB_PASSWORD`, exact `CORS_ORIGINS`, and `TRUST_PROXY_HOPS` for your actual reverse proxy. Compose binds the API to localhost for a same-host HTTPS reverse proxy; PostgreSQL is not published on a host port.

```sh
cd backend
# Set DB_PASSWORD and CORS_ORIGINS through your deployment secrets.
docker compose up -d --build
```

Keep both database and media volumes persistent and backed up. Ephemeral serverless filesystems are unsuitable for the filesystem media adapter. A managed PostgreSQL URL also works; database TLS follows its connection configuration without disabling certificate verification. The app deploys separately with the API URL set at build time.

## Verification

```sh
npm run check
cp .env.test.example .env.test   # point TEST_DATABASE_URL at an isolated PostgreSQL database — never production
npm test
```

There are 21 PostgreSQL integration tests. Each runs in its own temporary schema and covers:
- identity: verification gating, code brute-force lockout, reset, OTP, sessions, export and deletion
- staff administration and audit
- multiple jurisdictions, ward routing, offices, SLA deadlines and escalation fan-out
- filters and workload
- closure evidence
- ideas and moderation
- appointment capacity under concurrent booking, rescheduling, reminders and slot cancellation
- content versioning and publishing
- delivery retries and preferences
- EXIF removal and orphan cleanup
- analytics and CSV scope
- the role work summary
- upgrading a first-release database in place
- production configuration validation

## Not provided by this code

These need accounts or decisions from the delivery owners:
- hosting, the domain and DNS
- SMTP, SMS/DLT and push credentials
- real staff identities and verified Roorkee ward names
- official service-level hours
- any connection to an external government grievance system

A `BC-…` receipt confirms receipt by Batra Connect only. HEIC uploads are not decoded (the apps send JPEG). Malware scanning of uploads is replaced by full image re-encoding.
