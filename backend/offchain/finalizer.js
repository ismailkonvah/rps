// backend/offchain/finalizer.js
// Node script that listens for NeedsOffchainFinalize events and finalizes the winner.
// Uses Zama FHEVM SDK for decryption on Sepolia testnet
// Usage: set env RPC_URL, ADMIN_PRIVATE_KEY, CONTRACT_ADDRESS in .env, then: node finalizer.js

const { ethers } = require("ethers");
const { createInstance, SepoliaConfig } = require("@zama-fhe/relayer-sdk/node");
const artifact = require("../artifacts/contracts/PrivateRPSFHE.sol/PrivateRPSFHE.json");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
const ADMIN_KEY = process.env.ADMIN_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

if (!ADMIN_KEY || !CONTRACT_ADDRESS || !RPC_URL) {
  console.error("Set RPC_URL, ADMIN_PRIVATE_KEY, and CONTRACT_ADDRESS in .env");
  process.exit(1);
}

let fhevmInstance = null;

/**
 * Initialize FHEVM instance for backend decryption
 * Uses SepoliaConfig with all correct Sepolia settings
 */
async function initFHEVM() {
  if (fhevmInstance) {
    return fhevmInstance;
  }

  try {
    console.log("Initializing FHEVM instance with SepoliaConfig...");
    fhevmInstance = await createInstance(SepoliaConfig);
    console.log("FHEVM instance initialized successfully");
    return fhevmInstance;
  } catch (error) {
    console.error("Failed to initialize FHEVM:", error);
    throw new Error(`FHEVM initialization failed: ${error.message}`);
  }
}

/**
 * Decrypt an encrypted move handle using the Gateway
 * @param {BigInt} handle - The encrypted handle from contract storage
 * @param {object} signer - Ethers signer with decryption permissions  
 * @returns {Promise<number>} Decrypted value (0, 1, or 2)
 */
async function decryptMove(handle, signer) {
  const instance = await initFHEVM();

  try {
    console.log("Decrypting handle:", handle.toString());

    // Generate EIP-712 signature for Gateway decryption request
    const { publicKey, privateKey } = instance.generateKeypair();
    const eip712 = instance.createEIP712(publicKey, [CONTRACT_ADDRESS]); // Pass as array


    // Remove EIP712Domain from types (ethers.js handles it separately)
    const { EIP712Domain, ...typesWithoutDomain } = eip712.types;

    // Log the message to debug null values
    console.log("EIP712 message:", JSON.stringify(eip712.message, null, 2));

    // Ensure all message fields are valid (not null/undefined)
    const message = {
      ...eip712.message,
      startTimestamp: eip712.message.startTimestamp || 0,
      durationDays: eip712.message.durationDays || 0,
    };

    const signature = await signer.signTypedData(
      eip712.domain,
      typesWithoutDomain,
      message
    );

    // Request reencryption from Gateway
    const decrypted = await instance.reencrypt(
      handle,
      privateKey,
      publicKey,
      signature,
      CONTRACT_ADDRESS,
      signer.address
    );

    console.log("Decrypted value:", decrypted);
    return Number(decrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error(`Failed to decrypt move: ${error.message}`);
  }
}

/**
 * Compute winner from two moves
 * @param {number} move1 - Player 1's move (0=Rock, 1=Paper, 2=Scissors)
 * @param {number} move2 - Player 2's move (0=Rock, 1=Paper, 2=Scissors)
 * @returns {number} Winner (0=Draw, 1=Player1, 2=Player2)
 */
function computeWinner(move1, move2) {
  if (move1 === move2) return 0; // draw
  if ((move1 + 1) % 3 === move2) return 2; // move2 beats move1 -> player2 wins
  return 1; // player1 wins
}

async function main() {
  console.log("=== RPS Finalizer ===");
  console.log("RPC URL:", RPC_URL);
  console.log("Contract Address:", CONTRACT_ADDRESS);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(ADMIN_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, wallet);

  console.log("Admin wallet address:", wallet.address);

  // Initialize FHE backend
  try {
    await initFHEVM();
    console.log("✅ FHEVM backend initialized successfully");
  } catch (err) {
    console.error("❌ FHEVM backend initialization failed:", err);
    console.error("Cannot proceed without FHEVM. Exiting...");
    process.exit(1);
  }

  console.log("\n🎮 Listening for NeedsOffchainFinalize events...\n");

  contract.on("NeedsOffchainFinalize", async (gameId, encMove1, encMove2, event) => {
    try {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`📢 Event received: Game #${gameId.toString()} needs finalization`);
      console.log("Block:", event.log.blockNumber);
      console.log("Transaction:", event.log.transactionHash);

      // Convert encrypted moves to hex strings
      const encHex1 = encMove1.toString();
      const encHex2 = encMove2.toString();

      console.log("\n🔓 Decrypting moves...");

      // Decrypt both moves using FHEVM SDK
      let move1, move2;

      try {
        move1 = await decryptMove(encHex1, wallet);
        console.log(`  Player 1 move: ${move1} (${['Rock', 'Paper', 'Scissors'][move1]})`);
      } catch (error) {
        console.error("  Failed to decrypt Player 1 move:", error.message);
        throw error;
      }

      try {
        move2 = await decryptMove(encHex2, wallet);
        console.log(`  Player 2 move: ${move2} (${['Rock', 'Paper', 'Scissors'][move2]})`);
      } catch (error) {
        console.error("  Failed to decrypt Player 2 move:", error.message);
        throw error;
      }

      // Validate moves
      if (move1 < 0 || move1 > 2 || move2 < 0 || move2 > 2) {
        console.error("❌ Invalid move values:", { move1, move2 });
        return;
      }

      // Compute winner
      const winner = computeWinner(move1, move2);
      const winnerText = winner === 0 ? "Draw" : winner === 1 ? "Player 1" : "Player 2";

      console.log(`\n🏆 Winner: ${winnerText} (${winner})`);
      console.log("\n📝 Submitting result to contract...");

      // Submit result to contract
      const tx = await contract.finalizeResult(gameId, winner);
      console.log("  Transaction hash:", tx.hash);

      const receipt = await tx.wait();
      console.log("  ✅ Transaction confirmed in block:", receipt.blockNumber);
      console.log(`  Gas used: ${receipt.gasUsed.toString()}`);

      console.log(`\n✨ Game #${gameId.toString()} finalized successfully!`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    } catch (err) {
      console.error("\n❌ Error in event handler:", err);
      console.error("Stack trace:", err.stack);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    }
  });

  // Handle process termination gracefully
  process.on('SIGINT', () => {
    console.log("\n\n👋 Shutting down finalizer...");
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
