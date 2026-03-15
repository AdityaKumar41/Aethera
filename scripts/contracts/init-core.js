const { execSync } = require("child_process");

const args = new Set(process.argv.slice(2));
const execute = args.has("--execute");

const network = process.env.STELLAR_NETWORK || "testnet";
const source = process.env.DEPLOYER_SOURCE || "deployer";

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

function requireEnv(name, value) {
  if (!value) {
    console.error(`[init-core] missing ${name}`);
    process.exit(1);
  }
}

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  if (!execute) return;
  const out = execSync(cmd, { stdio: "pipe" }).toString("utf-8").trim();
  if (out) console.log(out);
}

requireEnv("ADMIN_ADDRESS", admin);
requireEnv("TREASURY_CONTRACT_ID", treasury);
requireEnv("YIELD_DISTRIBUTOR_CONTRACT_ID", yieldDistributor);
requireEnv("GOVERNANCE_CONTRACT_ID", governance);
requireEnv("ORACLE_CONTRACT_ID", oracle);
requireEnv("USDC_CONTRACT_ID", usdc);
requireEnv("GOVERNANCE_TOKEN_CONTRACT_ID", governanceToken);

console.log("[init-core] network:", network);
console.log("[init-core] source:", source);
console.log(execute ? "[init-core] executing" : "[init-core] dry-run");

// Treasury init
run(
  [
    "stellar contract invoke",
    `--id ${treasury}`,
    `--source ${source}`,
    `--network ${network}`,
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
    "--",
    "initialize",
    `--admin ${admin}`,
  ].join(" "),
);

console.log("\n[init-core] done.");
