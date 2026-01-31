const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Manually parse .env to avoid dependency
const envPath = path.join(__dirname, '../apps/api/.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        let value = parts.slice(1).join('=').trim();
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    }
});

function decryptSecret(encryptedSecret, encryptionKeyRaw) {
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

const secret = env.ADMIN_RELAYER_SECRET_ENCRYPTED;
const key = env.WALLET_ENCRYPTION_SECRET;

if (!secret || !key) {
    console.error("Missing env vars in " + envPath);
    process.exit(1);
}

try {
    const decrypted = decryptSecret(secret, key);
    // Print ONLY the secret
    console.log(decrypted);
} catch (e) {
    console.error("Decryption failed", e);
}
