import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config.js';
const base = { DATABASE_URL: 'postgres://x@localhost/db' };
test('production configuration refuses unsafe defaults and accepts a complete setup', () => {
  assert.throws(() => config({}), /DATABASE_URL/);
  assert.throws(() => config({ ...base, PORT: '99999' }), /PORT/);
  assert.throws(() => config({ ...base, NODE_ENV: 'production' }), /localhost[\s\S]*CONFIG_MASTER_KEY/);
  assert.throws(
    () =>
      config({
        ...base,
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://app.example.in',
        CONFIG_MASTER_KEY: 'k'.repeat(40),
        S3_BUCKET: 'b',
      }),
    /S3_ACCESS_KEY_ID/,
  );
  const ok = config({
    ...base,
    NODE_ENV: 'production',
    CORS_ORIGINS: 'https://app.example.in',
    CONFIG_MASTER_KEY: 'k'.repeat(40),
    SMTP_URL: 'smtps://u:p@smtp.example.in',
    SMS_PROVIDER: 'twilio',
    TWILIO_ACCOUNT_SID: 'a',
    TWILIO_AUTH_TOKEN: 'b',
    TWILIO_FROM: '+1',
  });
  assert.equal(ok.production, true);
  assert.equal(ok.delivery.allowLog, false);
  assert.equal(ok.requireVerified, true);
  assert.equal(ok.delivery.sms.provider, 'twilio');
  assert.equal(config(base).delivery.allowLog, true);
  assert.equal(
    config({
      ...base,
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://app.example.in',
      CONFIG_MASTER_KEY: 'k'.repeat(40),
      DELIVERY_ALLOW_LOG: 'true',
    }).delivery.allowLog,
    false,
    'production never prints messages (and their codes) to the log',
  );
  assert.equal(config({ ...base, REQUIRE_CLOSURE_EVIDENCE: 'false' }).requireClosureEvidence, false);
});

test('safeEqual compares bytes, so non-ASCII input is rejected instead of throwing', async () => {
  const { safeEqual } = await import('../src/security.js');
  assert.equal(safeEqual('Bearer é', 'Bearer ab'), false);
  assert.equal(safeEqual('same', 'same'), true);
});

test('production refuses a remote database without TLS and accepts one with a verified certificate', () => {
  const prod = {
    NODE_ENV: 'production',
    CORS_ORIGINS: 'https://admin.example.in',
    CONFIG_MASTER_KEY: 'k'.repeat(40),
  };
  const managed = 'postgresql://batra:pw@db-postgresql-blr1-12345.db.ondigitalocean.com:25060/batra';
  assert.throws(() => config({ ...prod, DATABASE_URL: managed }), /must use TLS/);
  const ok = config({
    ...prod,
    DATABASE_URL: `${managed}?sslmode=verify-full&sslrootcert=certs/ca.crt`,
    DATABASE_POOL_SIZE: '5',
  });
  assert.equal(ok.poolSize, 5);
  assert.doesNotThrow(() => config({ ...prod, DATABASE_URL: 'postgres://batra:pw@db:5432/batra_connect' }));
  assert.doesNotThrow(() => config({ ...prod, DATABASE_URL: 'postgres://batra:pw@postgres:5432/batra' }));
});
