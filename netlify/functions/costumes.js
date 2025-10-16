import { neon } from '@neondatabase/serverless';

export async function handler(event, context) {
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql/*sql*/`
    select id, name, image_url, tags, price from costumes
  `;
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(rows)
  };
}
