import * as dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

// Load envs
dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

function decryptSecret(encryptedSecret: string, encryptionKeyRaw: string): string {
    const encryptionKey = crypto
      .createHash("sha256")
      .update(encryptionKeyRaw)
      .digest("base64")
      .slice(0, 32);

    const [ivHex, encryptedHex] = encryptedSecret.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encryptedText = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(encryptionKey),
      iv,
    );

    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
}

const secret = process.env.ADMIN_RELAYER_SECRET_ENCRYPTED;
const key = process.env.WALLET_ENCRYPTION_SECRET;

if (!secret || !key) {
    console.error("Missing env vars");
    process.exit(1);
}

try {
    const decrypted = decryptSecret(secret, key);
    console.log(decrypted);
} catch (e) {
    console.error("Decryption failed", e);
}
