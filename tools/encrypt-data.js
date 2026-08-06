// Run locally before each push: node tools/encrypt-data.js <passphrase>
// Reads the plaintext source files in data/ (gitignored) and writes the
// single encrypted bundle that actually gets committed: data/bundle.enc.json
const { webcrypto } = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ITERATIONS = 250000;

async function main() {
  const passphrase = process.argv[2] || process.env.ENCRYPT_PASSPHRASE;
  if (!passphrase) {
    console.error('Usage: node tools/encrypt-data.js <passphrase>');
    process.exit(1);
  }

  const itinerary = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/itinerary.json'), 'utf8'));
  const locations = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/locations.json'), 'utf8'));
  const facts = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/facts.json'), 'utf8'));
  const bundlePlain = JSON.stringify({ itinerary, locations, facts });

  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));

  const baseKey = await webcrypto.subtle.importKey(
    'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  const key = await webcrypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const ciphertext = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(bundlePlain)
  );

  const out = {
    salt: Buffer.from(salt).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
    iterations: ITERATIONS,
    ciphertext: Buffer.from(ciphertext).toString('base64')
  };

  fs.writeFileSync(path.join(ROOT, 'data/bundle.enc.json'), JSON.stringify(out));
  console.log('Wrote data/bundle.enc.json (' + out.ciphertext.length + ' base64 chars)');
}

main().catch((err) => { console.error(err); process.exit(1); });
