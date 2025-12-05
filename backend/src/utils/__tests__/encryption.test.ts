import { encrypt, decrypt, encryptCredentials, decryptCredentials } from '../encryption';

describe('Encryption Utilities', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const originalText = 'my-secret-api-token';
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
      expect(encrypted).not.toBe(originalText);
    });

    it('should produce different encrypted values for the same input', () => {
      const text = 'same-text';
      const encrypted1 = encrypt(text);
      const encrypted2 = encrypt(text);
      
      // Different IVs should produce different encrypted strings
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same value
      expect(decrypt(encrypted1)).toBe(text);
      expect(decrypt(encrypted2)).toBe(text);
    });

    it('should handle special characters and unicode', () => {
      const text = 'Special chars: !@#$%^&*() 中文 émojis 🎉';
      const encrypted = encrypt(text);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(text);
    });

    it('should throw error when encrypting empty string', () => {
      expect(() => encrypt('')).toThrow('Cannot encrypt empty text');
    });

    it('should throw error when decrypting empty string', () => {
      expect(() => decrypt('')).toThrow('Cannot decrypt empty text');
    });

    it('should throw error when decrypting invalid format', () => {
      expect(() => decrypt('invalid-format')).toThrow('Invalid encrypted text format');
    });
  });

  describe('encryptCredentials and decryptCredentials', () => {
    it('should encrypt and decrypt credentials object', () => {
      const credentials = {
        shopDomain: 'myshop.myshopify.com',
        accessToken: 'shpat_1234567890abcdef',
        apiKey: 'api-key-123',
        apiSecret: 'api-secret-456'
      };
      
      const encrypted = encryptCredentials(credentials);
      const decrypted = decryptCredentials(encrypted);
      
      expect(decrypted).toEqual(credentials);
      expect(encrypted).not.toContain(credentials.accessToken);
    });

    it('should handle nested objects in credentials', () => {
      const credentials = {
        shop: {
          domain: 'test.myshopify.com',
          id: 12345
        },
        tokens: {
          access: 'token-123',
          refresh: 'token-456'
        }
      };
      
      const encrypted = encryptCredentials(credentials);
      const decrypted = decryptCredentials(encrypted);
      
      expect(decrypted).toEqual(credentials);
    });
  });
});
