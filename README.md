# Batra Connect

Civic services app for Uttarakhand: citizens report problems, follow them to resolution, share ideas and book Jan Samvad appointments. Officers handle work in their jurisdiction, and the minister's office oversees.

| Folder | What it is | Stack |
|---|---|---|
| [`app/`](app) | Android and iOS app for citizens, officers and the minister's office | React Native, Expo, NativeWind + React Native Reusables |
| [`backend/`](backend) | The API. It is the only thing that talks to the database | Node.js 24, Express 5, PostgreSQL |
| [`web/`](web) | Admin dashboard at `admin.batraconnect.com` (landing page to follow) | Next.js, shadcn/ui |

The app and the dashboard never access the database directly; everything goes through the API.

## Run locally

1. Backend: [`backend/README.md`](backend/README.md) (PostgreSQL, `.env` from `.env.example`, `npm run dev`).
2. Dashboard: [`web/README.md`](web/README.md) (`npm run dev`, opens on port 5173).
3. App: [`app/README.md`](app/README.md) (`npx expo start`).

## Deploy

The API and its PostgreSQL database run on a DigitalOcean droplet at `api.batraconnect.com` (Docker Compose). The droplet hosts several sites behind one shared HTTPS proxy, all set up and deployed with [`infra/server.sh`](infra/server.sh); see [`infra/README.md`](infra/README.md). The dashboard runs on Hostinger at `admin.batraconnect.com`. The app and the dashboard both call `https://api.batraconnect.com`. Operations: [`backend/docs/operations.md`](backend/docs/operations.md). Architecture notes: [`backend/docs/architecture.md`](backend/docs/architecture.md).

Hostinger builds the dashboard from the `deploy-admin` branch (the `web/` folder at the top level). After pushing `main`, run `scripts/publish-deploy-branches.sh` to update it (and `deploy-api` with `backend/`).

## Security

- Secrets never go in this repository: every `.env` file is ignored except the documented `*.example` files. Provider keys (email, SMS, push) are entered in the dashboard and stored encrypted.
- The demo accounts (`*@batraconnect.demo`) exist only in development; the demo seed refuses to run against production.
- Report vulnerabilities privately to the maintainers rather than in public issues.

Proprietary. All rights reserved.
