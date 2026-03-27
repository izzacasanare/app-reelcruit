import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.ts';

const APP_ID = 'reelcruit2025mspbots01';

const sql = postgres({
  host:     '20.241.40.252',
  port:     15432,
  database: 'mb_app_agentint',
  user:     `user_${APP_ID}`,
  password: `pass_${APP_ID}`,
  ssl:      false,
  connection: { timezone: 'UTC' },
  max: 10,
});

export const db = drizzle(sql, { schema });
