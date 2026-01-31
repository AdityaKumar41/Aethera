import { prisma } from "@aethera/database";
import * as StellarSdk from "@stellar/stellar-sdk";
import * as dotenv from "dotenv";
import path from "path";

// Load envs if needed, though we pass them via CLI
dotenv.config({ path: path.join(__dirname, "../apps/api/.env") });

async function main() {
  console.log("🔄 Syncing projects to Treasury...");

  // Load contract addresses manually if needed, or rely on hardcoded for this fix
  // Contracts list from registry.ts (Testnet)
  const contracts = {
      treasury: "CBVWVM66CY7QULF2E3M2ZVVNDQIPY3SH7Z7QIANJWT23FERCBUWROOAX"
  };
  console.log("Treasury ID:", contracts.treasury);

  // Get Admin Relayer
  const encryptedSecret = process.env.ADMIN_RELAYER_SECRET_ENCRYPTED;
  const encryptionKey = process.env.WALLET_ENCRYPTION_SECRET;

  if (!encryptedSecret || !encryptionKey) {
    throw new Error("Missing admin credentials");
  }

  console.log("Decrypting admin key...");
  
  // Manual decryption to ensure consistency with decrypt-admin.js
  const crypto = await import("crypto");
  
  function decrypt(encrypted: string, keyStr: string) {
    const key = crypto
      .createHash("sha256")
      .update(keyStr)
      .digest("base64")
      .slice(0, 32);

    const [ivHex, encryptedHex] = encrypted.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encryptedText = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(key),
      iv,
    );

    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  const adminSecret = decrypt(encryptedSecret, encryptionKey);
  const adminKeypair = StellarSdk.Keypair.fromSecret(adminSecret);
  console.log("Admin:", adminKeypair.publicKey());

  // Get all projects that SHOULD be in the Treasury
  const projects = await prisma.project.findMany({
    where: {
      status: { in: ["FUNDING", "FUNDED", "ACTIVE"] },
    },
    include: {
        installer: { select: { stellarPubKey: true } }
    }
  });

  console.log(`Found ${projects.length} projects to sync.`);

  // Use raw SDK servers to avoid StellarClient wrapper issues
  const server = new StellarSdk.SorobanRpc.Server("https://soroban-testnet.stellar.org");
  const networkPassphrase = "Test SDF Network ; September 2015";
  const treasury = new StellarSdk.Contract(contracts.treasury);

  for (const project of projects) {
    console.log(`\nProcessing ${project.id} (${project.name})...`);
    
    if (!project.tokenContractId) {
        console.warn(`Skipping ${project.id}: No token contract ID`);
        continue;
    }
    
    if (!project.installer?.stellarPubKey) {
        console.warn(`Skipping ${project.id}: No installer wallet`);
        continue;
    }

    try {
        console.log("Creating escrow on-chain...");
        
        const account = await server.getAccount(adminKeypair.publicKey());
        
        // create_project_escrow(project_id, asset_token, installer, funding_target, platform_fee_bps)
        const tx = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase,
        })
        .addOperation(
            treasury.call(
                "create_project_escrow",
                StellarSdk.nativeToScVal(project.id, { type: "string" }),
                StellarSdk.nativeToScVal(project.tokenContractId, { type: "address" }),
                StellarSdk.nativeToScVal(project.installer.stellarPubKey, { type: "address" }),
                StellarSdk.nativeToScVal(BigInt(Math.round(Number(project.fundingTarget) * 10_000_000)), { type: "i128" }), // USDC 7 decimals
                StellarSdk.nativeToScVal(250, { type: "u32" }) // 2.5% fee hardcoded
            )
        )
        .setTimeout(180)
        .build();

        tx.sign(adminKeypair);

        const result = await server.sendTransaction(tx);
        
        if (result.status !== "PENDING" && result.status !== "SUCCESS") {
             console.log("Result status:", result.status);
             if (result.errorResult) {
                 console.error("Error result:", result.errorResult);
             }
        } else {
             console.log("✅ Synced successfully. Hash:", result.hash);
        }

    } catch (e: any) {
        console.error("Error syncing project:", e.message);
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
