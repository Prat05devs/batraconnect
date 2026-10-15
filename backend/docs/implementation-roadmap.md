# Delivery order

Started 13 October 2026. Updated 13 October 2026.

| Stage | Status | Deliverable |
|---|---|---|
| 1. Backend foundation and connected complaints | Done | PostgreSQL; accounts; sessions; private uploads; receipts; assignment, status and audit; resolution and reopen; notifications |
| 2. Identity and staff operations | Done | Email/phone verification, OTP sign-in, password reset, account edit/export/delete; staff invitations, roles, multiple jurisdictions, suspension, audit log; closure evidence; SLA deadlines and three-level escalation |
| 3. Ideas and Jan Samvad | Done | Idea submission, review, replies and moderation; appointment sessions, booking, rescheduling, cancellation, confirmation, attendance and reminders |
| 4. Roorkee routing | Done (data needs verification) | Districts; four Roorkee municipal categories; 40 Roorkee wards (seeded unverified); responsible-office routing; GPS capture and map links |
| 5. Content administration | Done | Bilingual, versioned content with draft/publish/archive and moderated gallery photos; profile updates for the MLA and minister pages |
| 6. Notification delivery | Done (needs credentials) | Expo push, SMTP email, Twilio SMS; preferences; retrying outbox |
| 7. Production hardening and release | Done in code; hosting/signing pending | Image re-encoding, S3 media, shared rate limits, migrations, config validation, metrics, Caddy HTTPS, backups and restore check, EAS profiles. Pending: hosting, credentials, store accounts, native device QA |

See [operations.md](operations.md) for deployment and the owner-provided items.
