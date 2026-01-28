# Contract Deployment Information

## Testnet Deployment - January 28, 2026

### Deployer Account

- **Public Key:** `GCCB36VEX2CCGBLACLH5PYUGEFFL6DIJZBLFEOUBGUSBFTXPECZNPWTA`
- **Network:** Stellar Testnet
- **Funded via:** Friendbot

### Deployed Contracts

#### 1. Asset Token Contract

- **Contract ID:** `CBRCDA3COGVNJJEM22MC7V5KZCF3OTNJ2CYHT4OFDJO5SRHFNVDSQJ3N`
- **Wasm Hash:** `6865757accd9ddb6769c5a709be9dd09eb940d99ca6c3d4859f54e499ee8d99c`
- **Deploy TX:** [fb319caafe232ef7c352a9cea9de8ab26ccc1e067c4ebd2c62a0a83e85562d5a](https://stellar.expert/explorer/testnet/tx/fb319caafe232ef7c352a9cea9de8ab26ccc1e067c4ebd2c62a0a83e85562d5a)
- **Lab Link:** [View Contract](https://lab.stellar.org/r/testnet/contract/CBRCDA3COGVNJJEM22MC7V5KZCF3OTNJ2CYHT4OFDJO5SRHFNVDSQJ3N)
- **Size:** 6,057 bytes (optimized)
- **Purpose:** Token factory for creating project-specific tokens

#### 2. Treasury Contract

- **Contract ID:** `CDTQZM37IUOU7KDQZVDVWFLO2FSF2OPL2KTRABH7Y5UUGXKA5XCSRX3Q`
- **Wasm Hash:** `258c1a6fcfafe0c7419a91da84931065294d2224b6d9948a353a4fae4dc39a7f`
- **Deploy TX:** [9c21dd53fe9a8f0e378715fe32ee5a6680098ad48d9ea01c46b430e9c998600f](https://stellar.expert/explorer/testnet/tx/9c21dd53fe9a8f0e378715fe32ee5a6680098ad48d9ea01c46b430e9c998600f)
- **Lab Link:** [View Contract](https://lab.stellar.org/r/testnet/contract/CDTQZM37IUOU7KDQZVDVWFLO2FSF2OPL2KTRABH7Y5UUGXKA5XCSRX3Q)
- **Size:** 6,372 bytes (optimized)
- **Purpose:** Investment pool and yield distribution management

---

## Contract Configuration

### Environment Variables (Add to `.env`)

```bash
# Testnet Contract Addresses
ASSET_TOKEN_CONTRACT_ID=CBRCDA3COGVNJJEM22MC7V5KZCF3OTNJ2CYHT4OFDJO5SRHFNVDSQJ3N
TREASURY_CONTRACT_ID=CDTQZM37IUOU7KDQZVDVWFLO2FSF2OPL2KTRABH7Y5UUGXKA5XCSRX3Q
DEPLOYER_PUBLIC_KEY=GCCB36VEX2CCGBLACLH5PYUGEFFL6DIJZBLFEOUBGUSBFTXPECZNPWTA

# Network
STELLAR_NETWORK=testnet
HORIZON_URL=https://horizon-testnet.stellar.org
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

---

## Contract Invocation Examples

### Initialize Asset Token

```bash
stellar contract invoke \
  --id CBRCDA3COGVNJJEM22MC7V5KZCF3OTNJ2CYHT4OFDJO5SRHFNVDSQJ3N \
  --source deployer \
  --network testnet \
  -- initialize \
  --admin GCCB36VEX2CCGBLACLH5PYUGEFFL6DIJZBLFEOUBGUSBFTXPECZNPWTA \
  --name "SolarToken" \
  --symbol "SOLR"
```

### Check Contract Info

```bash
stellar contract inspect \
  --id CBRCDA3COGVNJJEM22MC7V5KZCF3OTNJ2CYHT4OFDJO5SRHFNVDSQJ3N \
  --network testnet
```

---

## Next Steps

1. ✅ Contracts built and optimized
2. ✅ Contracts deployed to testnet
3. ⏳ Initialize contracts with admin addresses
4. ⏳ Update backend to use deployed contract IDs
5. ⏳ Implement real contract invocation in API routes
6. ⏳ Test token minting and transfers
7. ⏳ Test investment pool operations

---

## Deployment Checklist

- [x] Build contracts with correct dependencies
- [x] Optimize wasm files
- [x] Generate deployer keypair
- [x] Fund deployer account
- [x] Deploy asset-token contract
- [x] Deploy treasury contract
- [ ] Initialize contracts
- [ ] Update environment variables
- [ ] Update stellar package configuration
- [ ] Test contract invocations
- [ ] Document contract interfaces

---

## Resources

- **Stellar Expert (Testnet):** https://stellar.expert/explorer/testnet
- **Stellar Lab:** https://lab.stellar.org
- **Horizon API:** https://horizon-testnet.stellar.org
- **Soroban RPC:** https://soroban-testnet.stellar.org
- **Stellar CLI Docs:** https://developers.stellar.org/docs/tools/developer-tools/cli

---

**Deployment Date:** January 28, 2026  
**Stellar Network:** Testnet  
**CLI Version:** 23.3.0 (update available: 25.0.0)
