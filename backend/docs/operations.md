# Operations runbook

For the person deploying and running the Batra Connect API. Everything here is in this folder; nothing depends on the app folder.

## 1. Before first deployment — decisions and accounts you must provide

| Item | Why | Where it goes |
|---|---|---|
| A Linux host with Docker and root access (2 vCPU / 4 GB is ample to start; 2 GB works), e.g. a DigitalOcean droplet (Ubuntu 26.04 LTS) — see section 9 | Runs API, PostgreSQL, backups and the shared Caddy proxy | — |
| A random master key (`openssl rand -base64 48`), stored safely outside the server too | Encrypts provider keys saved in the dashboard; the API refuses to start without it | `CONFIG_MASTER_KEY` |
| The web dashboard's address, e.g. `https://admin.batraconnect.com` | Only listed web origins may call the API from a browser | `CORS_ORIGINS` |
| API domain, e.g. `api.batraconnect.com`, with a DNS A/AAAA record to the host | HTTPS certificate is issued automatically for it | `deploy/api.caddy` |
| SMTP account (any provider: Amazon SES, Zoho, Google Workspace relay…) | Verification, password-reset and staff-invite codes, email updates. Nobody can verify or reset until one is set | `SMTP_URL`, `EMAIL_FROM`, or the dashboard's Integrations page |
| Twilio account + Indian DLT-registered sender and templates (optional) | SMS codes and SMS updates. Indian operators drop unregistered SMS | `SMS_PROVIDER=twilio`, `TWILIO_*` |
| Expo account + EAS project | Push notifications and app builds | app `extra.eas.projectId`; optional `EXPO_ACCESS_TOKEN` |
| S3-compatible bucket (optional; recommended for more than one API replica) | Photos stored off the host | `S3_*` |
| Off-host backup destination | A backup on the same disk is not a backup | copy `BACKUP_DIR` off the host |
| The three administrators' names and emails | Bootstraps the web dashboard (the demo seed refuses to run in production, so demo passwords never reach it) | `npm run create-staff`, once per administrator |

## 2. Deploy (Docker on a VPS)

The production Compose file has no proxy or database of its own. It uses the server's shared services: one Caddy serves every site with HTTPS (`deploy/api.caddy` is the API's entry), and one PostgreSQL holds a separate database per app (the API's is `batra`, created with `server add-db batra`). The server, the proxy and deployments are all handled by [`infra/server.sh`](../../infra/server.sh); the steps are in [`infra/README.md`](../../infra/README.md).

The API refuses to start in production with unsafe settings: localhost or non-HTTPS CORS origins, a missing or short `CONFIG_MASTER_KEY`, or incomplete S3/Twilio credentials. Migrations run automatically and safely at start-up, even with several replicas. In production, messages are never printed to the log in place of sending, because they can contain sign-in codes.

`CORS_ORIGINS` must list the web dashboard's address (comma-separated, `https://` only). The Android and iOS apps don't send an Origin header, so they need no entry.

## 3. First-day setup (administrator)

In the **web dashboard** (`../web`):

1. **Invite staff.** Go to Users → Add staff member. Give each field officer and department officer their district + category jurisdictions. They receive an emailed code and set their own password with "Forgot password".
2. **Confirm deadlines.** Go to App settings → Report categories and deadlines. The seeded hours are application defaults, not published service standards.
3. **Verify the 40 Roorkee wards.** Add their names and localities with the municipal corporation, then mark each one verified.
4. **Add responsible offices.** Add phone numbers and hours, so citizens see who handles their report.
5. **Publish content.** From the web dashboard, publish announcements, projects and photos, and update the `mla-roorkee` and `minister` profile entries.

## 4. Backups and restore

- The `backup` service writes `db-*.dump` (PostgreSQL custom format) and `media-*.tar.gz` nightly to `BACKUP_DIR`. It keeps `BACKUP_KEEP_DAYS` days.
- **Copy `BACKUP_DIR` off the host every day**, for example with restic or rclone to separate storage.
- **Test a restore monthly:** `npm run backup:verify -- backups/db-YYYYMMDDTHHMMSSZ.dump`. This restores into a throwaway container and checks the tables.
- With S3 media, turn on bucket versioning and lifecycle rules instead of the media tarball.

## 5. Monitoring

- `GET /health/live` checks the process; `GET /health/ready` checks the database. Point an uptime monitor at the ready check.
- `GET /metrics` returns Prometheus metrics when `METRICS_TOKEN` is set: response classes, the outbox by channel and status, the last success time of each job, and open and overdue reports. Caddy blocks this path publicly, so scrape it from inside the host network.
- Logs are JSON lines with a request ID. Every error response carries `requestId`, so support can match a user's screenshot to a log line.
- Alert on: the ready check failing; `batra_outbox_messages{status="failed"}` rising; any `batra_job_failing` equal to 1; `batra_job_last_success_seconds` older than 10 minutes.

## 6. Background jobs

These run every `JOB_INTERVAL_SECONDS` (default 60) inside the API. They are safe with any number of replicas.

| Job | Does |
|---|---|
| deliver | Sends queued push, email and SMS. It retries with backoff up to 6 times; dead push tokens are removed; one-time codes are erased after sending |
| escalate | Raises reports past their deadline: level 1 → department, level 2 → administrators, level 3 → executives |
| remind | Notifies citizens 24 hours before a confirmed Jan Samvad appointment |
| cleanup | Removes expired sessions, codes and rate-limit rows; removes photos never attached after 24 hours; applies `CLOSED_REPORT_RETENTION_DAYS` if set |

If your host can't run long-lived processes, set `RUN_JOBS=false` and run `npm run jobs:once` from cron every minute.

## 7. Security operations

- **Lost device or departing staff member:** suspend them in the web dashboard (Users → Suspend). This signs them out everywhere at once.
- **Citizen data requests:** citizens export or delete their own account in Account and security. Deletion removes their identity, while their reports stay with the office, anonymised.
- **Audit:** the web dashboard's Audit log records staff changes, exports, moderation, appointment decisions, password resets and account deletions.
- **Rate limits** are shared across replicas through PostgreSQL: 240 requests per minute per IP, and 30 per 15 minutes on sign-in and code endpoints.
- **Uploads** are fully decoded, re-encoded and stripped of EXIF/GPS metadata. HEIC isn't accepted; the apps send JPEG.
- **Secrets** belong only in `.env` or your secret manager. Rotate `DB_PASSWORD`, `SMTP_URL` and `TWILIO_AUTH_TOKEN` when staff with host access leave. Keys entered in the dashboard are encrypted with `CONFIG_MASTER_KEY`; if that key is lost, enter the provider keys again.
- **Administrator passwords:** replace the demo administrators with named accounts before launch. An administrator who forgets a password is reset by another administrator (Users → Reset password); every reset is audited and signs the person out everywhere.

## 8. Upgrading

`server deploy /opt/apps/batraconnect/backend` on the droplet (it pulls, backs up, rebuilds and waits until healthy). New migrations apply on start. Take a fresh backup first and test the restore of anything with a new migration on a staging copy.

## 9. Production layout: DigitalOcean droplet + Hostinger

| Address | What runs there | Where |
|---|---|---|
| `api.batraconnect.com` | This API, on the droplet's shared Caddy (HTTPS) and PostgreSQL, with nightly backups | DigitalOcean droplet |
| `admin.batraconnect.com` | The web dashboard (`../web`, Next.js) | Hostinger Node.js web app |
| `batraconnect.com` | The landing page (same Next.js app) | Hostinger |

The app and the dashboard call the API only at `https://api.batraconnect.com`.

### Droplet (`api.batraconnect.com`)
The droplet hosts several sites behind one shared Caddy proxy, all managed with `infra/server.sh`. Follow [`infra/README.md`](../../infra/README.md): create the droplet and its Cloud Firewall, run `server setup` once, then the "Batra Connect API" steps. Every release after that is `server deploy /opt/apps/batraconnect/backend`, which takes a backup first and waits until the API is healthy.

Then:
1. Sign in to the dashboard and open **Overview → System health → "Your address, as the server sees it"**. It must be your real public address (`TRUST_PROXY_HOPS` is 1 for the shared proxy).
2. **Off-host backups:** database dumps land in `/opt/backups/postgres/batra/` (nightly and before every deploy), and the API's own backup adds database and photo archives to `/opt/apps/batraconnect/backend/backups`. Copy both off the droplet every day, e.g. with `rclone` to a DigitalOcean Spaces bucket from cron. Run the monthly restore test in section 4.
3. Add an uptime monitor (e.g. UptimeRobot) on `https://api.batraconnect.com/health/ready` every 5 minutes.

### Hostinger: dashboard app (`admin.batraconnect.com`)
Node.js 24, root directory `web`, build `npm run build`, start `npm start`, environment `NEXT_PUBLIC_API_URL=https://api.batraconnect.com` (it is baked in at build time, so rebuild after changing it; `web/.env.production` already sets it).

### Mobile app
The `preview` and `production` EAS build profiles already set `EXPO_PUBLIC_API_URL=https://api.batraconnect.com`; release builds also fall back to it.

### Alternative: managed database
The API also runs against a managed PostgreSQL (for example Supabase or DigitalOcean Managed PostgreSQL) instead of the bundled container. Set `DATABASE_URL` with `sslmode=verify-full` and the provider's CA certificate in `certs/`, and `DATABASE_POOL_SIZE` below the provider's connection limit; see the comments in `.env.example`.
