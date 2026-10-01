import { sql } from '@/lib/db';
import { json } from '@/lib/http';
import { isAdmin } from '@/lib/auth';
import { generateKey } from '@/lib/license';

export async function GET(req) {
  if (!isAdmin(req)) return json({ error: 'unauthorized' }, 401);
  const rows = await sql`
    select l.*, count(a.id)::int as activations
    from licenses l left join activations a on a.license_id = l.id
    group by l.id order by l.created_at desc limit 500`;
  return json({ licenses: rows });
}

export async function POST(req) {
  if (!isAdmin(req)) return json({ error: 'unauthorized' }, 401);
  const b = await req.json().catch(() => null);
  if (!b || !b.product?.trim()) return json({ error: 'product is required' }, 400);

  const max = Math.max(1, parseInt(b.max_activations, 10) || 1);
  const expires = b.expires_at ? new Date(b.expires_at) : null;
  if (expires && isNaN(expires)) return json({ error: 'invalid expires_at' }, 400);

  const key = generateKey(b.product);
  const rows = await sql`
    insert into licenses (key, product, plan, customer_name, customer_email, max_activations, expires_at, notes)
    values (${key}, ${b.product.trim()}, ${b.plan || 'standard'}, ${b.customer_name || null},
            ${b.customer_email || null}, ${max}, ${expires ? expires.toISOString() : null}, ${b.notes || null})
    returning *`;
  return json({ license: rows[0] }, 201);
}
