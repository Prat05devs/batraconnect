import sharp from 'sharp';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/security.js';
export const password = 'Synthetic-test-password-123';
export const png = await sharp({ create: { width: 8, height: 6, channels: 3, background: '#336699' } })
  .withMetadata({ exif: { IFD0: { Copyright: 'synthetic' } } })
  .png()
  .toBuffer();
export const report = {
  category: 'Road & Transport',
  title: 'Damaged road near school',
  description: 'There is a large pothole beside the school entrance.',
  district: ' Haridwar ',
  locality: 'School entrance',
  mediaIds: [],
};
/** Isolated PostgreSQL schema, temporary media directory and an API server on a random port. */
export async function fixture(t, appOptions = {}) {
  if (!process.env.TEST_DATABASE_URL)
    throw new Error('TEST_DATABASE_URL is required; use an isolated PostgreSQL test database.');
  const dir = await mkdtemp(join(tmpdir(), 'batra-api-'));
  const admin = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await admin.connect();
  const schema = `batra_test_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const connection = new URL(process.env.TEST_DATABASE_URL);
  connection.searchParams.set('options', `-c search_path=${schema}`);
  const url = connection.toString();
  const db = await createDatabase({ url, poolSize: 5 });
  const app = await createApp({
    db,
    mediaDir: dir,
    testing: true,
    origins: ['http://allowed.test'],
    ...appOptions,
  });
  const server = await new Promise(resolve => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await db.close();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
    await rm(dir, { recursive: true, force: true });
  });
  const request = async (method, path, body, token, headers = {}) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    });
    const type = response.headers.get('content-type') ?? '';
    const data =
      response.status === 204
        ? null
        : type.includes('json')
          ? await response.json()
          : type.startsWith('text')
            ? await response.text()
            : await response.arrayBuffer();
    return { status: response.status, data, headers: response.headers };
  };
  const verify = id =>
    db.query('UPDATE users SET email_verified_at=? WHERE id=?', [new Date().toISOString(), id]);
  const register = async (email = 'citizen@test.invalid', { verified = true, ...extra } = {}) => {
    const data = (
      await request('POST', '/api/v1/auth/register', { name: 'Synthetic Citizen', email, password, ...extra })
    ).data;
    if (verified) await verify(data.user.id);
    return data;
  };
  const staff = async (role, district = 'haridwar', category = 'Road & Transport') => {
    const email = `${role}-${randomUUID()}@test.invalid`,
      id = randomUUID();
    await db.query(
      'INSERT INTO users(id,name,email,password_hash,role,created_at,email_verified_at) VALUES(?,?,?,?,?,?,?)',
      [
        id,
        `Synthetic ${role}`,
        email,
        await hashPassword(password),
        role,
        new Date().toISOString(),
        new Date().toISOString(),
      ],
    );
    if (['field', 'department'].includes(role))
      await db.query('INSERT INTO staff_jurisdictions(user_id,district,category) VALUES(?,?,?)', [
        id,
        district,
        category,
      ]);
    return { id, email, ...(await request('POST', '/api/v1/auth/login', { email, password })).data };
  };
  /** Latest one-time code queued for a destination (read from the outbox before delivery clears it). */
  const lastCode = async destination => {
    const [row] = await db.query(
      'SELECT body FROM outbox WHERE destination=? ORDER BY created_at DESC,id DESC LIMIT 1',
      [destination],
    );
    return row?.body?.match(/\b(\d{6})\b/)?.[1];
  };
  const photo = async token => {
    const form = new FormData();
    form.append('photo', new Blob([png], { type: 'image/png' }), 'photo.png');
    return (await request('POST', '/api/v1/media', form, token)).data.media;
  };
  const submit = async (token, body = report) =>
    (await request('POST', '/api/v1/complaints', body, token, { 'Idempotency-Key': randomUUID() })).data
      .complaint;
  return {
    db,
    url,
    app,
    jobs: app.locals.jobs,
    sent: app.locals.transports.sent,
    request,
    register,
    staff,
    verify,
    lastCode,
    photo,
    submit,
  };
}
