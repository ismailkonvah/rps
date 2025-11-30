// src/components/HowToPlay.jsx
import React, { useState } from 'react';

export default function HowToPlay() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* How to Play Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed top-4 right-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2 z-50"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How to Play
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/20 shadow-2xl">
                        {/* Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-purple-900 to-pink-900 p-6 border-b border-purple-500/20">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-white">🎮 How to Play</h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6 text-gray-300">
                            {/* Game Rules */}
                            <section>
                                <h3 className="text-xl font-semibold text-purple-400 mb-3">📜 Game Rules</h3>
                                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                                    <p className="flex items-center gap-2">
                                        <span className="text-2xl">✊</span>
                                        <span><strong className="text-white">Rock</strong> beats Scissors</span>
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <span className="text-2xl">✋</span>
                                        <span><strong className="text-white">Paper</strong> beats Rock</span>
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <span className="text-2xl">✌️</span>
                                        <span><strong className="text-white">Scissors</strong> beats Paper</span>
                                    </p>
                                </div>
                            </section>

                            {/* How to Play Steps */}
                            <section>
                                <h3 className="text-xl font-semibold text-purple-400 mb-3">🎯 How to Play</h3>
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold text-white mb-1">Connect Your Wallet</h4>
                                            <p className="text-sm">Click "Connect Wallet" and approve the connection. Make sure you're on Sepolia testnet.</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold text-white mb-1">Create or Join a Game</h4>
                                            <p className="text-sm">
                                                <strong>Create:</strong> Click "Start Game vs Player" to create a new game. Share the Game ID with your opponent.<br />
                                                <strong>Join:</strong> Enter a Game ID and click "Join Game" to join an existing game.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold text-white mb-1">Choose Your Move</h4>
                                            <p className="text-sm">Select Rock, Paper, or Scissors. Your move will be encrypted before submission - your opponent can't see it!</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold">4</div>
                                        <div>
                                            <h4 className="font-semibold text-white mb-1">Submit Encrypted Move</h4>
                                            <p className="text-sm">Click "Submit Encrypted Move" and approve the transaction. Your move is now encrypted on the blockchain!</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold">5</div>
                                        <div>
                                            <h4 className="font-semibold text-white mb-1">Wait for Finalization</h4>
                                            <p className="text-sm">Once both players submit, the backend finalizer will automatically decrypt the moves and determine the winner. This usually takes 10-30 seconds.</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Privacy Features */}
                            <section>
                                <h3 className="text-xl font-semibold text-purple-400 mb-3">🔒 Privacy Features</h3>
                                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2 text-sm">
                                    <p><strong className="text-green-400">✓ Fully Encrypted:</strong> Your move is encrypted using Zama's FHE before leaving your browser</p>
                                    <p><strong className="text-green-400">✓ Private Until Reveal:</strong> Neither player can see the other's move until finalization</p>
                                    <p><strong className="text-green-400">✓ Tamper-Proof:</strong> Moves are stored encrypted on-chain and can't be changed</p>
                                    <p><strong className="text-green-400">✓ Fair Play:</strong> The finalizer decrypts both moves simultaneously</p>
                                </div>
                            </section>

                            {/* Tips */}
                            <section>
                                <h3 className="text-xl font-semibold text-purple-400 mb-3">💡 Tips</h3>
                                <ul className="space-y-2 text-sm list-disc list-inside bg-gray-800/50 rounded-lg p-4">
                                    <li>Make sure you have Sepolia ETH for gas fees</li>
                                    <li>Wait for "FHEVM initialized" before creating/joining games</li>
                                    <li>Keep the Game ID to share with your opponent</li>
                                    <li>Don't refresh the page while waiting for finalization</li>
                                    <li>Check the status message for updates on your game</li>
                                </ul>
                            </section>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-gray-900 p-4 border-t border-purple-500/20">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-colors"
                            >
                                Got it! Let's Play
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
