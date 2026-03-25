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

const wasmDir = path.join(
  process.cwd(),
  "packages",
  "contracts",
  "target",
  "wasm32-unknown-unknown",
  "release",
);

const contracts = ["treasury", "yield-distributor", "governance", "oracle"];

function resolveWasm(name) {
  const underscore = name.replace(/-/g, "_") + ".wasm";
  const dash = name + ".wasm";
  const candidates = [underscore, dash].map((f) => path.join(wasmDir, f));
  for (const file of candidates) {
    if (fs.existsSync(file)) return file;
  }
  return null;
}

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  if (!execute) return;
  const out = execSync(cmd, { stdio: "pipe" }).toString("utf-8").trim();
  if (out) console.log(out);
}

console.log("[deploy-core] network:", network);
console.log("[deploy-core] networkPassphrase:", networkPassphrase);
console.log("[deploy-core] source:", source);
console.log("[deploy-core] wasmDir:", wasmDir);
console.log(execute ? "[deploy-core] executing" : "[deploy-core] dry-run");

for (const name of contracts) {
  const wasmPath = resolveWasm(name);
  if (!wasmPath) {
    console.error(
      `[deploy-core] missing wasm for ${name}. Build contracts first.`,
    );
    process.exit(1);
  }

  const cmd = [
    "stellar contract deploy",
    `--wasm "${wasmPath}"`,
    `--network ${network}`,
    `--network-passphrase \"${networkPassphrase}\"`,
    `--source ${source}`,
  ].join(" ");

  run(cmd);
}

console.log(
  "\n[deploy-core] done. Update contract IDs in your env after deploy.",
);
