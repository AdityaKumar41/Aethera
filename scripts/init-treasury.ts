import * as StellarSdk from "@stellar/stellar-sdk";
import * as dotenv from "dotenv";
import path from "path";
import { walletService } from "../packages/stellar/src/wallet";

dotenv.config({ path: path.join(__dirname, "../apps/api/.env") });

async function main() {
    const rpcUrl = "https://soroban-testnet.stellar.org";
    const networkPassphrase = "Test SDF Network ; September 2015";
    const rpcServer = new StellarSdk.rpc.Server(rpcUrl);
    
    const encryptedSecret = process.env.ADMIN_RELAYER_SECRET_ENCRYPTED;
    if (!encryptedSecret) throw new Error("Admin relayer secret not configured");
    const adminSecret = walletService.decryptSecret(encryptedSecret);
    const adminKeypair = StellarSdk.Keypair.fromSecret(adminSecret);
    
    const treasuryId = "CAZ2XELSAAX2SSFWK67KCSPJTB7NU6BREDBMVGJXR4FCA7SENR6PTZCE";
    const usdcTokenId = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
    
    console.log(`Initializing Treasury ${treasuryId} with admin ${adminKeypair.publicKey()} and USDC ${usdcTokenId}`);
    
    const account = await rpcServer.getAccount(adminKeypair.publicKey());
    const contract = new StellarSdk.Contract(treasuryId);
    
    let tx = new StellarSdk.TransactionBuilder(account, {
        fee: "10000",
        networkPassphrase,
    })
    .addOperation(
        contract.call(
            "initialize",
            new StellarSdk.Address(adminKeypair.publicKey()).toScVal(),
            new StellarSdk.Address(usdcTokenId).toScVal()
        )
    )
    .setTimeout(180)
    .build();

    const simulation = await rpcServer.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
        console.error("Simulation failed:", JSON.stringify(simulation, null, 2));
        return;
    }
    
    tx = await StellarSdk.rpc.assembleTransaction(tx, simulation).build();
    tx.sign(adminKeypair);
    const result = await rpcServer.sendTransaction(tx);
    console.log("Treasury initialized! Status:", result.status, "Hash:", result.hash);
}

main().catch(console.error);
