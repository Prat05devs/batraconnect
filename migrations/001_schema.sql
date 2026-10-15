-- Batra Connect database schema (PostgreSQL).
-- New changes go in new numbered files (002_…sql); this file is never edited once deployed.
-- Times are ISO-8601 text in UTC, written by the API.

---------------------------------------------------------------------------
-- People and access
---------------------------------------------------------------------------
CREATE TABLE users (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 email TEXT NOT NULL UNIQUE,
 phone TEXT,
 password_hash TEXT NOT NULL,
 -- citizen: residents. field / department: officers (scoped by staff_jurisdictions).
 -- executive: the minister's office, oversight only. admin: runs the web dashboard.
 role TEXT NOT NULL CHECK (role IN ('citizen','field','department','executive','admin')),
 status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
 language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en','hi')),
 email_verified_at TEXT,
 phone_verified_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT
);
CREATE UNIQUE INDEX users_phone ON users(phone) WHERE phone IS NOT NULL;

-- Which district + category pairs a field or department officer works on.
CREATE TABLE staff_jurisdictions (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 district TEXT NOT NULL,                     -- references districts / complaint_categories (constraints below)
 category TEXT NOT NULL,
 PRIMARY KEY (user_id, district, category)
);
CREATE INDEX jurisdictions_scope ON staff_jurisdictions(district, category);

-- Opaque session tokens; only their SHA-256 hash is stored.
CREATE TABLE sessions (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at TEXT NOT NULL,
 created_at TEXT NOT NULL,
 last_used_at TEXT,
 user_agent TEXT
);
CREATE INDEX sessions_user ON sessions(user_id);

-- Email/SMS codes for verification, password reset, staff invitations and code sign-in (hashed).
CREATE TABLE one_time_codes (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 purpose TEXT NOT NULL CHECK (purpose IN ('verify_email','verify_phone','reset_password','login')),
 destination TEXT NOT NULL,
 code_hash TEXT NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 expires_at TEXT NOT NULL,
 consumed_at TEXT,
 created_at TEXT NOT NULL
);
CREATE INDEX codes_lookup ON one_time_codes(user_id, purpose, created_at);

-- Append-only record of administrative and security-relevant actions.
CREATE TABLE audit_log (
 id TEXT PRIMARY KEY,
 actor_id TEXT REFERENCES users(id),
 action TEXT NOT NULL,
 target_type TEXT,
 target_id TEXT,
 details JSONB NOT NULL DEFAULT '{}'::jsonb,
 ip TEXT,
 created_at TEXT NOT NULL
);
CREATE INDEX audit_created ON audit_log(created_at DESC);
CREATE INDEX audit_actor ON audit_log(actor_id, created_at DESC);

-- Request counters shared by every API server.
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, hits INTEGER NOT NULL, reset_at TIMESTAMPTZ NOT NULL);

---------------------------------------------------------------------------
-- Places, categories and responsible offices (edited from the web dashboard)
---------------------------------------------------------------------------
CREATE TABLE districts (key TEXT PRIMARY KEY, name TEXT NOT NULL, hindi_name TEXT NOT NULL);
INSERT INTO districts(key, name, hindi_name) VALUES
 ('almora','Almora','अल्मोड़ा'),('bageshwar','Bageshwar','बागेश्वर'),('chamoli','Chamoli','चमोली'),('champawat','Champawat','चंपावत'),
 ('dehradun','Dehradun','देहरादून'),('haridwar','Haridwar','हरिद्वार'),('nainital','Nainital','नैनीताल'),('pauri garhwal','Pauri Garhwal','पौड़ी गढ़वाल'),
 ('pithoragarh','Pithoragarh','पिथौरागढ़'),('rudraprayag','Rudraprayag','रुद्रप्रयाग'),('tehri garhwal','Tehri Garhwal','टिहरी गढ़वाल'),
 ('udham singh nagar','Udham Singh Nagar','ऊधम सिंह नगर'),('uttarkashi','Uttarkashi','उत्तरकाशी');

-- sla_hours: the service deadline. Starting values are defaults for the office to confirm.
CREATE TABLE complaint_categories (
 name TEXT PRIMARY KEY,
 hindi_name TEXT NOT NULL,
 scope TEXT NOT NULL CHECK (scope IN ('state','roorkee')),
 sla_hours INTEGER NOT NULL CHECK (sla_hours BETWEEN 1 AND 2160),
 active BOOLEAN NOT NULL DEFAULT true,
 sort INTEGER NOT NULL DEFAULT 0
);
INSERT INTO complaint_categories(name, hindi_name, scope, sla_hours, sort) VALUES
 ('Road & Transport','सड़क और परिवहन','state',168,1),('IT & Public Services','आईटी और सार्वजनिक सेवाएँ','state',168,2),
 ('Science & Technology','विज्ञान और प्रौद्योगिकी','state',336,3),('Biotechnology','जैव प्रौद्योगिकी','state',336,4),
 ('Water supply','जल आपूर्ति','roorkee',72,5),('Drainage & sewerage','नाली और सीवरेज','roorkee',72,6),
 ('Street lighting','स्ट्रीट लाइट','roorkee',72,7),('Waste & sanitation','कचरा और स्वच्छता','roorkee',48,8),
 ('Other','अन्य','state',168,9);

ALTER TABLE staff_jurisdictions
 ADD CONSTRAINT staff_jurisdictions_district FOREIGN KEY (district) REFERENCES districts(key),
 ADD CONSTRAINT staff_jurisdictions_category FOREIGN KEY (category) REFERENCES complaint_categories(name);

-- Roorkee wards are seeded as numbers only; the office confirms names and localities, then marks them verified.
CREATE TABLE wards (
 id TEXT PRIMARY KEY,
 district TEXT NOT NULL REFERENCES districts(key),
 town TEXT NOT NULL,
 number INTEGER NOT NULL,
 name TEXT NOT NULL,
 hindi_name TEXT,
 localities TEXT[] NOT NULL DEFAULT '{}',
 verified BOOLEAN NOT NULL DEFAULT false,
 active BOOLEAN NOT NULL DEFAULT true,
 updated_at TEXT NOT NULL,
 UNIQUE (town, number)
);
INSERT INTO wards(id, district, town, number, name, hindi_name, updated_at)
 SELECT 'roorkee-' || n, 'haridwar', 'Roorkee', n, 'Ward ' || n, 'वार्ड ' || n, '2026-10-13T00:00:00.000Z' FROM generate_series(1, 40) AS n;

-- Shown on each report: the most specific match of ward + category, ward, district + category, district.
CREATE TABLE offices (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 hindi_name TEXT,
 district TEXT NOT NULL REFERENCES districts(key),
 category TEXT REFERENCES complaint_categories(name),
 ward_id TEXT REFERENCES wards(id),
 phone TEXT,
 email TEXT,
 address TEXT,
 hours TEXT,
 active BOOLEAN NOT NULL DEFAULT true,
 updated_at TEXT NOT NULL
);
CREATE INDEX offices_route ON offices(district, category, ward_id) WHERE active;

---------------------------------------------------------------------------
-- Reports (complaints)
---------------------------------------------------------------------------
CREATE TABLE complaints (
 id TEXT PRIMARY KEY,
 reference TEXT NOT NULL UNIQUE,           -- BC-YYYYMMDD-XXXXXXXXXXXX, shown to the citizen
 citizen_id TEXT NOT NULL REFERENCES users(id),
 category TEXT NOT NULL REFERENCES complaint_categories(name),
 title TEXT NOT NULL,
 description TEXT NOT NULL,
 district TEXT NOT NULL REFERENCES districts(key),
 locality TEXT NOT NULL,
 ward_id TEXT REFERENCES wards(id),
 latitude DOUBLE PRECISION,
 longitude DOUBLE PRECISION,
 status TEXT NOT NULL CHECK (status IN ('Submitted','Assigned','In progress','Resolved','Closed','Reopened')),
 assigned_to TEXT REFERENCES users(id),
 version INTEGER NOT NULL DEFAULT 1,        -- optimistic locking: every change must quote the current version
 resolution TEXT,
 due_at TEXT,                               -- created_at + category deadline; reset when reopened
 escalation_level INTEGER NOT NULL DEFAULT 0, -- 1 department, 2 administrators, 3 minister's office
 resolved_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX complaints_owner ON complaints(citizen_id, created_at);
CREATE INDEX complaints_scope ON complaints(district, category, status);
CREATE INDEX complaints_assignee ON complaints(assigned_to, status);
CREATE INDEX complaints_due ON complaints(due_at) WHERE status NOT IN ('Resolved','Closed');

-- Activity history. actor_id is NULL for automatic actions (escalation).
CREATE TABLE complaint_events (
 id TEXT PRIMARY KEY,
 complaint_id TEXT NOT NULL REFERENCES complaints(id),
 actor_id TEXT REFERENCES users(id),
 action TEXT NOT NULL,
 status TEXT NOT NULL,
 note TEXT NOT NULL,
 media_ids TEXT[] NOT NULL DEFAULT '{}',
 created_at TEXT NOT NULL
);
CREATE INDEX events_complaint ON complaint_events(complaint_id, created_at);

-- Makes "send report" safe to retry: the same request key always returns the same report.
CREATE TABLE idempotency (
 user_id TEXT NOT NULL REFERENCES users(id),
 request_key TEXT NOT NULL,
 payload_hash TEXT NOT NULL,
 complaint_id TEXT NOT NULL REFERENCES complaints(id),
 PRIMARY KEY (user_id, request_key)
);

---------------------------------------------------------------------------
-- Ideas and Jan Samvad appointments
---------------------------------------------------------------------------
CREATE TABLE ideas (
 id TEXT PRIMARY KEY,
 reference TEXT NOT NULL UNIQUE,
 citizen_id TEXT NOT NULL REFERENCES users(id),
 category TEXT NOT NULL CHECK (category IN ('Public spaces','Transport','Digital services','Environment','Other')),
 title TEXT NOT NULL,
 description TEXT NOT NULL,
 district TEXT NOT NULL REFERENCES districts(key),
 status TEXT NOT NULL CHECK (status IN ('Submitted','Under review','Accepted','Implemented','Not taken forward','Hidden')),
 version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX ideas_owner ON ideas(citizen_id, created_at);
CREATE INDEX ideas_status ON ideas(status, created_at);

CREATE TABLE idea_events (
 id TEXT PRIMARY KEY,
 idea_id TEXT NOT NULL REFERENCES ideas(id),
 actor_id TEXT NOT NULL REFERENCES users(id),
 action TEXT NOT NULL,
 status TEXT NOT NULL,
 note TEXT NOT NULL,
 visible_to_citizen BOOLEAN NOT NULL DEFAULT true,
 created_at TEXT NOT NULL
);
CREATE INDEX idea_events_idea ON idea_events(idea_id, created_at);

CREATE TABLE appointment_slots (
 id TEXT PRIMARY KEY,
 location TEXT NOT NULL,
 district TEXT NOT NULL REFERENCES districts(key),
 starts_at TEXT NOT NULL,
 ends_at TEXT NOT NULL,
 capacity INTEGER NOT NULL CHECK (capacity BETWEEN 1 AND 200),
 created_by TEXT NOT NULL REFERENCES users(id),
 cancelled_at TEXT,
 created_at TEXT NOT NULL,
 CHECK (ends_at > starts_at)                -- ISO-8601 UTC text sorts chronologically
);
CREATE INDEX slots_time ON appointment_slots(starts_at) WHERE cancelled_at IS NULL;

-- Capacity ("remaining > 0") is enforced by the booking transaction, which runs at SERIALIZABLE isolation.
CREATE TABLE appointments (
 id TEXT PRIMARY KEY,
 reference TEXT NOT NULL UNIQUE,
 slot_id TEXT NOT NULL REFERENCES appointment_slots(id),
 citizen_id TEXT NOT NULL REFERENCES users(id),
 subject TEXT NOT NULL,
 notes TEXT NOT NULL,
 status TEXT NOT NULL CHECK (status IN ('Requested','Confirmed','Declined','Cancelled','Completed','Missed')),
 office_note TEXT,
 version INTEGER NOT NULL DEFAULT 1,
 reminder_sent_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX appointments_owner ON appointments(citizen_id, created_at);
CREATE INDEX appointments_slot ON appointments(slot_id, status);

---------------------------------------------------------------------------
-- Public content (announcements, achievements, projects, profile updates, photos)
---------------------------------------------------------------------------
CREATE TABLE content_entries (
 id TEXT PRIMARY KEY,
 type TEXT NOT NULL CHECK (type IN ('announcement','achievement','project','profile','photo')),
 slug TEXT NOT NULL,
 data JSONB NOT NULL,                       -- title/summary/body in English and Hindi, facts, photo ids, source link
 status TEXT NOT NULL CHECK (status IN ('draft','published','archived')),
 sort INTEGER NOT NULL DEFAULT 0,
 version INTEGER NOT NULL DEFAULT 1,
 updated_by TEXT REFERENCES users(id),
 published_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 UNIQUE (type, slug)
);
CREATE INDEX content_public ON content_entries(type, status, sort);

-- Photos: report evidence, proof of completed work, and published content photos.
CREATE TABLE media (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL REFERENCES users(id),
 complaint_id TEXT REFERENCES complaints(id),
 content_id TEXT REFERENCES content_entries(id) ON DELETE SET NULL,
 purpose TEXT NOT NULL DEFAULT 'evidence' CHECK (purpose IN ('evidence','resolution','gallery')),
 filename TEXT NOT NULL UNIQUE,
 mime_type TEXT NOT NULL,
 size INTEGER NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX media_orphans ON media(created_at) WHERE complaint_id IS NULL;

---------------------------------------------------------------------------
-- Notifications: in-app list, device tokens, preferences and the delivery queue
---------------------------------------------------------------------------
CREATE TABLE notifications (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 link TEXT,                                 -- "complaint:<id>", "idea:<id>" or "appointment:<id>"
 message TEXT NOT NULL,
 read_at TEXT,
 created_at TEXT NOT NULL
);
CREATE INDEX notifications_user ON notifications(user_id, created_at);

CREATE TABLE push_tokens (
 token TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 platform TEXT NOT NULL CHECK (platform IN ('ios','android','web')),
 created_at TEXT NOT NULL,
 last_seen_at TEXT NOT NULL
);
CREATE INDEX push_tokens_user ON push_tokens(user_id);

CREATE TABLE notification_preferences (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 push BOOLEAN NOT NULL DEFAULT true,
 email BOOLEAN NOT NULL DEFAULT true,
 sms BOOLEAN NOT NULL DEFAULT false,
 updated_at TEXT NOT NULL
);

-- Every push/email/SMS is queued here and sent by the background job, with retries.
-- Bodies of sensitive messages (codes) are erased once sent.
CREATE TABLE outbox (
 id TEXT PRIMARY KEY,
 user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
 channel TEXT NOT NULL CHECK (channel IN ('push','email','sms')),
 destination TEXT NOT NULL,
 subject TEXT,
 body TEXT,
 data JSONB NOT NULL DEFAULT '{}'::jsonb,
 sensitive BOOLEAN NOT NULL DEFAULT false,
 status TEXT NOT NULL CHECK (status IN ('pending','sent','failed','skipped')),
 attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt_at TEXT NOT NULL,
 last_error TEXT,
 created_at TEXT NOT NULL,
 sent_at TEXT
);
CREATE INDEX outbox_due ON outbox(next_attempt_at) WHERE status = 'pending';

---------------------------------------------------------------------------
-- Operations
---------------------------------------------------------------------------
-- Last run of each background job (shown on the dashboard's system health).
CREATE TABLE job_runs (name TEXT PRIMARY KEY, last_started_at TEXT, last_finished_at TEXT, last_error TEXT, runs INTEGER NOT NULL DEFAULT 0);

-- Settings changed from the web dashboard. Secret values (API keys) are AES-256-GCM encrypted.
CREATE TABLE app_settings (
 key TEXT PRIMARY KEY,
 value JSONB NOT NULL DEFAULT '{}'::jsonb,
 secret TEXT,
 updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 updated_at TEXT NOT NULL
);
-- Previous values, so a bad change (e.g. a wrong API key) can be undone.
CREATE TABLE app_settings_history (
 id TEXT PRIMARY KEY,
 key TEXT NOT NULL,
 value JSONB NOT NULL,
 secret TEXT,
 updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX settings_history_key ON app_settings_history(key, created_at DESC);
