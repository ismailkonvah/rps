# Private RPS Backend Deployment Guide

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

This will install:
- Hardhat (for contract deployment)
- Ethers.js (for blockchain interactions)
- @zama-fhe/relayer-sdk (for FHE operations)
- dotenv (for environment variables)

### 2. Configure Environment

Make sure your `backend/.env` file has:

```env
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/X9w6FmX0w1bHNQvcxJL5I
ADMIN_PRIVATE_KEY=0xce481ec78e1961688d172f8dc108c8f3b1772bb8a9157b0825703c3485eabe21
CONTRACT_ADDRESS=
```

> **Note**: CONTRACT_ADDRESS will be filled after deployment

### 3. Get Sepolia ETH

Your admin wallet needs Sepolia ETH for:
- Deploying the contract (~0.01 ETH)
- Finalizing games (~0.001 ETH per game)

**Faucets:**
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://sepolia-faucet.pk910.de/

### 4. Deploy Contract

```bash
npm run deploy
```

Or with Hardhat directly:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

**Expected Output:**
```
🚀 Deploying PrivateRPSFHE contract to Sepolia...

Deploying with account: 0x...
Account balance: 0.5 ETH

📝 Compiling contract...
⏳ Deploying contract (admin will be deployer)...
⏳ Waiting for deployment transaction to be mined...

✅ Contract deployed successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Contract Address: 0x...
👤 Admin Address: 0x...
🔗 Network: Sepolia
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 5. Update Environment Variables

After deployment, update both `.env` files:

**Frontend `.env`:**
```env
VITE_CONTRACT_ADDRESS=0x... # Copy from deployment output
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/X9w6FmX0w1bHNQvcxJL5I
```

**Backend `.env`:**
```env
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/X9w6FmX0w1bHNQvcxJL5I
ADMIN_PRIVATE_KEY=0xce481ec78e1961688d172f8dc108c8f3b1772bb8a9157b0825703c3485eabe21
CONTRACT_ADDRESS=0x... # Copy from deployment output
```

### 6. Start Backend Finalizer

```bash
npm run finalizer
```

Or:

```bash
node offchain/finalizer.js
```

**Expected Output:**
```
=== Private RPS Finalizer ===
RPC URL: https://eth-sepolia.g.alchemy.com/v2/...
Contract Address: 0x...
Admin wallet address: 0x...
✅ FHEVM backend initialized successfully

🎮 Listening for NeedsOffchainFinalize events...
```

### 7. Start Frontend

In a new terminal:

```bash
cd ..  # Go back to project root
npm run dev
```

## Troubleshooting

### "Insufficient funds for intrinsic transaction cost"
- Your admin wallet needs more Sepolia ETH
- Get from faucets listed above

### "Contract deployment failed"
- Check that RPC_URL is correct
- Verify ADMIN_PRIVATE_KEY is valid (starts with 0x)
- Ensure you have Sepolia ETH

### "FHEVM initialization failed"
- Make sure @zama-fhe/relayer-sdk is installed
- Check internet connection (needs to connect to Zama's infrastructure)

### "Cannot find module 'hardhat'"
- Run `npm install` in the backend directory

## Verify Contract (Optional)

After deployment, you can verify your contract on Etherscan:

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <ADMIN_ADDRESS>
```

Example:
```bash
npx hardhat verify --network sepolia 0x123... 0x456...
```

## Deployment Info

After deployment, check `deployment-info.json` for:
- Contract address
- Admin address
- Deployment timestamp
- Transaction hash

## Next Steps

1. ✅ Deploy contract
2. ✅ Update .env files
3. ✅ Start backend finalizer
4. ✅ Start frontend
5. 🎮 Play a game!

## Testing the Deployment

1. Open frontend (http://localhost:5173)
2. Connect your wallet (MetaMask on Sepolia)
3. Create a game
4. Submit an encrypted move
5. Check backend finalizer logs for decryption
6. Verify game result appears in frontend
