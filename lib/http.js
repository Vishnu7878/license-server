export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
export const json = (data, status = 200, headers = {}) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
export const publicJson = (data, status = 200) => json(data, status, cors);
export const preflight = () => new Response(null, { status: 204, headers: cors });
export const clientIp = (req) =>
  (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null;
