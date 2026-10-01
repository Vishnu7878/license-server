import { sql } from '@/lib/db';
import { json } from '@/lib/http';
import { isAdmin } from '@/lib/auth';

const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(req, { params }) {
  if (!isAdmin(req)) return json({ error: 'unauthorized' }, 401);
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: 'bad id' }, 400);
  const acts = await sql`select * from activations where license_id = ${id} order by last_seen desc`;
  return json({ activations: acts });
}

export async function PATCH(req, { params }) {
  if (!isAdmin(req)) return json({ error: 'unauthorized' }, 401);
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: 'bad id' }, 400);
  const b = await req.json().catch(() => ({}));

  switch (b.action) {
    case 'revoke':
      await sql`update licenses set status = 'revoked' where id = ${id}`; break;
    case 'restore':
      await sql`update licenses set status = 'active' where id = ${id}`; break;
    case 'reset_activations':
      await sql`delete from activations where license_id = ${id}`; break;
    case 'remove_activation':
      await sql`delete from activations where license_id = ${id} and machine_id = ${b.machine_id}`; break;
    case 'update': {
      const max = Math.max(1, parseInt(b.max_activations, 10) || 1);
      const expires = b.expires_at ? new Date(b.expires_at) : null;
      await sql`update licenses set max_activations = ${max},
                  expires_at = ${expires ? expires.toISOString() : null},
                  plan = coalesce(${b.plan || null}, plan),
                  notes = ${b.notes ?? null}
                where id = ${id}`;
      break;
    }
    default:
      return json({ error: 'unknown action' }, 400);
  }
  return json({ ok: true });
}

export async function DELETE(req, { params }) {
  if (!isAdmin(req)) return json({ error: 'unauthorized' }, 401);
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: 'bad id' }, 400);
  await sql`delete from licenses where id = ${id}`;
  return json({ ok: true });
}
