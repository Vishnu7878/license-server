// Generates an Ed25519 key pair. Put the private key in Vercel env, ship the public key in your app.
const { generateKeyPairSync } = require('node:crypto');
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const priv = privateKey.export({ type: 'pkcs8', format: 'pem' });
const pub = publicKey.export({ type: 'spki', format: 'pem' });
console.log('SIGNING_PRIVATE_KEY_B64=' + Buffer.from(priv).toString('base64'));
console.log('\nPublic key (embed in your client app):\n' + pub);
