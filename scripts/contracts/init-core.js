const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function parseEnvValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    const value = parseEnvValue(line.slice(eqIndex + 1));

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const rootDir = process.cwd();
loadEnvFile(path.join(rootDir, ".env"));
loadEnvFile(path.join(rootDir, ".env.testnet"));
loadEnvFile(path.join(rootDir, ".env.mainnet"));

const args = new Set(process.argv.slice(2));
const execute = args.has("--execute");

const network = process.env.STELLAR_NETWORK || "testnet";
const source = process.env.DEPLOYER_SOURCE || "deployer";
const networkPassphrase =
  process.env.NETWORK_PASSPHRASE ||
  (network === "mainnet"
    ? "Public Global Stellar Network ; September 2015"
    : "Test SDF Network ; September 2015");

const admin = process.env.ADMIN_ADDRESS;
const treasury = process.env.TREASURY_CONTRACT_ID;
const yieldDistributor = process.env.YIELD_DISTRIBUTOR_CONTRACT_ID;
const governance = process.env.GOVERNANCE_CONTRACT_ID;
const oracle = process.env.ORACLE_CONTRACT_ID;
const usdc = process.env.USDC_CONTRACT_ID;
const governanceToken = process.env.GOVERNANCE_TOKEN_CONTRACT_ID;

const minProposalTokens = process.env.MIN_PROPOSAL_TOKENS || "100";
const votingPeriod = process.env.VOTING_PERIOD || "86400";
const executionDelay = process.env.EXECUTION_DELAY || "172800";
const quorumPercentage = process.env.QUORUM_PERCENTAGE || "500";
const platformFeeBps = process.env.PLATFORM_FEE_BPS || "1000";

function validateRequiredEnv(requiredEntries) {
  const missing = requiredEntries
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    console.error("[init-core] missing required env vars:");
    for (const name of missing) {
      console.error(`  - ${name}`);
    }
    process.exit(1);
  }
}

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  if (!execute) return;
  const out = execSync(cmd, { stdio: "pipe" }).toString("utf-8").trim();
  if (out) console.log(out);
}

validateRequiredEnv([
  ["ADMIN_ADDRESS", admin],
  ["TREASURY_CONTRACT_ID", treasury],
  ["YIELD_DISTRIBUTOR_CONTRACT_ID", yieldDistributor],
  ["GOVERNANCE_CONTRACT_ID", governance],
  ["ORACLE_CONTRACT_ID", oracle],
  ["USDC_CONTRACT_ID", usdc],
  ["GOVERNANCE_TOKEN_CONTRACT_ID", governanceToken],
]);

console.log("[init-core] network:", network);
console.log("[init-core] networkPassphrase:", networkPassphrase);
console.log("[init-core] source:", source);
console.log(execute ? "[init-core] executing" : "[init-core] dry-run");

// Treasury init
run(
  [
    "stellar contract invoke",
    `--id ${treasury}`,
    `--source ${source}`,
    `--network ${network}`,
    `--network-passphrase \"${networkPassphrase}\"`,
    "--",
    "initialize",
    `--admin ${admin}`,
    `--usdc_token ${usdc}`,
  ].join(" "),
);

// Yield distributor init
run(
  [
    "stellar contract invoke",
    `--id ${yieldDistributor}`,
    `--source ${source}`,
    `--network ${network}`,
    `--network-passphrase \"${networkPassphrase}\"`,
    "--",
    "initialize",
    `--admin ${admin}`,
    `--treasury ${treasury}`,
    `--usdc_token ${usdc}`,
    `--platform_fee_bps ${platformFeeBps}`,
  ].join(" "),
);

// Governance init
run(
  [
    "stellar contract invoke",
    `--id ${governance}`,
    `--source ${source}`,
    `--network ${network}`,
    `--network-passphrase \"${networkPassphrase}\"`,
    "--",
    "initialize",
    `--admin ${admin}`,
    `--token_contract ${governanceToken}`,
    `--min_proposal_tokens ${minProposalTokens}`,
    `--voting_period ${votingPeriod}`,
    `--execution_delay ${executionDelay}`,
    `--quorum_percentage ${quorumPercentage}`,
  ].join(" "),
);

// Oracle init
run(
  [
    "stellar contract invoke",
    `--id ${oracle}`,
    `--source ${source}`,
    `--network ${network}`,
    `--network-passphrase \"${networkPassphrase}\"`,
    "--",
    "initialize",
    `--admin ${admin}`,
  ].join(" "),
);

console.log("\n[init-core] done.");
