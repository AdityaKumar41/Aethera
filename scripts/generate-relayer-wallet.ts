#!/usr/bin/env node
/**
 * Generate a New Relayer Wallet
 * 
 * This creates a fresh Stellar keypair for use as the admin relayer.
 * The wallet is funded via Friendbot (testnet only).
 */

import crypto from "crypto";
import { Keypair } from "@stellar/stellar-sdk";

const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_SECRET || "your-wallet-encryption-secret-change-in-production";

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

async function fundWithFriendbot(publicKey: string): Promise<boolean> {
  try {
    console.log("⏳ Funding wallet via Friendbot...");
    const response = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
    const data = await response.json();
    return data.successful === true || response.ok;
  } catch (error) {
    console.error("Failed to fund via Friendbot:", error);
    return false;
  }
}

async function main() {
  console.log("");
  console.log("🔑 Generating new Stellar keypair for Admin Relayer...");
  console.log("");

  // Generate new keypair
  const keypair = Keypair.random();
  const publicKey = keypair.publicKey();
  const secretKey = keypair.secret();

  console.log("✅ Keypair generated!");
  console.log(`   Public Key:  ${publicKey}`);
  console.log("");

  // Fund on testnet
  const funded = await fundWithFriendbot(publicKey);
  if (funded) {
    console.log("✅ Wallet funded with 10,000 XLM on testnet!");
  } else {
    console.log("⚠️  Could not fund via Friendbot (may already exist or network issue)");
  }

  // Encrypt the secret
  const encryptedSecret = encryptSecret(secretKey);

  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("📝 Add these lines to your apps/api/.env file:");
  console.log("");
  console.log("# Admin Relayer Wallet (auto-generated)");
  console.log(`ADMIN_RELAYER_PUBLIC_KEY=${publicKey}`);
  console.log(`ADMIN_RELAYER_SECRET_ENCRYPTED=${encryptedSecret}`);
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("🔗 View on Stellar Explorer:");
  console.log(`   https://stellar.expert/explorer/testnet/account/${publicKey}`);
  console.log("");
  console.log("⚠️  IMPORTANT: The secret key is encrypted. Keep your WALLET_ENCRYPTION_SECRET safe!");
  console.log("");
}

main().catch(console.error);
