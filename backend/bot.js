// backend/bot.js
// Computer player bot that automatically joins and plays games
// Usage: node bot.js

const { ethers } = require("ethers");
const { createInstance, SepoliaConfig, initSDK } = require("@zama-fhe/relayer-sdk/node");
const artifact = require("./artifacts/contracts/PrivateRPSFHE.sol/PrivateRPSFHE.json");
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
 * Initialize FHEVM instance for encryption
 */
async function initFHEVM() {
    if (fhevmInstance) {
        return fhevmInstance;
    }

    try {
        console.log("Initializing FHEVM instance...");
        await initSDK();
        fhevmInstance = await createInstance(SepoliaConfig);
        console.log("✅ FHEVM instance initialized");
        return fhevmInstance;
    } catch (error) {
        console.error("Failed to initialize FHEVM:", error);
        throw new Error(`FHEVM initialization failed: ${error.message}`);
    }
}

/**
 * Encrypt a move using FHEVM SDK
 * @param {number} move - Move value (0=Rock, 1=Paper, 2=Scissors)
 * @param {string} contractAddress - Contract address
 * @param {string} botAddress - Bot's wallet address
 * @returns {Promise<Uint8Array>} Encrypted move data
 */
async function encryptMove(move, contractAddress, botAddress) {
    const instance = await initFHEVM();

    try {
        console.log(`  Encrypting move: ${move} (${['Rock', 'Paper', 'Scissors'][move]})`);

        // Create encrypted input
        const input = instance.createEncryptedInput(contractAddress, botAddress);
        input.add8(move);

        // Encrypt and get proof
        const encryptedResult = await input.encrypt();

        // Return the inputProof (Uint8Array)
        if (encryptedResult.inputProof instanceof Uint8Array) {
            return encryptedResult.inputProof;
        }

        throw new Error("Unexpected encryption result format");
    } catch (error) {
        console.error("Encryption failed:", error);
        throw error;
    }
}

/**
 * Generate a random move (0, 1, or 2)
 */
function getRandomMove() {
    return Math.floor(Math.random() * 3);
}

async function main() {
    console.log("=== 🤖 RPS Computer Bot ===");
    console.log("RPC URL:", RPC_URL);
    console.log("Contract Address:", CONTRACT_ADDRESS);

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(ADMIN_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, wallet);

    console.log("Bot wallet address:", wallet.address);

    // Initialize FHE
    try {
        await initFHEVM();
    } catch (err) {
        console.error("❌ FHEVM initialization failed:", err);
        process.exit(1);
    }

    console.log("\n🎮 Watching for new games...\n");

    // Listen for GameCreated events
    contract.on("GameCreated", async (gameId, creator, event) => {
        try {
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log(`📢 New game detected: #${gameId.toString()}`);
            console.log(`  Creator: ${creator}`);
            console.log(`  Block: ${event.log.blockNumber}`);

            // Don't join our own games
            if (creator.toLowerCase() === wallet.address.toLowerCase()) {
                console.log("  ⏭️  Skipping (bot created this game)");
                console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
                return;
            }

            // Join the game
            console.log("\n🎯 Joining game...");
            const joinTx = await contract.joinGame(gameId);
            await joinTx.wait();
            console.log("✅ Joined game successfully");

            // Generate and encrypt a random move
            const move = getRandomMove();
            console.log(`\n🎲 Bot chose: ${['Rock', 'Paper', 'Scissors'][move]}`);

            const encryptedMove = await encryptMove(move, CONTRACT_ADDRESS, wallet.address);
            console.log("✅ Move encrypted");

            // Submit the move
            console.log("\n📝 Submitting move...");
            const submitTx = await contract.submitMove(gameId, encryptedMove);
            const receipt = await submitTx.wait();
            console.log("✅ Move submitted!");
            console.log(`  Transaction: ${receipt.hash}`);
            console.log(`  Gas used: ${receipt.gasUsed.toString()}`);

            console.log(`\n✨ Bot finished playing game #${gameId.toString()}`);
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        } catch (err) {
            console.error("\n❌ Error handling game:", err.message);
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        }
    });

    // Handle process termination
    process.on('SIGINT', () => {
        console.log("\n\n👋 Shutting down bot...");
        process.exit(0);
    });
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
