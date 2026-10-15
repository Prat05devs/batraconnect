import { randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const digest = value => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt:${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [algorithm, salt, encoded] = stored.split(':');
  if (algorithm !== 'scrypt' || !salt || !encoded) return false;
  const expected = Buffer.from(encoded, 'hex');
  const actual = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export const newToken = () => randomBytes(32).toString('base64url');
/** Six-digit one-time code; stored only as a hash bound to its record id. */
export const newCode = () => String(randomInt(0, 1000000)).padStart(6, '0');
export const codeHash = (id, code) => digest(`${id}:${code}`);
export const safeEqual = (a, b) => {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
export const safeUser = (user, jurisdictions = user.jurisdictions ?? []) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status ?? 'active',
  language: user.language ?? 'en',
  emailVerified: !!user.email_verified_at,
  phone: user.phone ?? null,
  phoneVerified: !!user.phone_verified_at,
  jurisdictions: jurisdictions.map(j => ({ district: j.district, category: j.category })),
});
