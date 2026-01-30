#!/usr/bin/env node
/**
 * Encrypt Relayer Secret Key
 * 
 * Usage: npx ts-node scripts/encrypt-relayer-secret.ts <SECRET_KEY>
 * 
 * This will output the encrypted secret that you can add to your .env file.
 */

import crypto from "crypto";

const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_SECRET || "default-aethera-dev-key";

function encryptSecret(secret: string): string {
  const key = crypto
    .createHash("sha256")
    .update(ENCRYPTION_KEY)
    .digest("base64")
    .slice(0, 32);

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(key),
    iv
  );

  let encrypted = cipher.update(secret);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

const secretKey = process.argv[2];

if (!secretKey) {
  console.error("Usage: npx ts-node scripts/encrypt-relayer-secret.ts <SECRET_KEY>");
  console.error("");
  console.error("Where SECRET_KEY is your Stellar secret key (starts with 'S')");
  process.exit(1);
}

// Validate it looks like a Stellar secret key
if (!secretKey.startsWith("S") || secretKey.length !== 56) {
  console.error("Error: Invalid Stellar secret key format");
  console.error("Secret keys should start with 'S' and be 56 characters long");
  process.exit(1);
}

const encryptedSecret = encryptSecret(secretKey);

console.log("");
console.log("✅ Secret key encrypted successfully!");
console.log("");
console.log("Add these lines to your apps/api/.env file:");
console.log("");
console.log("# Admin Relayer Wallet");
console.log(`ADMIN_RELAYER_PUBLIC_KEY=${process.env.ADMIN_RELAYER_PUBLIC_KEY || "GAPTLSU5SPPGZBGS3Y45EJG5U6ZJ7VARO4OLD76TSQGG25RNEFCTG2P3"}`);
console.log(`ADMIN_RELAYER_SECRET_ENCRYPTED=${encryptedSecret}`);
console.log("");
