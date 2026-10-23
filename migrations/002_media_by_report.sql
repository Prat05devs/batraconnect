-- Every report view lists its photos by complaint_id; so does the retention cleanup.
CREATE INDEX IF NOT EXISTS media_complaint ON media(complaint_id) WHERE complaint_id IS NOT NULL;
