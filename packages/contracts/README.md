# Aethera Smart Contracts

Soroban smart contracts for the Aethera renewable energy financing platform.

## Contracts

### 1. Asset Token Contract (`asset-token/`)

Represents fractional ownership of real-world solar assets. Each project gets its own token contract instance.

**Features:**

- Mint tokens to investors upon investment
- Track balances and total supply
- Transfer tokens (secondary market)
- Burn tokens (exit scenarios)
- Query metadata and holder information

**Key Functions:**

- `initialize()` - Create token for new project
- `mint()` - Issue tokens to investor (admin only)
- `transfer()` - Transfer tokens between holders
- `burn()` - Burn tokens (admin only)
- `balance()` - Get holder balance
- `get_metadata()` - Get project metadata

### 2. Treasury Contract (`treasury/`)

Escrow contract that manages USDC investments and capital distribution.

**Features:**

- Hold USDC investments in escrow
- Release capital to installers when funded
- Receive yield payments from projects
- Collect platform fees
- Track project funding status

**Key Functions:**

- `initialize()` - Set up treasury with admin
- `create_project_escrow()` - Create escrow for project
- `process_investment()` - Handle USDC deposit
- `release_capital()` - Pay installer after funding
- `receive_yield()` - Accept yield payment
- `withdraw_fees()` - Admin withdraw platform fees

### 3. Yield Distributor Contract (`yield-distributor/`) - TODO

Will handle automated yield distribution to token holders.

## Building Contracts

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Stellar CLI
cargo install --locked stellar-cli --features opt

# Add wasm32 target
rustup target add wasm32-unknown-unknown
```

### Build

```bash
# Build all contracts
stellar contract build

# Optimize WASM
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/*.wasm
```

### Test

```bash
cargo test
```

## Deploying Contracts

### Deploy to Testnet

```bash
# Deploy asset token
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/asset_token.wasm \
  --network testnet \
  --source admin

# Deploy treasury
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/treasury.wasm \
  --network testnet \
  --source admin
```

### Initialize Contracts

```bash
# Initialize asset token for a project
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source admin \
  --network testnet \
  -- \
  initialize \
  --admin <ADMIN_ADDRESS> \
  --project_id "proj_123" \
  --name "Solar Project Alpha" \
  --symbol "SOLA" \
  --capacity_kw 100 \
  --expected_yield_bps 850 \
  --total_supply 10000

# Initialize treasury
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source admin \
  --network testnet \
  -- \
  initialize \
  --admin <ADMIN_ADDRESS> \
  --usdc_token <USDC_CONTRACT_ADDRESS>
```

## Contract Interaction Flow

### 1. Project Creation

```
1. Admin creates project in database
2. Admin deploys asset token contract
3. Admin initializes contract with metadata
4. Admin creates escrow in treasury contract
5. Project listed on marketplace
```

### 2. Investment Flow

```
1. Investor browses marketplace
2. Investor deposits USDC to treasury
3. Treasury calls process_investment()
4. If fully funded, status → Funded
5. Admin mints tokens to investor
6. Investor receives asset tokens
```

### 3. Capital Release

```
1. Project reaches funding target
2. Admin calls release_capital()
3. Treasury deducts platform fee
4. Treasury transfers USDC to installer
5. Project status → Active
```

### 4. Yield Distribution (Future)

```
1. Project generates energy revenue
2. Operator deposits yield to treasury
3. Yield distributor calculates shares
4. Tokens holders claim proportional yield
```

## Security Considerations

- Only admin can mint/burn tokens
- Treasury requires multi-sig for capital release (TODO)
- All state changes emit events for transparency
- Input validation on all functions
- Overflow protection enabled

## Integration with Backend

The `packages/stellar/src/deployment.ts` service provides TypeScript wrappers for:

- Deploying contracts
- Initializing contracts
- Minting tokens
- Managing escrow

Example:

```typescript
import { contractDeploymentService } from "@aethera/stellar";

// Deploy token for new project
const contract = await contractDeploymentService.deployAssetToken(
  adminKeypair,
  {
    projectId: "proj_123",
    name: "Solar Farm Alpha",
    symbol: "SFA",
    capacityKw: 500,
    expectedYieldBps: 850,
    totalSupply: BigInt(100000),
  },
);

// Mint tokens to investor
await contractDeploymentService.mintTokens(
  contract.contractId,
  adminKeypair,
  investorAddress,
  BigInt(100),
);
```

## Testing

Run unit tests:

```bash
cargo test
```

Run integration tests (requires testnet):

```bash
cargo test --features testutils
```

## Roadmap

- [x] Asset token contract
- [x] Treasury escrow contract
- [ ] Yield distributor contract
- [ ] Governance contract
- [ ] Multi-sig admin controls
- [ ] Oracle integration
- [ ] Automated testing suite
- [ ] Mainnet deployment

## License

MIT
