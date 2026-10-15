/** express-rate-limit store shared by every API replica through PostgreSQL. */
export class PostgresRateStore {
  localKeys = false;
  constructor(db, prefix) {
    this.db = db;
    this.prefix = prefix;
  }
  init(options) {
    this.windowMs = options.windowMs;
  }
  async increment(key) {
    const [row] = await this.db.query(
      `INSERT INTO rate_limits(key,hits,reset_at) VALUES(?,1,now() + (? * interval '1 millisecond'))
   ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.reset_at<=now() THEN 1 ELSE rate_limits.hits+1 END,
   reset_at=CASE WHEN rate_limits.reset_at<=now() THEN EXCLUDED.reset_at ELSE rate_limits.reset_at END RETURNING hits,reset_at`,
      [this.prefix + key, this.windowMs],
    );
    return { totalHits: row.hits, resetTime: new Date(row.reset_at) };
  }
  async decrement(key) {
    await this.db.query('UPDATE rate_limits SET hits=GREATEST(hits-1,0) WHERE key=?', [this.prefix + key]);
  }
  async resetKey(key) {
    await this.db.query('DELETE FROM rate_limits WHERE key=?', [this.prefix + key]);
  }
}
