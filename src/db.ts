import { Pool } from 'pg';

export const pool = new Pool({
  user: 'postgres',
  host: 'db.iejechwgqhugtazoqhqf.supabase.co',
  database: 'postgres',
  password: 'Purnea22#',
  port: 5432,
  ssl: { rejectUnauthorized: false },
});
