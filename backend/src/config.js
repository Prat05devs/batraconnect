const int = (env, name, fallback, min, max) => {
  const value = Number(env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  return value;
};
const flag = (env, name, fallback) => (env[name] ?? String(fallback)).toLowerCase() === 'true';

export function config(env = process.env) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required. Start PostgreSQL and configure .env.');
  const production = env.NODE_ENV === 'production';
  const options = {
    url: env.DATABASE_URL,
    // Keep below the database's connection limit (Supabase's pooler allows about 15 on the smallest plan).
    poolSize: int(env, 'DATABASE_POOL_SIZE', 10, 1, 100),
    production,
    mediaDir: env.MEDIA_DIR ?? './data/media',
    host: env.HOST ?? '127.0.0.1',
    port: int(env, 'PORT', 4000, 0, 65535),
    sessionDays: int(env, 'SESSION_DAYS', 7, 1, 30),
    trustProxyHops: int(env, 'TRUST_PROXY_HOPS', 0, 0, 5),
    origins: (env.CORS_ORIGINS ?? 'http://localhost:8081,http://localhost:8092')
      .split(',')
      .map(v => v.trim())
      .filter(Boolean),
    requireVerified: flag(env, 'REQUIRE_VERIFIED_CONTACT', true),
    requireClosureEvidence: flag(env, 'REQUIRE_CLOSURE_EVIDENCE', true),
    jobs: flag(env, 'RUN_JOBS', true),
    jobIntervalSeconds: int(env, 'JOB_INTERVAL_SECONDS', 60, 5, 3600),
    retentionDays: int(env, 'CLOSED_REPORT_RETENTION_DAYS', 0, 0, 36500),
    metricsToken: env.METRICS_TOKEN ?? '',
    masterKey: env.CONFIG_MASTER_KEY ?? '',
    s3: env.S3_BUCKET
      ? {
          bucket: env.S3_BUCKET,
          region: env.S3_REGION || 'auto',
          endpoint: env.S3_ENDPOINT || undefined,
          forcePathStyle: flag(env, 'S3_FORCE_PATH_STYLE', false),
          accessKeyId: env.S3_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        }
      : null,
    delivery: {
      from: env.EMAIL_FROM || 'Batra Connect <no-reply@localhost>',
      smtpUrl: env.SMTP_URL ?? '',
      expoAccessToken: env.EXPO_ACCESS_TOKEN ?? '',
      sms:
        env.SMS_PROVIDER === 'twilio'
          ? {
              provider: 'twilio',
              accountSid: env.TWILIO_ACCOUNT_SID,
              authToken: env.TWILIO_AUTH_TOKEN,
              from: env.TWILIO_FROM,
            }
          : null,
      // Logging messages instead of sending them prints sign-in codes, so it is never allowed in production.
      allowLog: !production && flag(env, 'DELIVERY_ALLOW_LOG', true),
    },
  };
  if (production) {
    const problems = [];
    if (options.origins.some(o => /localhost|127\.0\.0\.1/.test(o)))
      problems.push('CORS_ORIGINS must not include localhost in production.');
    if (options.origins.some(o => !o.startsWith('https://')))
      problems.push('CORS_ORIGINS must use https:// in production.');
    if (options.s3 && (!options.s3.accessKeyId || !options.s3.secretAccessKey))
      problems.push('S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required with S3_BUCKET.');
    if (
      options.delivery.sms &&
      (!options.delivery.sms.accountSid || !options.delivery.sms.authToken || !options.delivery.sms.from)
    )
      problems.push(
        'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM are required with SMS_PROVIDER=twilio.',
      );
    const database = new URL(options.url);
    if (
      !['localhost', '127.0.0.1', 'db'].includes(database.hostname) &&
      !['require', 'verify-ca', 'verify-full', 'no-verify'].includes(database.searchParams.get('sslmode'))
    )
      problems.push(
        'DATABASE_URL points to another machine, so it must use TLS: add ?sslmode=verify-full&sslrootcert=<CA file> (Supabase: download the CA certificate from Database settings).',
      );
    if (options.metricsToken && options.metricsToken.length < 24)
      problems.push('METRICS_TOKEN must be at least 24 characters.');
    if ((options.masterKey ?? '').length < 32)
      problems.push(
        'CONFIG_MASTER_KEY must be at least 32 random characters (it encrypts keys saved in the dashboard).',
      );
    if (problems.length) throw new Error(`Invalid production configuration:\n- ${problems.join('\n- ')}`);
  }
  return options;
}
