import crypto from 'node:crypto';

export function isAdmin(req) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const a = Buffer.from(token);
  const b = Buffer.from(process.env.ADMIN_TOKEN || '');
  return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}
