import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';

const audience = z.object({ citizens: z.boolean(), officers: z.boolean() }).strict();
/**
 * Everything the web dashboard can change. Adding a setting = adding an entry here; the API validates it,
 * stores it (secrets encrypted) and the dashboard shows it. Behaviour that must never be switched off
 * (privacy scopes, the own-report rule, the audit log) is deliberately not listed.
 */
export const definitions = {
  features: {
    schema: z.object({ reports: audience, ideas: audience, appointments: audience }).strict(),
    defaults: {
      reports: { citizens: true, officers: true },
      ideas: { citizens: true, officers: true },
      appointments: { citizens: true, officers: true },
    },
    public: true,
  },
  app: {
    schema: z
      .object({ maintenanceMessage: z.string().trim().max(300), requireClosureEvidence: z.boolean() })
      .strict(),
    defaults: { maintenanceMessage: '', requireClosureEvidence: true },
    public: true,
  },
  'integration.email': {
    schema: z.object({ from: z.string().trim().max(200) }).strict(),
    defaults: { from: '' },
    secrets: z
      .object({
        smtpUrl: z
          .string()
          .trim()
          .regex(/^smtps?:\/\/.+/, 'Use smtp:// or smtps://')
          .max(500),
      })
      .partial()
      .strict(),
  },
  'integration.sms': {
    schema: z
      .object({
        accountSid: z
          .string()
          .trim()
          .regex(/^(AC[0-9a-f]{32})?$/, 'A Twilio Account SID starts with AC followed by 32 characters.'),
        from: z.string().trim().max(30),
      })
      .strict(),
    defaults: { accountSid: '', from: '' },
    secrets: z
      .object({ authToken: z.string().trim().min(8).max(200) })
      .partial()
      .strict(),
  },
  'integration.push': {
    schema: z.object({}).strict(),
    defaults: {},
    secrets: z
      .object({ expoAccessToken: z.string().trim().min(10).max(300) })
      .partial()
      .strict(),
  },
};

export function createSettings({ db, masterKey, production }) {
  if (!masterKey && production)
    throw new Error(
      'CONFIG_MASTER_KEY is required in production (32+ random characters) to encrypt dashboard-managed keys.',
    );
  const key = createHash('sha256')
    .update(masterKey || 'development-only-master-key')
    .digest();
  const encrypt = data => {
    const iv = randomBytes(12),
      cipher = createCipheriv('aes-256-gcm', key, iv);
    const body = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
  };
  const decrypt = sealed => {
    if (!sealed) return {};
    const raw = Buffer.from(sealed, 'base64'),
      decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8'));
  };
  let cache = null,
    loadedAt = 0;
  async function load() {
    // Short cache so several API servers pick up a change within seconds.
    if (cache && Date.now() - loadedAt < 5000) return cache;
    const rows = await db.query('SELECT key,value,secret,updated_at FROM app_settings');
    cache = new Map(rows.map(r => [r.key, r]));
    loadedAt = Date.now();
    return cache;
  }
  async function get(name) {
    const def = definitions[name],
      row = (await load()).get(name);
    return { ...def.defaults, ...(row?.value ?? {}), ...(row?.secret ? decrypt(row.secret) : {}) };
  }
  /** Values for the dashboard: secrets are never returned, only whether they are set and their last 4 characters. */
  async function view(name) {
    const def = definitions[name],
      row = (await load()).get(name),
      secrets = row?.secret ? decrypt(row.secret) : {};
    const masked = Object.fromEntries(
      Object.keys(def.secrets?.shape ?? {}).map(field => [
        field,
        secrets[field] ? { set: true, hint: `••••${String(secrets[field]).slice(-4)}` } : { set: false },
      ]),
    );
    return {
      ...def.defaults,
      ...(row?.value ?? {}),
      ...(def.secrets ? { secrets: masked } : {}),
      updatedAt: row?.updated_at ?? null,
    };
  }
  async function save(query, name, value, secretPatch, userId) {
    const def = definitions[name],
      [current] = await query('SELECT * FROM app_settings WHERE key=?', [name]);
    const nextValue = def.schema.parse({ ...def.defaults, ...(current?.value ?? {}), ...value });
    let secret = current?.secret ?? null;
    if (def.secrets && secretPatch && Object.keys(secretPatch).length) {
      const merged = { ...(secret ? decrypt(secret) : {}), ...def.secrets.parse(secretPatch) };
      for (const [field, v] of Object.entries(merged)) if (v === '') delete merged[field];
      secret = Object.keys(merged).length ? encrypt(merged) : null;
    }
    const time = new Date().toISOString();
    if (current)
      await query(
        'INSERT INTO app_settings_history(id,key,value,secret,updated_by,created_at) VALUES(?,?,?,?,?,?)',
        [randomUUID(), name, JSON.stringify(current.value), current.secret, current.updated_by, time],
      );
    await query(
      'INSERT INTO app_settings(key,value,secret,updated_by,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,secret=EXCLUDED.secret,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at',
      [name, JSON.stringify(nextValue), secret, userId, time],
    );
    cache = null;
  }
  async function restorePrevious(query, name, userId) {
    const [previous] = await query(
      'SELECT * FROM app_settings_history WHERE key=? ORDER BY created_at DESC LIMIT 1',
      [name],
    );
    if (!previous) return false;
    const [current] = await query('SELECT * FROM app_settings WHERE key=?', [name]);
    const time = new Date().toISOString();
    await query('DELETE FROM app_settings_history WHERE id=?', [previous.id]);
    if (current)
      await query(
        'INSERT INTO app_settings_history(id,key,value,secret,updated_by,created_at) VALUES(?,?,?,?,?,?)',
        [randomUUID(), name, JSON.stringify(current.value), current.secret, current.updated_by, time],
      );
    await query('UPDATE app_settings SET value=?,secret=?,updated_by=?,updated_at=? WHERE key=?', [
      JSON.stringify(previous.value),
      previous.secret,
      userId,
      time,
      name,
    ]);
    cache = null;
    return true;
  }
  /** Delivery providers: keys saved in the dashboard win; otherwise the server's environment configuration is used. */
  async function delivery(base) {
    const email = await get('integration.email'),
      sms = await get('integration.sms'),
      push = await get('integration.push');
    return {
      ...base,
      smtpUrl: email.smtpUrl || base.smtpUrl,
      from: email.from || base.from,
      expoAccessToken: push.expoAccessToken || base.expoAccessToken,
      sms:
        sms.accountSid && sms.authToken && sms.from
          ? { provider: 'twilio', accountSid: sms.accountSid, authToken: sms.authToken, from: sms.from }
          : base.sms,
    };
  }
  async function source(name, base) {
    const value = await get(name);
    if (name === 'integration.email') return value.smtpUrl ? 'dashboard' : base.smtpUrl ? 'server' : 'none';
    if (name === 'integration.sms')
      return value.accountSid && value.authToken && value.from ? 'dashboard' : base.sms ? 'server' : 'none';
    return value.expoAccessToken ? 'dashboard' : base.expoAccessToken ? 'server' : 'none';
  }
  return {
    get,
    view,
    save,
    restorePrevious,
    delivery,
    source,
    invalidate: () => {
      cache = null;
    },
  };
}
