// src/components/GamePanel.jsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useAccount, useDisconnect } from "wagmi";
import ContractAbi from "../contract/PrivateRPSFHE.json";
import { initFHEVM, encryptMove, serializeEncryptedData } from "../fhe/fheSdk";
import HowToPlay from "./HowToPlay";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

export default function GamePanel() {
  const { address: wagmiAddress, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [account, setAccount] = useState("");
  const [gameId, setGameId] = useState("");
  const [move, setMove] = useState(null); // 0 rock,1 paper,2 scissors
  const [status, setStatus] = useState("Not connected");
  const [contract, setContract] = useState(null);
  const [opponentMode, setOpponentMode] = useState("player"); // "player" or "computer"
  const [computerMove, setComputerMove] = useState(null);
  const [fhevmReady, setFhevmReady] = useState(false);

  useEffect(() => {
    // Initialize FHEVM instance on component mount
    (async () => {
      try {
        setStatus("Initializing FHEVM...");
        await initFHEVM();
        setFhevmReady(true);
        setStatus("FHEVM initialized. Connect your wallet to start.");
        console.log("FHEVM client initialized successfully");
      } catch (e) {
        console.error("FHEVM initialization failed:", e);
        setStatus("FHEVM initialization failed. Check console for details.");
      }
    })();
  }, []);

  // Sync Wagmi state with local state and setup Ethers
  useEffect(() => {
    async function setupWallet() {
      if (isConnected && wagmiAddress) {
        setAccount(wagmiAddress);
        setStatus("Connected: " + wagmiAddress);

        if (!window.ethereum) return;
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // wire contract
        const ctr = new ethers.Contract(CONTRACT_ADDRESS, ContractAbi, signer);
        setContract(ctr);

        // Setup listeners
        setupEventListeners(ctr);
      } else {
        setAccount("");
        setContract(null);
        setStatus("Please connect your wallet");
      }
    }
    setupWallet();
  }, [isConnected, wagmiAddress]);

  function setupEventListeners(ctr) {
    // Listen for NeedsOffchainFinalize event
    try {
      ctr.on("NeedsOffchainFinalize", (gid, encMove1, encMove2) => {
        if (gid.toString() === gameId) {
          setStatus(`⏳ Both players submitted! Finalizing game #${gid.toString()}...`);
        }
      });
    } catch (e) {
      console.warn("Could not subscribe to NeedsOffchainFinalize (RPC limitation):", e);
    }

    // Listen for GameFinalized event
    try {
      ctr.on("GameFinalized", (gid, winnerAddr, result) => {
        if (gid.toString() === gameId) {
          const resultText = result === 0 ? "Draw" : result === 1 ? "Player 1 Wins" : "Player 2 Wins";
          setStatus(`🎉 Game #${gid.toString()} finalized: ${resultText}!`);
        }
      });
    } catch (e) {
      console.warn("Could not subscribe to GameFinalized (RPC limitation):", e);
    }
  }

  async function connectWallet() {
    // Wagmi's Web3Modal handles connection via the hook, but if we need a manual trigger:
    // The button in UI should trigger Web3Modal. 
    // Since we are using wagmi hooks, we rely on the provider to handle connection UI.
    // However, for this simple implementation, we can just use the standard window.ethereum request 
    // if the user isn't using the Web3Modal button.
    // BUT, better to rely on the hook.
    // For now, let's keep the manual connect for non-modal users or just rely on the hook's state.
    if (!window.ethereum) return alert("Install MetaMask or use WalletConnect");
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
  }

  async function createGame() {
    if (!contract) return alert("Connect wallet first");
    setStatus("Creating game...");
    const tx = await contract.createGame(0); // no wager
    const receipt = await tx.wait();
    // try to pull gameId from logs (Ethers v6)
    console.log("Parsing logs for GameCreated event...");
    let gid;
    for (const log of receipt.logs) {
      try {
        const parsedLog = contract.interface.parseLog(log);
        console.log("Parsed log:", parsedLog?.name, parsedLog?.args);
        if (parsedLog && parsedLog.name === "GameCreated") {
          gid = parsedLog.args[0].toString();
          console.log("Found GameID:", gid);
          break;
        }
      } catch (e) {
        console.log("Log parse error (ignoring):", e);
      }
    }

    if (gid) {
      setGameId(gid);
      setStatus(`Created game #${gid}`);

      // Backend bot will automatically join if running
    } else {
      console.warn("GameCreated event not found in logs");
      setStatus("Game created (inspect tx logs)");
    }
  }



  async function joinGame() {
    if (!contract) return alert("Connect wallet first");
    if (!gameId) return alert("Enter game ID");
    setStatus(`Joining game ${gameId}...`);
    const tx = await contract.joinGame(gameId);
    await tx.wait();
    setStatus(`Joined game ${gameId}`);
  }

  async function submitMove() {
    console.log("submitMove called");
    if (!contract) return alert("Connect wallet");
    if (!gameId) return alert("Enter game ID");
    if (move === null) return alert("Select a move first");
    if (!fhevmReady) return alert("FHEVM not ready yet. Please wait.");
    if (!CONTRACT_ADDRESS) return alert("Contract address not configured (VITE_CONTRACT_ADDRESS missing)");

    try {
      console.log("Starting encryption...");
      setStatus("Encrypting move...");
      // Encrypt the move using FHEVM SDK
      const encryptedData = await encryptMove(move, CONTRACT_ADDRESS, account);
      console.log("Encryption complete:", encryptedData);

      // Serialize to bytes for contract
      const serialized = serializeEncryptedData(encryptedData);
      const encHex = ethers.hexlify(serialized);

      setStatus("Submitting encrypted move on-chain...");
      const tx = await contract.submitMove(gameId, encHex);
      await tx.wait();
      setStatus("Move submitted (tx mined). Waiting for finalization...");

      // Backend bot will automatically play if running
    } catch (error) {
      console.error("Submit move error:", error);
      setStatus(`Error: ${error.message}`);
    }
  }



  const getMoveEmoji = (moveId) => {
    const moves = ['✊ Rock', '✋ Paper', '✌️ Scissors'];
    return moves[moveId] || '';
  };

  return (
    <>
      <HowToPlay />
      <div style={{ position: 'relative', width: 420, padding: 24, borderRadius: 16, background: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', margin: '40px auto' }}>
        <h2 style={{ margin: 0 }}>🔒 Private Rock–Paper–Scissors</h2>
        <p style={{ color: '#374151' }}>{status}</p>

        {account && (
          <div style={{ position: 'absolute', top: 20, right: 20 }}>
            <button
              onClick={() => disconnect()}
              style={{
                padding: '8px 16px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              Disconnect {account.slice(0, 6)}...
            </button>
          </div>
        )}

        {!account ? (
          <button onClick={connectWallet} style={{ padding: 10, background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Connect Wallet</button>
        ) : (
          <>
            {/* Opponent Mode Selection */}
            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <p style={{ marginBottom: 8, fontWeight: 600 }}>Choose opponent:</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setOpponentMode("player")}
                  style={{
                    flex: 1,
                    padding: 10,
                    background: opponentMode === "player" ? '#7c3aed' : '#f3f4f6',
                    color: opponentMode === "player" ? 'white' : 'black',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  👥 Play with Player
                </button>
                <button
                  onClick={() => setOpponentMode("computer")}
                  style={{
                    flex: 1,
                    padding: 10,
                    background: opponentMode === "computer" ? '#7c3aed' : '#f3f4f6',
                    color: opponentMode === "computer" ? 'white' : 'black',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  🤖 Play with Computer
                </button>
              </div>
            </div>

            {opponentMode === "player" ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={createGame} style={{ padding: 8, background: '#10b981', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Create Game</button>
                <input value={gameId} onChange={e => setGameId(e.target.value)} placeholder="Game ID" style={{ flex: 1, padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }} />
                <button onClick={joinGame} style={{ padding: 8, background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Join Game</button>
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                <button onClick={createGame} style={{ padding: 10, width: '100%', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                  🎮 Start Game vs Computer
                </button>
                {gameId && <p style={{ textAlign: 'center', margin: '8px 0', fontWeight: 'bold' }}>Current Game ID: {gameId}</p>}
                {computerMove !== null && (
                  <div style={{ marginTop: 12, padding: 12, background: '#fef3c7', borderRadius: 8 }}>
                    <p style={{ margin: 0, fontSize: 14 }}>Computer chose: {getMoveEmoji(computerMove)}</p>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Select your move:</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setMove(0)} style={{ padding: 12, flex: 1, background: move === 0 ? '#111827' : '#f3f4f6', color: move === 0 ? 'white' : 'black', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: 600 }}>
                  ✊<br />Rock
                </button>
                <button onClick={() => setMove(1)} style={{ padding: 12, flex: 1, background: move === 1 ? '#111827' : '#f3f4f6', color: move === 1 ? 'white' : 'black', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: 600 }}>
                  ✋<br />Paper
                </button>
                <button onClick={() => setMove(2)} style={{ padding: 12, flex: 1, background: move === 2 ? '#111827' : '#f3f4f6', color: move === 2 ? 'white' : 'black', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: 600 }}>
                  ✌️<br />Scissors
                </button>
              </div>

              <div style={{ marginTop: 12 }}>
                <button
                  onClick={submitMove}
                  disabled={move === null}
                  style={{
                    padding: 12,
                    width: '100%',
                    background: move !== null ? '#7c3aed' : '#d1d5db',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: move !== null ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                    fontSize: 16
                  }}
                >
                  🔐 Submit Encrypted Move
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

