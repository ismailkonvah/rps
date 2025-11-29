// src/fhe/fheSdk.js
// Zama FHEVM SDK integration for Sepolia testnet

import { createInstance, SepoliaConfig } from '@zama-fhe/relayer-sdk/web';

let fhevmInstance = null;

/**
 * Initialize FHEVM instance for Sepolia testnet
 * Uses SepoliaConfig which automatically configures:
 * - Gateway URL for decryption
 * - KMS verifier contract
 * - ACL contract
 * - Relayer URL
 * - All Sepolia-specific FHEVM settings
 */
export async function initFHEVM() {
  if (fhevmInstance) {
    return fhevmInstance;
  }

  try {
    console.log('Initializing FHEVM instance with SepoliaConfig...');

    fhevmInstance = await createInstance(SepoliaConfig);
    console.log('FHEVM instance initialized successfully');
    return fhevmInstance;
  } catch (error) {
    console.error('Failed to initialize FHEVM:', error);
    throw new Error(`FHEVM initialization failed: ${error.message}`);
  }
}

/**
 * Get the current FHEVM instance
 * @returns {Promise<object>} FHEVM instance
 */
export async function getFHEVMInstance() {
  if (!fhevmInstance) {
    return await initFHEVM();
  }
  return fhevmInstance;
}

/**
 * Encrypt a uint8 value (0-255) for use in smart contracts
 * For RPS game: 0 = Rock, 1 = Paper, 2 = Scissors
 * 
 * @param {number} value - Value to encrypt (0-255)
 * @param {string} contractAddress - Contract address for encryption context
 * @param {string} userAddress - User's wallet address
 * @returns {Promise<object>} Encrypted data object with encryptedData and proof
 */
export async function encryptMove(value, contractAddress, userAddress) {
  if (value < 0 || value > 255) {
    throw new Error('Value must be between 0 and 255');
  }

  const instance = await getFHEVMInstance();

  try {
    console.log(`Encrypting move: ${value} for contract: ${contractAddress}`);

    // Encrypt the value using FHEVM SDK
    const encryptedValue = await instance.encrypt_uint8(value);

    // The SDK returns an object with encrypted data and proof
    // Format depends on SDK version, typically: { encryptedData, proof }
    console.log('Move encrypted successfully');

    return encryptedValue;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error(`Failed to encrypt move: ${error.message}`);
  }
}

/**
 * Serialize encrypted data to bytes for contract submission
 * @param {object} encryptedData - Encrypted data from encryptMove
 * @returns {Uint8Array} Serialized ciphertext
 */
export function serializeEncryptedData(encryptedData) {
  try {
    // If already a Uint8Array, return as-is
    if (encryptedData instanceof Uint8Array) {
      return encryptedData;
    }

    // If it has a serialize method, use it
    if (typeof encryptedData.serialize === 'function') {
      return encryptedData.serialize();
    }

    // If it has encryptedData property, try to serialize that
    if (encryptedData.encryptedData) {
      if (encryptedData.encryptedData instanceof Uint8Array) {
        return encryptedData.encryptedData;
      }
      if (typeof encryptedData.encryptedData.serialize === 'function') {
        return encryptedData.encryptedData.serialize();
      }
    }

    // If it's a hex string, convert to bytes
    if (typeof encryptedData === 'string' && encryptedData.startsWith('0x')) {
      const hex = encryptedData.slice(2);
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
      }
      return bytes;
    }

    throw new Error('Unable to serialize encrypted data - unknown format');
  } catch (error) {
    console.error('Serialization failed:', error);
    throw new Error(`Failed to serialize encrypted data: ${error.message}`);
  }
}

/**
 * Decrypt a ciphertext (backend use only)
 * Requires admin/authorized wallet
 * 
 * @param {Uint8Array|string} ciphertext - Encrypted data to decrypt
 * @param {string} contractAddress - Contract address
 * @param {object} signer - Ethers signer with decryption permissions
 * @returns {Promise<number>} Decrypted value
 */
export async function decryptValue(ciphertext, contractAddress, signer) {
  const instance = await getFHEVMInstance();

  try {
    console.log('Decrypting value...');

    // Convert hex string to Uint8Array if needed
    let ctBytes = ciphertext;
    if (typeof ciphertext === 'string' && ciphertext.startsWith('0x')) {
      const hex = ciphertext.slice(2);
      ctBytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        ctBytes[i / 2] = parseInt(hex.substr(i, 2), 16);
      }
    }

    // Decrypt using FHEVM SDK
    // Note: Actual method name may vary based on SDK version
    const decrypted = await instance.decrypt(ctBytes, contractAddress, signer);

    console.log('Value decrypted successfully');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error(`Failed to decrypt value: ${error.message}`);
  }
}

/**
 * Reset the FHEVM instance (useful for testing or network changes)
 */
export function resetFHEVM() {
  fhevmInstance = null;
  console.log('FHEVM instance reset');
}
