# Batra Connect — admin dashboard

Web dashboard for the people running Batra Connect (the support company now, the department later). One administrator role; any administrator can reset another administrator's password, so nobody is locked out.

Built with Next.js (App Router), Tailwind CSS and [shadcn/ui](https://ui.shadcn.com) (the same design system the mobile app uses through React Native Reusables). It never touches the database: every page loads and saves through the Batra Connect API in `../backend`.

## Run

```sh
cd web
npm install
cp .env.example .env.local  # NEXT_PUBLIC_API_URL = the API address, e.g. http://127.0.0.1:4000
npm run dev                 # http://127.0.0.1:5173/admin
```

The API must allow the dashboard's address in `CORS_ORIGINS` (already set for `localhost:5173` in development).

## What it does

| Page | Purpose |
|---|---|
| Overview | Totals, 12-week trend, department/district comparison, and system health (database, email, SMS, push, background jobs, failed messages) |
| Reports | Every report with filters (status, category, district, dates, past deadline, escalated); open one to see its history and reassign it; CSV export; a printable summary (Print → Save as PDF) |
| Users | Staff and citizens; add staff (they get an invitation email); suspend/reactivate; **reset anyone's password** |
| Wards & offices | Confirm the 40 Roorkee ward names and localities; add the offices shown on each report |
| Public content | Announcements, achievements, projects, profile updates and photos shown in the app (draft → publish → archive) |
| App settings | Turn reporting, ideas and Jan Samvad on/off separately for citizens and officers; maintenance banner shown in the app; closure-photo rule; category deadlines. Each section has "Undo last change" |
| Integrations | Email (SMTP), SMS (Twilio) and push (Expo) keys with **Send test**. Keys are encrypted in the database, shown only as `••••last4`, apply immediately, and can be restored to the previous version |
| Message log | Every email/SMS/push with its status and failure reason; resend failed updates (sign-in codes are never resent — the person requests a new one) |
| Audit log | Who changed what and when |
| My account | Change your own password |

## Demo logins (development database)

`admin1@batraconnect.demo`, `admin2@batraconnect.demo`, `admin3@batraconnect.demo` — password: the `DEMO_PASSWORD` set in `backend/.env` when the demo data was seeded. They exist only in development: the demo seed refuses to run against a production database. In production, create the first administrator on the server with `npm run create-staff` (see `../backend/docs/operations.md`), then add the other two from **Users → Add staff member** (role Administrator).

## Production

`npm run build` then `npm start` (any Node.js host; on Hostinger at `batraconnect.com/admin`, next to the landing page). Set `NEXT_PUBLIC_API_URL` to the public API address before building (it is baked into the build), add the dashboard's `https://` address to the API's `CORS_ORIGINS`, and set `CONFIG_MASTER_KEY` on the API (32+ random characters; it encrypts the keys saved under Integrations — keep a copy safe, losing it means re-entering those keys).

The dashboard session lasts until the browser tab is closed. Two-step sign-in was intentionally left out for now to keep the product simple; it is a recommended addition before handing over to a department.
