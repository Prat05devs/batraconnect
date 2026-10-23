import { randomUUID } from 'node:crypto';
import { parse, contentEntry, contentUpdate, contentTypes } from '../validation.js';
import { z } from 'zod';

const view = (r, forAdmin = false) => ({
  id: r.id,
  type: r.type,
  slug: r.slug,
  ...r.data,
  sort: r.sort,
  publishedAt: r.published_at,
  updatedAt: r.updated_at,
  ...(forAdmin ? { status: r.status, version: r.version } : {}),
});

export function publicRoutes(app, { db, one, check, store }) {
  app.get('/api/v1/content', async (req, res) => {
    const type = parse(z.object({ type: z.enum(contentTypes).optional() }).strip(), req.query).type;
    const rows = await db.query(
      `SELECT * FROM content_entries WHERE status='published' ${type ? 'AND type=?' : ''} ORDER BY type,sort,published_at DESC LIMIT 500`,
      type ? [type] : [],
    );
    res.set('Cache-Control', 'public, max-age=300').json({ entries: rows.map(r => view(r)) });
  });
  app.get('/api/v1/content/:type/:slug', async (req, res) => {
    const row = await one(`SELECT * FROM content_entries WHERE type=? AND slug=? AND status='published'`, [
      req.params.type,
      req.params.slug,
    ]);
    check(row, 404, 'NOT_FOUND', 'Content unavailable.');
    res.set('Cache-Control', 'public, max-age=300').json({ entry: view(row) });
  });
  app.get('/api/v1/public/media/:id', async (req, res) => {
    const media = await one(
      `SELECT m.* FROM media m JOIN content_entries c ON c.id=m.content_id WHERE m.id=? AND c.status='published'`,
      [req.params.id],
    );
    check(media, 404, 'NOT_FOUND', 'Photo unavailable.');
    const data = await store.get(media.filename);
    check(data, 404, 'NOT_FOUND', 'Photo unavailable.');
    res
      .type(media.mime_type)
      .set({ 'Cache-Control': 'public, max-age=86400', 'Cross-Origin-Resource-Policy': 'cross-origin' })
      .send(data);
  });
}

export function routes(app, ctx) {
  const { db, one, now, check, roles, audit } = ctx;
  const admin = roles('admin');
  /** Sets an entry's gallery to exactly these photos: the admin's own unattached uploads or photos already on it. */
  async function attach(query, entryId, mediaIds, user) {
    const usable = await query(
      `SELECT id FROM media WHERE id = ANY(?::text[]) AND purpose='gallery' AND complaint_id IS NULL AND (content_id=? OR (content_id IS NULL AND owner_id=?)) FOR UPDATE`,
      [mediaIds, entryId, user.id],
    );
    check(usable.length === new Set(mediaIds).size, 400, 'INVALID_MEDIA', 'A gallery photo is unavailable.');
    await query(`UPDATE media SET content_id=NULL WHERE content_id=? AND NOT (id = ANY(?::text[]))`, [
      entryId,
      mediaIds,
    ]);
    await query('UPDATE media SET content_id=? WHERE id = ANY(?::text[])', [entryId, mediaIds]);
  }
  const data = input => ({
    title: input.title,
    body: input.body ?? null,
    summary: input.summary ?? null,
    fields: input.fields,
    mediaIds: input.mediaIds,
    sourceUrl: input.sourceUrl ?? null,
  });
  app.get('/api/v1/admin/content', admin, async (req, res) => {
    const f = parse(
      z
        .object({
          type: z.enum(contentTypes).optional(),
          status: z.enum(['draft', 'published', 'archived']).optional(),
        })
        .strip(),
      req.query,
    );
    const where = ['1=1'],
      values = [];
    if (f.type) {
      where.push('type=?');
      values.push(f.type);
    }
    if (f.status) {
      where.push('status=?');
      values.push(f.status);
    }
    res.json({
      entries: (
        await db.query(
          `SELECT * FROM content_entries WHERE ${where.join(' AND ')} ORDER BY type,sort,updated_at DESC LIMIT 1000`,
          values,
        )
      ).map(r => view(r, true)),
    });
  });
  app.post('/api/v1/admin/content', admin, async (req, res) => {
    const input = parse(contentEntry, req.body);
    const row = await db.transaction(async query => {
      const id = randomUUID(),
        time = now();
      const [row] = await query(
        'INSERT INTO content_entries(id,type,slug,data,status,sort,version,updated_by,published_at,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?,?,?) RETURNING *',
        [
          id,
          input.type,
          input.slug,
          JSON.stringify(data(input)),
          input.status,
          input.sort,
          req.user.id,
          input.status === 'published' ? time : null,
          time,
          time,
        ],
      );
      await attach(query, id, input.mediaIds, req.user);
      await audit(query, req, 'content.created', 'content', id, {
        type: input.type,
        slug: input.slug,
        status: input.status,
      });
      return row;
    });
    res.status(201).json({ entry: view(row, true) });
  });
  app.put('/api/v1/admin/content/:id', admin, async (req, res) => {
    const input = parse(contentUpdate, req.body);
    const row = await db.transaction(async query => {
      const current = await one('SELECT * FROM content_entries WHERE id=?', [req.params.id], query);
      check(current, 404, 'NOT_FOUND', 'Content unavailable.');
      const publishedAt =
        input.status === 'published' ? (current.published_at ?? now()) : current.published_at;
      const [row] = await query(
        'UPDATE content_entries SET type=?,slug=?,data=?,status=?,sort=?,version=version+1,updated_by=?,published_at=?,updated_at=? WHERE id=? AND version=? RETURNING *',
        [
          input.type,
          input.slug,
          JSON.stringify(data(input)),
          input.status,
          input.sort,
          req.user.id,
          publishedAt,
          now(),
          current.id,
          input.version,
        ],
      );
      check(row, 409, 'VERSION_CONFLICT', 'This entry changed. Refresh before saving.');
      await attach(query, current.id, input.mediaIds, req.user);
      await audit(query, req, 'content.updated', 'content', current.id, {
        from: current.status,
        to: input.status,
        version: row.version,
      });
      return row;
    });
    res.json({ entry: view(row, true) });
  });
}
