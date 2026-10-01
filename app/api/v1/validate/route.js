import { sql } from '@/lib/db';
import { publicJson, preflight, clientIp } from '@/lib/http';
import { findLicense, checkLicense, okResponse, readBody } from '@/lib/license';

export const OPTIONS = preflight;

export async function POST(req) {
  const b = await readBody(req);
  if (!b || !b.key || !b.machine_id) return publicJson({ valid: false, error: 'bad_request' }, 400);

  const lic = await findLicense(b.key);
  const err = checkLicense(lic, b.product);
  if (err) return publicJson({ valid: false, error: err }, 403);

  const rows = await sql`
    update activations set last_seen = now(), ip = ${clientIp(req)}
    where license_id = ${lic.id} and machine_id = ${b.machine_id}
    returning id`;
  if (!rows.length) return publicJson({ valid: false, error: 'not_activated' }, 403);

  return publicJson(okResponse(lic, b.machine_id));
}
