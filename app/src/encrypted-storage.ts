export type KeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};
export type Cipher = {
  encrypt: (plaintext: string) => Promise<string>;
  decrypt: (sealed: string) => Promise<string>;
};
const PREFIX = 'enc1:';
/**
 * Wraps a key-value store so every value is sealed with AES-GCM. Values written before encryption was
 * introduced are still readable and are re-sealed on their next write.
 */
export function createEncryptedStorage(base: KeyValueStorage, cipher: Cipher): KeyValueStorage {
  return {
    async getItem(key) {
      const raw = await base.getItem(key);
      if (raw === null || !raw.startsWith(PREFIX)) return raw;
      return cipher.decrypt(raw.slice(PREFIX.length));
    },
    async setItem(key, value) {
      await base.setItem(key, PREFIX + (await cipher.encrypt(value)));
    },
    removeItem: key => base.removeItem(key),
  };
}
export const isSealed = (raw: string | null) => !!raw?.startsWith(PREFIX);
