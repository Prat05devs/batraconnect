import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createDatabase } from '../src/db.js';
import { config } from '../src/config.js';
import { hashPassword } from '../src/security.js';
import { email, password, parse, placeKey, staffRoles } from '../src/validation.js';
// Bootstraps staff (normally the first administrator). Later staff are created in the app by an administrator.
const input = parse(
  z.object({
    name: z.string().min(2).max(100),
    email,
    password,
    role: z.enum(staffRoles),
    district: z.string().max(80).optional(),
    category: z.string().max(60).optional(),
  }),
  {
    name: process.env.STAFF_NAME,
    email: process.env.STAFF_EMAIL,
    password: process.env.STAFF_PASSWORD,
    role: process.env.STAFF_ROLE,
    district: process.env.STAFF_DISTRICT,
    category: process.env.STAFF_CATEGORY,
  },
);
if (['field', 'department'].includes(input.role) && (!input.district || !input.category))
  throw new Error('STAFF_DISTRICT and STAFF_CATEGORY are required for scoped staff.');
const db = await createDatabase(config());
try {
  await db.transaction(async query => {
    const id = randomUUID(),
      time = new Date().toISOString(),
      district = input.district ? placeKey(input.district) : null;
    if (district && !(await query('SELECT 1 FROM districts WHERE key=?', [district])).length)
      throw new Error(`Unknown district: ${input.district}`);
    if (
      input.category &&
      !(await query('SELECT 1 FROM complaint_categories WHERE name=?', [input.category])).length
    )
      throw new Error(`Unknown category: ${input.category}`);
    await query(
      'INSERT INTO users(id,name,email,password_hash,role,created_at,updated_at,email_verified_at,status) VALUES(?,?,?,?,?,?,?,?,?)',
      [
        id,
        input.name,
        input.email,
        await hashPassword(input.password),
        input.role,
        time,
        time,
        time,
        'active',
      ],
    );
    if (district && input.category)
      await query('INSERT INTO staff_jurisdictions(user_id,district,category) VALUES(?,?,?)', [
        id,
        district,
        input.category,
      ]);
    await query(
      'INSERT INTO audit_log(id,actor_id,action,target_type,target_id,details,created_at) VALUES(?,?,?,?,?,?,?)',
      [randomUUID(), null, 'cli.staff_created', 'user', id, JSON.stringify({ role: input.role }), time],
    );
  });
  console.log('Staff account created.');
} finally {
  await db.close();
}
