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

Production uses Supabase (PostgreSQL and photo storage) and Hostinger Node.js hosting for `api.batraconnect.com` and `admin.batraconnect.com`. Follow [`backend/docs/operations.md`](backend/docs/operations.md), section 9. Architecture notes: [`backend/docs/architecture.md`](backend/docs/architecture.md).

## Security

- Secrets never go in this repository: every `.env` file is ignored except the documented `*.example` files. Provider keys (email, SMS, push) are entered in the dashboard and stored encrypted.
- The demo accounts (`*@batraconnect.demo`) exist only in development; the demo seed refuses to run against production.
- Report vulnerabilities privately to the maintainers rather than in public issues.

Proprietary. All rights reserved.
