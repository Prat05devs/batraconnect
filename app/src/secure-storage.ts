import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import { createEncryptedStorage, type KeyValueStorage } from './encrypted-storage';
const KEY_NAME = 'batra-connect.storage-key.v1';
let key: Promise<AESEncryptionKey> | null = null;
/** Device-bound 256-bit key kept in the iOS Keychain / Android Keystore, never in AsyncStorage. */
function storageKey() {
  key ??= (async () => {
    const stored = await SecureStore.getItemAsync(KEY_NAME);
    if (stored) return AESEncryptionKey.import(stored, 'hex');
    const created = await AESEncryptionKey.generate();
    await SecureStore.setItemAsync(KEY_NAME, await created.encoded('hex'), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    return created;
  })().catch(error => {
    key = null;
    throw error;
  });
  return key;
}
const encoder = new TextEncoder(),
  decoder = new TextDecoder();
/**
 * Local reports, drafts, notes and the send queue are encrypted at rest on Android and iOS.
 * The web preview has no hardware-backed key store, so it keeps the browser's storage.
 */
export const secureStorage: KeyValueStorage =
  Platform.OS === 'web'
    ? AsyncStorage
    : createEncryptedStorage(AsyncStorage, {
        encrypt: async text =>
          (await (
            await aesEncryptAsync(encoder.encode(text), await storageKey())
          ).combined('base64')) as string,
        decrypt: async sealed =>
          decoder.decode(
            (await aesDecryptAsync(AESSealedData.fromCombined(sealed), await storageKey(), {
              output: 'bytes',
            })) as Uint8Array,
          ),
      });
