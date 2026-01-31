import {
  Keypair,
  Asset,
  Operation,
  TransactionBuilder,
  Networks,
  Server,
} from "@stellar/stellar-sdk";

const TARGET = "GBI72UH3FX5CXCFSP5LQKJSGOTS2B2EU7JIPE7BMYQSWYMN33SZR2JCF";
const server = new Server("https://horizon-testnet.stellar.org");

console.log("🚀 Starting USDC funding for", TARGET);

// Create issuer and distributor
const issuer = Keypair.random();
const dist = Keypair.random();

console.log("Funding accounts with XLM...");
await server.friendbot(issuer.publicKey()).call();
await server.friendbot(dist.publicKey()).call();

await new Promise((r) => setTimeout(r, 3000));

const usdc = new Asset("USDC", issuer.publicKey());

// Distributor trustline
console.log("Creating distributor trustline...");
let distAcc = await server.loadAccount(dist.publicKey());
let tx = new TransactionBuilder(distAcc, {
  fee: "10000",
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(Operation.changeTrust({ asset: usdc, limit: "1000000000" }))
  .setTimeout(30)
  .build();
tx.sign(dist);
await server.submitTransaction(tx);

// Issue USDC
console.log("Issuing USDC...");
const issAcc = await server.loadAccount(issuer.publicKey());
tx = new TransactionBuilder(issAcc, {
  fee: "10000",
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(
    Operation.payment({
      destination: dist.publicKey(),
      asset: usdc,
      amount: "1000000",
    }),
  )
  .setTimeout(30)
  .build();
tx.sign(issuer);
await server.submitTransaction(tx);

console.log("Sending to target...");
distAcc = await server.loadAccount(dist.publicKey());
tx = new TransactionBuilder(distAcc, {
  fee: "10000",
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(
    Operation.payment({ destination: TARGET, asset: usdc, amount: "10000" }),
  )
  .setTimeout(30)
  .build();
tx.sign(dist);

try {
  const result = await server.submitTransaction(tx);
  console.log("✅ SUCCESS!");
  console.log("TX:", result.hash);
  console.log("Issuer:", issuer.publicKey());
} catch (e) {
  console.log("❌ Error:", e.response?.data?.extras?.result_codes || e.message);
  console.log("Target might need trustline first");
}
