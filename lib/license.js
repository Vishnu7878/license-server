import crypto from 'node:crypto';
import { sql } from './db';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars, no I/O/0/1

export function generateKey(product = 'LIC') {
  const prefix = product.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'LIC';
  const bytes = crypto.randomBytes(16);
  const groups = [0, 1, 2, 3].map((g) =>
    Array.from(bytes.subarray(g * 4, g * 4 + 4)).map((b) => ALPHABET[b % 32]).join('')
  );
  return [prefix, ...groups].join('-');
}

export async function findLicense(key) {
  if (typeof key !== 'string' || key.length > 64) return null;
  const rows = await sql`select * from licenses where key = ${key.trim().toUpperCase()} limit 1`;
  return rows[0] || null;
}

// Returns an error code, or null if the license is usable.
export function checkLicense(lic, product) {
  if (!lic) return 'not_found';
  if (lic.status !== 'active') return 'revoked';
  if (lic.expires_at && new Date(lic.expires_at) < new Date()) return 'expired';
  if (product && lic.product !== product) return 'wrong_product';
  return null;
}

// Signed token the client can verify offline with the public key.
export function signToken(lic, machineId) {
  const b64 = process.env.SIGNING_PRIVATE_KEY_B64;
  if (!b64) return null;
  const key = crypto.createPrivateKey(Buffer.from(b64, 'base64').toString('utf8'));
  const payload = JSON.stringify({
    key: lic.key,
    product: lic.product,
    plan: lic.plan,
    machine_id: machineId,
    expires_at: lic.expires_at,
    issued_at: new Date().toISOString(),
  });
  const signature = crypto.sign(null, Buffer.from(payload), key).toString('base64');
  return { payload, signature };
}

export function okResponse(lic, machineId) {
  return {
    valid: true,
    license: {
      product: lic.product,
      plan: lic.plan,
      customer_name: lic.customer_name,
      expires_at: lic.expires_at,
      max_activations: lic.max_activations,
    },
    token: signToken(lic, machineId),
  };
}

export async function readBody(req) {
  try {
    const b = await req.json();
    const machine_id = typeof b.machine_id === 'string' ? b.machine_id.slice(0, 200) : '';
    return {
      key: b.key,
      product: typeof b.product === 'string' ? b.product : null,
      machine_id,
      label: typeof b.label === 'string' ? b.label.slice(0, 100) : null,
    };
  } catch {
    return null;
  }
}
