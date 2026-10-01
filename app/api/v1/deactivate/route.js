import { sql } from '@/lib/db';
import { publicJson, preflight } from '@/lib/http';
import { findLicense, readBody } from '@/lib/license';

export const OPTIONS = preflight;

export async function POST(req) {
  const b = await readBody(req);
  if (!b || !b.key || !b.machine_id) return publicJson({ ok: false, error: 'bad_request' }, 400);

  const lic = await findLicense(b.key);
  if (!lic) return publicJson({ ok: false, error: 'not_found' }, 404);

  await sql`delete from activations where license_id = ${lic.id} and machine_id = ${b.machine_id}`;
  return publicJson({ ok: true });
}
