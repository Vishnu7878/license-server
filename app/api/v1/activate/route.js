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

  const existing = await sql`
    update activations set last_seen = now(), ip = ${clientIp(req)}
    where license_id = ${lic.id} and machine_id = ${b.machine_id}
    returning id`;

  if (!existing.length) {
    // Insert only if under the activation limit (atomic check inside the statement)
    const inserted = await sql`
      insert into activations (license_id, machine_id, label, ip)
      select ${lic.id}, ${b.machine_id}, ${b.label}, ${clientIp(req)}
      where (select count(*) from activations where license_id = ${lic.id}) < ${lic.max_activations}
      on conflict do nothing
      returning id`;
    if (!inserted.length) return publicJson({ valid: false, error: 'activation_limit_reached' }, 403);
  }
  return publicJson(okResponse(lic, b.machine_id));
}
