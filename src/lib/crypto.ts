export function arrayBufferToBase64(arrayBuf: ArrayBuffer): string {
    const bytes = new Uint8Array(arrayBuf);
    const binString = Array.from(bytes, (byte) =>
        String.fromCodePoint(byte),
    ).join('');
    return btoa(binString);
}

export function base64ToArrayBuffer(base64String: string): ArrayBuffer {
    const binString = atob(base64String);
    const bytes = new Uint8Array(binString.length);

    for (let i = 0; i < binString.length; i++) {
        bytes[i] = binString.charCodeAt(i);
    }

    return bytes.buffer;
}

export async function generateKeyPair(): Promise<CryptoKeyPair> {
    return crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits'],
    );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
    const raw = await crypto.subtle.exportKey('spki', key);
    return arrayBufferToBase64(raw);
}

export async function importPublicKey(base64: string): Promise<CryptoKey> {
    const raw = base64ToArrayBuffer(base64);
    return crypto.subtle.importKey(
        'spki',
        raw,
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        [],
    );
}

export async function deriveSharedSecretBits(
    myPrivateKey: CryptoKey,
    theirPublicKey: CryptoKey,
): Promise<ArrayBuffer> {
    return crypto.subtle.deriveBits(
        { name: 'ECDH', public: theirPublicKey },
        myPrivateKey,
        256,
    );
}

export async function deriveAesKeyFromSecret(
    secretBits: ArrayBuffer,
): Promise<CryptoKey> {
    const hkdfMaterial = await crypto.subtle.importKey(
        'raw',
        secretBits,
        'HKDF',
        false,
        ['deriveKey'],
    );

    return crypto.subtle.deriveKey(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: new Uint8Array(0),
            info: new TextEncoder().encode('messenger-chat-key'),
        },
        hkdfMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

export async function encryptText(
    key: CryptoKey,
    plaintext: string,
): Promise<{ ciphertext: string; iv: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertextBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded,
    );

    return {
        ciphertext: arrayBufferToBase64(ciphertextBuffer),
        iv: arrayBufferToBase64(iv.buffer),
    };
}

export async function decryptText(
    key: CryptoKey,
    ciphertext: string,
    iv: string,
): Promise<{ plainText: string }> {
    const ivBuffer = base64ToArrayBuffer(iv);
    const ciphertextBuffer = base64ToArrayBuffer(ciphertext);

    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
        key,
        ciphertextBuffer,
    );

    const decoded = new TextDecoder().decode(decryptedBuffer);

    return {
        plainText: decoded,
    };
}
