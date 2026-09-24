import { get, set } from 'idb-keyval';

const PRIVATE_KEY_STORAGE_KEY = 'e2e-private-key';

export async function savePrivateKey(key: CryptoKey): Promise<void> {
    await set(PRIVATE_KEY_STORAGE_KEY, key);
}

export async function loadPrivateKey(): Promise<CryptoKey | null> {
    const key = await get(PRIVATE_KEY_STORAGE_KEY);
    return key ?? null;
}
