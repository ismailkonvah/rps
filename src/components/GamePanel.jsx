// src/components/GamePanel.jsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import ContractAbi from "../contract/PrivateRPSFHE.json";
import { initFHEVM, encryptMove, serializeEncryptedData } from "../fhe/fheSdk";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

export default function GamePanel() {
  const { address: wagmiAddress } = useAccount();
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

  async function connectWallet() {
    if (!window.ethereum) return alert("Install MetaMask or use WalletConnect");
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const addr = await signer.getAddress();
    setAccount(addr);

    // wire contract
    const ctr = new ethers.Contract(CONTRACT_ADDRESS, ContractAbi, signer);
    setContract(ctr);

    // Listen for finalization events
    // Listen for finalization events (might fail on some RPCs)
    // Commented out to prevent "eth_newFilter not available" errors on free RPCs
    /*
    try {
      ctr.on("GameFinalized", (gid, winnerAddr, result) => {
        setStatus(`Game #${gid.toString()} finalized: ${result} (${winnerAddr})`);
      });
    } catch (e) {
      console.warn("Could not subscribe to events (RPC limitation):", e);
    }
    */

    setStatus("Connected: " + addr);
  }

  async function createGame() {
    if (!contract) return alert("Connect wallet first");
    setStatus("Creating game...");
    const tx = await contract.createGame(0); // no wager
    const receipt = await tx.wait();
    // try to pull gameId from logs (Ethers v6)
    let gid;
    for (const log of receipt.logs) {
      try {
        const parsedLog = contract.interface.parseLog(log);
        if (parsedLog && parsedLog.name === "GameCreated") {
          gid = parsedLog.args[0].toString();
          break;
        }
      } catch (e) {
        // ignore logs that don't belong to this contract
      }
    }

    if (gid) {
      setGameId(gid);
      setStatus(`Created game #${gid}`);

      // If playing against computer, automatically join as computer
      if (opponentMode === "computer") {
        setTimeout(() => computerJoinGame(gid), 1000);
      }
    } else {
      setStatus("Game created (inspect tx logs)");
    }
  }

  async function computerJoinGame(gid) {
    if (!contract) return;
    try {
      setStatus("Computer is joining the game...");
      const tx = await contract.joinGame(gid);
      await tx.wait();
      setStatus("Computer joined! Waiting for your move...");
    } catch (error) {
      console.error("Computer join error:", error);
      setStatus("Computer failed to join. You can play with another player.");
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

      // If playing against computer, submit computer's move after player's move
      if (opponentMode === "computer") {
        setTimeout(() => submitComputerMove(), 1500);
      }
    } catch (error) {
      console.error("Submit move error:", error);
      setStatus(`Error: ${error.message}`);
    }
  }

  async function submitComputerMove() {
    if (!contract) return;
    try {
      // Generate random move for computer (0, 1, or 2)
      const randomMove = Math.floor(Math.random() * 3);
      setComputerMove(randomMove);
      setStatus("Computer is making its move...");

      // Encrypt computer's move
      const encryptedData = await encryptMove(randomMove, CONTRACT_ADDRESS, account);
      const serialized = serializeEncryptedData(encryptedData);
      const encHex = ethers.hexlify(serialized);

      const tx = await contract.submitMove(gameId, encHex);
      await tx.wait();
      setStatus("Computer move submitted! Waiting for finalization...");
    } catch (error) {
      console.error("Computer move error:", error);
      setStatus("Computer failed to submit move.");
    }
  }

  const getMoveEmoji = (moveId) => {
    const moves = ['✊ Rock', '✋ Paper', '✌️ Scissors'];
    return moves[moveId] || '';
  };

  return (
    <div style={{ width: 420, padding: 24, borderRadius: 16, background: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', margin: '40px auto' }}>
      <h2 style={{ margin: 0 }}>🔒 Private Rock–Paper–Scissors</h2>
      <p style={{ color: '#374151' }}>{status}</p>

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
  );
}

