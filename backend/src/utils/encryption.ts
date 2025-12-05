import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derives a 32-byte key from the encryption key in config
 */
function getEncryptionKey(): Buffer {
  const key = config.encryption.key;
  
  // Ensure the key is exactly 32 bytes for AES-256
  if (key.length === KEY_LENGTH) {
    return Buffer.from(key, 'utf-8');
  }
  
  // If key is not 32 bytes, hash it to get a consistent 32-byte key
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypts a string using AES-256-CBC encryption
 * @param text - The plaintext string to encrypt
 * @returns The encrypted string in format: iv:encryptedData (both hex encoded)
 */
export function encrypt(text: string): string {
  if (!text) {
    throw new Error('Cannot encrypt empty text');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return IV and encrypted data separated by colon
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a string that was encrypted with the encrypt function
 * @param encryptedText - The encrypted string in format: iv:encryptedData
 * @returns The decrypted plaintext string
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) {
    throw new Error('Cannot decrypt empty text');
  }

  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted text format');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedData = parts[1];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Encrypts sensitive credentials for storage
 * @param credentials - The credentials object to encrypt
 * @returns Encrypted credentials as a JSON string
 */
export function encryptCredentials(credentials: Record<string, any>): string {
  const jsonString = JSON.stringify(credentials);
  return encrypt(jsonString);
}

/**
 * Decrypts credentials from storage
 * @param encryptedCredentials - The encrypted credentials string
 * @returns The decrypted credentials object
 */
export function decryptCredentials(encryptedCredentials: string): Record<string, any> {
  const decryptedString = decrypt(encryptedCredentials);
  return JSON.parse(decryptedString);
}
