# Backend architecture

Node.js 24 + Express 5 + PostgreSQL. This API is the **only** component that touches the database. The mobile app (`../app`, React Native) and the admin dashboard (`../web`, Next.js) are clients of `/api/v1` only.

```
app (React Native) ─┐
                    ├──HTTPS──▶  backend (Express)  ──▶  PostgreSQL
web (Next.js)  ─────┘                 │
                                      ├──▶ media storage (disk or S3)
                                      └──▶ email / SMS / push providers (via the outbox job)
```

## Where things live

| Path | Responsibility |
|---|---|
| `src/server.js` | Starts the HTTP server and background jobs; graceful shutdown |
| `src/config.js` | Reads environment variables; refuses unsafe production settings |
| `src/app.js` | Composition root: middleware (security headers, CORS, rate limits, auth), the shared `ctx`, route registration, error handler |
| `src/routes/*.js` | One file per area. Each exports `publicRoutes(app, ctx)` (no sign-in) and/or `routes(app, ctx)` (signed in) |
| `src/validation.js` | Every request body/query schema (zod), access rules (`canRead`), API views of rows |
| `src/security.js` | Password hashing (scrypt), tokens, one-time codes, the user view |
| `src/settings.js` | Dashboard-managed settings and encrypted provider keys (registry + storage + history) |
| `src/notify.js`, `src/messages.js` | Creating notifications in the user's language and queueing push/email/SMS |
| `src/delivery.js` | Provider transports (SMTP, Twilio, Expo push) |
| `src/jobs.js` | Background work: delivery with retries, deadline escalation, reminders, cleanup |
| `src/media-store.js` | Photo validation/re-encoding and disk/S3 storage |
| `src/db.js` | Connection pool, serialisable transactions with retry, migration runner |
| `migrations/` | `001_schema.sql` is the full schema, sectioned and commented |

## Route areas

| File | Area | Who |
|---|---|---|
| `auth.js` | Register, sign-in (password or code), verification, password reset, account, sessions, export, deletion | Everyone |
| `complaints.js` | Photos, reports, assignment, status changes, analytics, CSV export | Citizens, officers, minister, admin |
| `engagement.js` | Ideas and Jan Samvad appointments | Citizens, officers, admin |
| `content.js` | Published announcements/projects/photos (public) and editing (admin) | Public / admin |
| `notifications.js` | In-app notifications, push tokens, preferences | Signed in |
| `work.js` | "What is waiting on me" counts for the app's Today screen | Officers, minister |
| `admin.js` | Staff accounts, audit log, categories, wards, offices | Admin (web dashboard) |
| `dashboard.js` | App configuration, provider keys, system health, message log, password resets | Admin (web dashboard); `/config` is public |

## Rules every route follows

- **Validate first:** `parse(schema, req.body)` with a zod schema from `validation.js`. Unknown fields are rejected.
- **Authorise on the server:** `roles(...)` for who may call it; `canRead` / jurisdiction scope for which rows. The client never decides access.
- **Change state in a transaction:** `db.transaction(async query => …)`. Updates quote the row `version` so two people can't overwrite each other.
- **Record it:** administrative actions call `audit(...)`; user-visible changes call `notifier.notify(...)` in the same transaction.
- **Errors:** throw `ApiError(status, CODE, message)`. Every code has a Hindi translation in the app (a test fails if one is missing).

## Extending

- **New endpoint:** add it to the matching `src/routes/*.js` (or a new file registered in `app.js`), with a schema in `validation.js` and a test in `tests/`.
- **New dashboard setting:** add one entry to `definitions` in `src/settings.js` (schema + default). The API validates and stores it; read it with `settings.get(name)`.
- **New provider key:** add a `secrets` schema to its `integration.*` definition; it is stored encrypted automatically.
- **Schema change:** add `migrations/002_<what>.sql`. Never edit `001_schema.sql` after it has been deployed. Migrations run automatically at start-up, once, under a lock.
- **New background job:** add a function to `createJobs` in `src/jobs.js`; it must be safe if two servers run it at once (use conditional updates such as `WHERE … AND reminder_sent_at IS NULL`).

## Checks

`npm run check` (syntax), `npm run format:check` (Prettier), `npm test` (PostgreSQL integration tests in isolated schemas).
