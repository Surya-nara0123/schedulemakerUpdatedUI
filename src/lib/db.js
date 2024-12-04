import { createPool } from '@neondatabase/server';

const pool = createPool({
  connectionString: process.env.DATABASE_URL, // Ensure DATABASE_URL is in your .env
});

export const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
};