import { arrayBufferToBase64, base64ToArrayBuffer } from '@/lib/utils';
import { decryptBytes, encryptBytes } from '@/lib/crypto';

export async function generateRoomKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
        'encrypt',
        'decrypt',
    ]);
}

export async function exportRoomKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return arrayBufferToBase64(exported);
}

export async function importRoomKey(base64: string): Promise<CryptoKey> {
    const raw = base64ToArrayBuffer(base64);
    return crypto.subtle.importKey(
        'raw',
        raw,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt'],
    );
}

export async function wrapRoomKey(
    roomKey: CryptoKey,
    pairKey: CryptoKey,
): Promise<{ wrappedKey: string; iv: string }> {
    const rawKeyBuffer = await crypto.subtle.exportKey('raw', roomKey);

    const { cipherbytes, iv } = await encryptBytes(pairKey, rawKeyBuffer);

    return {
        wrappedKey: cipherbytes,
        iv: iv,
    };
}

export async function unwrapRoomKey(
    wrappedKey: string,
    iv: string,
    pairKey: CryptoKey,
): Promise<CryptoKey> {
    const { bytes } = await decryptBytes(pairKey, wrappedKey, iv);

    return crypto.subtle.importKey(
        'raw',
        bytes,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt'],
    );
}
