# Centralized license server (Vercel + Postgres)

One deployment manages licenses for any number of products. Includes an admin dashboard, an admin API, and a public client API.

## Deploy

1. `npm install`
2. Create a Postgres database (Vercel dashboard → Storage → Neon). It adds `DATABASE_URL` automatically.
3. Run `schema.sql` in the Neon SQL editor.
4. (Recommended) `npm run gen-keys` → set `SIGNING_PRIVATE_KEY_B64` in Vercel, embed the printed public key in your app.
5. Set `ADMIN_TOKEN` in Vercel (long random string: `openssl rand -hex 32`).
6. `vercel --prod` (or push to Git and import the repo).
7. Open the site, sign in with `ADMIN_TOKEN`, issue a license.

## Client API (public)

All endpoints: `POST`, JSON body `{ "key", "machine_id", "product", "label?" }`.

| Endpoint | Purpose |
|---|---|
| `/api/v1/activate` | Binds a device to the license (enforces max devices) |
| `/api/v1/validate` | Periodic check; updates last-seen |
| `/api/v1/deactivate` | Frees the device slot |

```bash
curl -X POST https://YOUR-APP.vercel.app/api/v1/activate \
  -H 'Content-Type: application/json' \
  -d '{"key":"MYAPP-XXXX-XXXX-XXXX-XXXX","machine_id":"device-123","product":"my-app"}'
```

Success: `{ "valid": true, "license": {...}, "token": { "payload": "...", "signature": "..." } }`
Failure (HTTP 403): `{ "valid": false, "error": "not_found | revoked | expired | wrong_product | activation_limit_reached | not_activated" }`

### Verifying the signed token offline (Node)

```js
import crypto from 'node:crypto';
const ok = crypto.verify(null, Buffer.from(token.payload),
  PUBLIC_KEY_PEM, Buffer.from(token.signature, 'base64'));
```
Also check `payload.machine_id` matches the device and `expires_at` hasn't passed.

## Admin API

Header: `Authorization: Bearer $ADMIN_TOKEN`

- `GET  /api/admin/licenses`
- `POST /api/admin/licenses` `{ product, plan, customer_name, customer_email, max_activations, expires_at, notes }`
- `GET  /api/admin/licenses/:id` → activations
- `PATCH /api/admin/licenses/:id` `{ action: revoke | restore | reset_activations | remove_activation | update }`
- `DELETE /api/admin/licenses/:id`

## Hardening before production

- Add rate limiting on `/api/v1/*` (Vercel WAF rules or Upstash Ratelimit).
- Restrict CORS in `lib/http.js` if only browsers from your domain call it.
- Rotate `ADMIN_TOKEN` periodically; consider adding SSO in front of the dashboard (Vercel Authentication / Deployment Protection).
