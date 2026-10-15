import { createDatabase } from '../src/db.js';
import { config } from '../src/config.js';
const db = await createDatabase(config());
console.log(`Database schema ready (${db.engine}).`);
await db.close();
