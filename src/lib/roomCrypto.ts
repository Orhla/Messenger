import { arrayBufferToBase64, base64ToArrayBuffer } from '@/lib/utils';
import { decryptText, encryptText } from '@/lib/crypto';
import type { GroupChatMessage } from './types';

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
    const stringifiedKey = arrayBufferToBase64(rawKeyBuffer);

    const { ciphertext, iv } = await encryptText(pairKey, stringifiedKey);

    return {
        wrappedKey: ciphertext,
        iv: iv,
    };
}

export async function unwrapRoomKey(
    wrappedKey: string,
    iv: string,
    pairKey: CryptoKey,
): Promise<CryptoKey> {
    const { plainText } = await decryptText(pairKey, wrappedKey, iv);

    const rawKeyBuffer = base64ToArrayBuffer(plainText);

    return crypto.subtle.importKey(
        'raw',
        rawKeyBuffer,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt'],
    );
}

export async function encryptRoomMessage(
    text: string,
    roomKey: CryptoKey,
): Promise<{ ciphertext: string; iv: string }> {
    return await encryptText(roomKey, text);
}

export async function decryptRoomMessage(
    row: GroupChatMessage,
    roomKey: CryptoKey,
): Promise<string> {
    const { plainText } = await decryptText(roomKey, row.ciphertext, row.iv);
    return plainText;
}
