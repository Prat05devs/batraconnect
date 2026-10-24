# Server deployment: how Batra Connect runs, and how to add the next app

This is the record of the production setup as of 24 October 2026, and the procedure to follow for every other app (Lawmedy, NewsVO, Labour Youth, Valley Ride, …). It is written to be handed to a developer or an AI assistant as context. It contains no passwords or keys; those live only in the `.env` files on the server and in the team's password manager.

The tooling lives in this repository: [`infra/server.sh`](infra/server.sh) (installed on the server as the `server` command) and [`infra/README.md`](infra/README.md). Copy `infra/` into any other app's repository, or download `server.sh` from this one; it is the same script for every app.

---

## 1. The architecture

```
 Phones (iOS / Android apps)        Browsers
            │                          │
            │              ┌───────────▼────────────┐
            │              │ Hostinger              │  websites and dashboards (Next.js / React)
            │              │ batraconnect.com       │  e.g. batraconnect.com and batraconnect.com/admin
            │              └───────────┬────────────┘
            │        HTTPS API calls   │
            └─────────────┬────────────┘
                          ▼  ports 80 / 443 only
 ┌──────────────────────────────────────────────────────────────┐
 │ DigitalOcean droplet 139.59.72.220 (Bangalore)               │
 │                                                              │
 │  /opt/platform   shared services, started once               │
 │    caddy     HTTPS proxy for every API domain                │
 │    postgres  one PostgreSQL 17, one database + login per app │
 │    backup    dumps every database every 24 h, keeps 14 days  │
 │                                                              │
 │  /opt/apps/<app>   one Docker Compose project per API        │
 │    batraconnect → container "batra-api" on port 4000         │
 │    (next apps go here)                                       │
 └──────────────────────────────────────────────────────────────┘
```

Rules that hold for every app:

- **Only the proxy (Caddy) opens ports.** Apps publish no ports; Caddy reaches them by name over the private `edge` Docker network.
- **One PostgreSQL, isolated databases.** Each app gets its own database and login (`server add-db`); a login can open only its own database. PostgreSQL sits on the `data` network, which has no internet access and is never published.
- **Each API is its own Compose project** in `/opt/apps/<app>`, with its own `.env` (permissions 600, never in git).
- **Frontends stay on Hostinger** and call the APIs over HTTPS.
- **DNS stays at GoDaddy** (nameservers `ns75/ns76.domaincontrol.com`). Never move nameservers to Hostinger: the `api` records would be lost.

---

## 2. What is already set up

### DigitalOcean

| Item | Value |
|---|---|
| Droplet | `ubuntu-s-2vcpu-2gb-blr1`, Ubuntu 24.04.5 LTS, 2 vCPU, 2 GB RAM, 60 GB disk, region BLR1 |
| Public IP | `139.59.72.220` |
| Cloud Firewall | `apps-server-blr1`, applied to the droplet. Inbound: TCP 22 (SSH), TCP 80 (HTTP), TCP 443 (HTTPS), UDP 443 (HTTP/3), all sources. Outbound: everything (updates, Docker images). It covers every app on the droplet; no change is needed for new apps |
| Droplet backups | **Not on yet.** Turn on weekly backups (Droplet → Backups) |

### Login

- `ssh deploy@139.59.72.220`. The `deploy` user has sudo (no password) and Docker access.
- **Root login and password login are off.** Only SSH keys work. The key in use is `~/.ssh/id_ed25519` on Prateek's Mac (it has a passphrase). To add someone, append their **public** key to `/home/deploy/.ssh/authorized_keys`.
- Run commands one at a time: wait for the `deploy@…$` prompt before pasting the next command.

### Set up by `server setup` (once, already done)

- Automatic security updates, with a reboot at 03:30 IST when the kernel needs it; every container restarts by itself.
- `fail2ban`: an address is banned for an hour after 5 failed SSH logins.
- 2 GB of swap, so builds (`npm ci`, image processing) are not killed on the 2 GB plan.
- Docker from Docker's official repository, with log rotation.
- Host firewall (`ufw`): 22, 80, 443. (Docker-published ports bypass `ufw`; the DigitalOcean Cloud Firewall is what actually protects the droplet.)
- The `server` command at `/usr/local/bin/server`.

### Layout on disk

| Path | What it holds |
|---|---|
| `/opt/platform/compose.yaml` | The shared services (Caddy 2.10, PostgreSQL 17, backup). Written by `server.sh`; do not edit by hand |
| `/opt/platform/.env` | `POSTGRES_PASSWORD` (the admin password, generated) and `ACME_EMAIL` (`admin@wtsolutions.cc`, for Let's Encrypt notices) |
| `/opt/platform/conf/Caddyfile` | Imports every file in `conf/sites/` |
| `/opt/platform/conf/sites/<domain>.caddy` | One file per domain, added with `server add-site` |
| `/opt/apps/<app>/` | Each app's git checkout and `.env` |
| `/opt/sites/<domain>/` | Plain static sites, if any (`server add-site <domain> static`) |
| `/opt/backups/postgres/<database>/` | Database dumps (every 24 h and before every deploy), kept 14 days |

### Docker networks

| Network | Who is on it | Notes |
|---|---|---|
| `edge` | Caddy and every app's web container | Each app's container needs a **unique alias** on it, e.g. `batra-api` |
| `data` | PostgreSQL and every app that uses it | Internal: no internet access from this network |

### The `server` command

| Command | What it does |
|---|---|
| `server add-db <name>` | Creates a database and login `<name>` and prints its password and `DATABASE_URL` **once**. Names: `a-z`, `0-9`, `_` |
| `server add-site <domain> <alias>:<port>` | Proxies a domain to a container (HTTPS certificate issued on the first visit) |
| `server add-site <domain> <file>.caddy` | Installs a full site block from the app's repository (Batra Connect uses this) |
| `server add-site <domain> static` | Serves files from `/opt/sites/<domain>` |
| `server remove-site <domain>` | Takes a domain off the proxy |
| `server deploy <app folder>` | `git pull` (fast-forward only), backs up every database (and runs the app's own backup service, if it has one), rebuilds, and waits until every container is healthy |
| `server backup` | Dumps every database now |
| `server status` | Containers, sites, databases with sizes, disk and memory |

A bad site file is rejected and the running configuration stays live, so `add-site` cannot take other sites down.

---

## 3. How Batra Connect was deployed (in order)

### 3.1 Server (once for the whole droplet)

1. **Cloud Firewall** `apps-server-blr1` created and applied to the droplet (section 2).
2. **SSH key:** the Mac's public key was added to `/root/.ssh/authorized_keys` through the DigitalOcean web console, then login was tested from the Mac's Terminal.
3. **Setup**, as root from the Mac's Terminal:
   ```sh
   ssh root@139.59.72.220
   curl -fsSLO https://raw.githubusercontent.com/Prat05devs/batraconnect/main/infra/server.sh
   bash server.sh setup --email admin@wtsolutions.cc
   reboot
   ```
   From then on: `ssh deploy@139.59.72.220`.

### 3.2 DNS (GoDaddy)

| Record | Points to | Set by |
|---|---|---|
| `A  api` | `139.59.72.220` (the droplet) | Added by hand at GoDaddy |
| `A  @` | `82.25.106.128` (Hostinger) | Hostinger's "Connect domain" (it edits GoDaddy for you) |
| `CNAME  www` | `batraconnect.com` | Same |

### 3.3 The API

As `deploy`:

```sh
git clone https://github.com/Prat05devs/batraconnect.git /opt/apps/batraconnect
cd /opt/apps/batraconnect/backend
PW=$(server add-db batra | sed -n 's/^ *password: *//p')     # creates database "batra"
cat > .env <<EOF
COMPOSE_PROJECT_NAME=batra
COMPOSE_FILE=compose.yaml:compose.production.yaml
DB_PASSWORD=$PW
CONFIG_MASTER_KEY=$(openssl rand -base64 48)
CORS_ORIGINS=https://batraconnect.com
BACKUP_DIR=./backups
BACKUP_KEEP_DAYS=14
REQUIRE_VERIFIED_CONTACT=false
EOF
chmod 600 .env                     # then copy DB_PASSWORD and CONFIG_MASTER_KEY into the password manager
server add-site api.batraconnect.com deploy/api.caddy
server deploy .
docker compose exec -e STAFF_NAME='…' -e STAFF_EMAIL='…' -e STAFF_PASSWORD='…' -e STAFF_ROLE=admin \
  api node scripts/create-staff.js  # the first administrator
history -c && history -w            # the password above is otherwise kept in the shell history
curl https://api.batraconnect.com/health/ready
```

What the repository provides for this to work (copy the pattern for other apps):

- `backend/compose.yaml` (development: API plus a local database) and `backend/compose.production.yaml` (production override: no ports, joins `edge` with alias `batra-api` and `data`, uses the shared PostgreSQL at host `postgres`, `TRUST_PROXY_HOPS: 1`, log limits, the app's own backup service for the database and uploaded photos).
- `backend/deploy/api.caddy`: the site block (HTTPS, compression, 11 MB upload limit, HSTS, hides `/metrics`, health-checked proxy to `batra-api:4000`).
- A Docker health check and `GET /health/ready`, so `server deploy` knows when the API is really up. Migrations run when the API starts.

Settings to know about in `backend/.env`:

| Setting | Current value | Why |
|---|---|---|
| `CORS_ORIGINS` | `https://batraconnect.com` | The only website allowed to call the API from a browser (the dashboard is at `/admin` on it). The mobile apps are not affected by CORS |
| `REQUIRE_VERIFIED_CONTACT` | `false` | There is no email provider yet, so residents are not asked to verify their email. When email is set up (dashboard → Integrations → Email), delete this line and run `server deploy .`; the app follows the server without a new build |
| `CONFIG_MASTER_KEY` | (secret) | Encrypts the provider keys saved in the dashboard. Losing it means re-entering those keys |

Every release after that: push to `main`, then `ssh deploy@139.59.72.220` and `server deploy /opt/apps/batraconnect/backend`.

### 3.4 Website and dashboard (Hostinger)

A Hostinger **Node.js web app** named `batraconnect.com`, connected to GitHub. Settings (Deployments → Settings and redeploy):

| Setting | Value |
|---|---|
| Framework preset | **Next.js** (not React: the React preset only copies static files and the site answers 403 Forbidden) |
| Branch / root directory | `main` / `web` |
| Node version | 24.x |
| Build command / output | `npm run build` / `.next` |
| Environment variable | `NEXT_PUBLIC_API_URL=https://api.batraconnect.com` (it is baked in at build time) |
| Auto-deployment | On: every push to `main` rebuilds the site |
| Domain | Connected with "Continue setup" → **DNS records** option, never "change nameservers" |
| SSL | Issued by Hostinger automatically after the domain connects (5–30 minutes) |

The build uses webpack (`next build --webpack`), because Hostinger's build sandbox does not allow the separate Node process that Turbopack starts to compile CSS.

### 3.5 Mobile app

Builds call `https://api.batraconnect.com`. iOS builds are made in Xcode from `app/ios/BatraConnect.xcworkspace` (generated with `npx expo prebuild --platform ios`) under the Apple team WT IT SOLUTIONS PRIVATE LIMITED (`9Q56J23Z23`), or with EAS (`npx eas-cli@latest build --platform ios --profile production`). Nothing on the server changes for an app release.

---

## 4. Adding the next app (checklist)

Use the app's short name in lower case for everything (example: `lawmedy`).

### 4.1 In the app's repository, before touching the server

1. **A Dockerfile** for the API. The process must listen on `0.0.0.0:<port>` (not `127.0.0.1`), run as a non-root user, and start without manual steps (run database migrations at start-up).
2. **A health endpoint** (e.g. `GET /health/ready` that checks the database) and a Docker `healthcheck` that calls it. `server deploy` waits for "healthy" and reports a failed start instead of passing silently.
3. **`compose.production.yaml`** (or a single `compose.yaml`) shaped like this:
   ```yaml
   services:
     api:
       build: .
       restart: unless-stopped
       env_file: .env
       environment:
         DATABASE_URL: postgres://lawmedy:${DB_PASSWORD:?Set DB_PASSWORD}@postgres:5432/lawmedy
       networks:
         default: {}
         data: {}                    # reaches the shared PostgreSQL at postgres:5432
         edge:
           aliases: [lawmedy-api]    # unique across the whole server
       logging:
         driver: json-file
         options: { max-size: "20m", max-file: "10" }
   networks:
     edge: { external: true }
     data: { external: true }
   ```
   No `ports:`. No database container of its own in production. Never name a service `postgres` or `caddy`. If the app has more containers (worker, cache), give each a unique `edge` alias only if Caddy must reach it.
4. **Behind the proxy:** trust exactly one proxy hop for client IPs (Express: `app.set('trust proxy', 1)`; Django: `SECURE_PROXY_SSL_HEADER` and `USE_X_FORWARDED_HOST`; FastAPI/Uvicorn: `--proxy-headers --forwarded-allow-ips='*'`).
5. **CORS:** allow only the frontend's `https://` addresses, never `*` for an API with logins.
6. **Uploads:** keep them in a named Docker volume (not inside the container), or in DigitalOcean Spaces / S3, and back them up.

### 4.2 DNS

At GoDaddy (or wherever that domain's DNS is): add `A  api` → `139.59.72.220`. Check before continuing:
```sh
dig +short api.<domain>      # must print 139.59.72.220
```

### 4.3 On the server

```sh
ssh deploy@139.59.72.220
git clone https://github.com/<org>/<repo>.git /opt/apps/lawmedy      # private repo: add a read-only deploy key first
cd /opt/apps/lawmedy                                                 # or the subfolder holding the compose files
PW=$(server add-db lawmedy | sed -n 's/^ *password: *//p')
cat > .env <<EOF
COMPOSE_PROJECT_NAME=lawmedy
COMPOSE_FILE=compose.yaml:compose.production.yaml
DB_PASSWORD=$PW
# the app's own settings: secrets, CORS origins, keys …
EOF
chmod 600 .env
grep -c DB_PASSWORD=. .env                     # 1 means the password was captured
server add-site api.<domain> lawmedy-api:8000  # alias and port from the compose file
server deploy .
curl https://api.<domain>/health/ready
```

Save `DB_PASSWORD` and the app's secrets in the password manager straight away: `add-db` prints the password only once.

### 4.4 Frontend on Hostinger

Add a Node.js web app (or a static site) from the repository, choose the framework preset that matches the code (Next.js for Next.js; React/Vite for a static React app, output `dist`), set the API address as an environment variable, then connect the domain using the **DNS records** option. If the app needs both a site and a dashboard, prefer one app with the dashboard under a path (`/admin`) over two Hostinger apps for two subdomains.

### 4.5 After the first deploy

- `server status`: memory should stay comfortably below 2 GB with swap mostly unused. With five APIs, if memory stays near full, resize the droplet to 4 GB in the DigitalOcean dashboard (a few minutes' downtime, nothing to reinstall).
- Add an uptime monitor (e.g. UptimeRobot) on the health URL.

---

## 5. Day-to-day operations

| Task | Command (as `deploy`) |
|---|---|
| Release an API | `server deploy /opt/apps/<app>` (Batra Connect: `/opt/apps/batraconnect/backend`) |
| Status of everything | `server status` |
| An app's logs | `cd /opt/apps/<app> && docker compose logs -f --tail 100 api` |
| Restart an app | `cd /opt/apps/<app> && docker compose restart` |
| Proxy logs | `docker compose -f /opt/platform/compose.yaml logs -f --tail 100 caddy` |
| Back up now | `server backup` |
| Change a setting | edit `/opt/apps/<app>/.env` (e.g. `nano .env`), then `server deploy .` |

**Rollback:** `git -C /opt/apps/<app> log --oneline -5`, then `git -C /opt/apps/<app> checkout <previous commit>` and `docker compose up -d --build --wait` in the app folder. Run `git checkout main` before the next `server deploy`.

**Restore a database:** `pg_restore --clean` the right file from `/opt/backups/postgres/<database>/` into it, from inside the PostgreSQL container.

**Off-server copies:** backups on the same disk are not real backups. Turn on DigitalOcean droplet backups, and copy `/opt/backups` (and each app's own backup folder, such as `/opt/apps/batraconnect/backend/backups`) off the droplet daily, e.g. with `rclone` to a DigitalOcean Spaces bucket from cron.

---

## 6. Problems we hit, and their fixes

| Symptom | Cause | Fix |
|---|---|---|
| `ssh` asks for a passphrase | The Mac's SSH key is protected by one | Type it (nothing shows while typing). Save it once with `ssh-add --apple-use-keychain ~/.ssh/id_ed25519` |
| `Permission denied (publickey)` | The server does not have your public key | Add it to `authorized_keys` (root: from the DigitalOcean web console) |
| `Connection refused` right after `reboot` | The server is still starting | Wait a minute and try again |
| A pasted command did nothing after `ssh …` | It was typed while SSH was still asking for the passphrase | Paste one command at a time, after the prompt appears |
| Root login fails after setup | Intended: setup turns root login off | `ssh deploy@…` |
| Hostinger site shows **403 Forbidden** | Framework preset was React (static files only) | Preset **Next.js**, output `.next`, then Save and redeploy |
| Hostinger build: `TurbopackInternalError … node process exited` | Hostinger's build sandbox blocks the extra Node process | Build with webpack: `next build --webpack` |
| Dashboard cannot sign in (browser CORS error) | The site's address is not in `CORS_ORIGINS` | Edit `.env`, `server deploy .` |
| Registration works but nobody receives a code | No email provider configured | Configure one in the dashboard, or keep `REQUIRE_VERIFIED_CONTACT=false` for now |
| Domain still shows GoDaddy's parking page | The DNS record still points to GoDaddy | Fix the `A` record; check with `dig +short <domain>` |
| HTTPS fails for a few minutes on a new domain | The certificate is issued on the first visit | Wait; make sure ports 80 and 443 are open in the Cloud Firewall |

---

## 7. Security checklist for every app

- Secrets only in `.env` on the server (mode 600) and in the password manager; never in git, screenshots or chat.
- Clear the shell history after typing a password on the server: `history -c && history -w`.
- The first admin's password should be long (16+ characters) and changed after setup if anyone else saw it.
- No published ports; no database container of its own; the `data` network only for containers that need the database.
- Keep dependencies patched (`npm audit --omit=dev`, Hostinger's Security → Vulnerabilities page) and redeploy.
