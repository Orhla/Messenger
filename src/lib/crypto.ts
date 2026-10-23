import { arrayBufferToBase64, base64ToArrayBuffer } from '@/lib/utils';

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
    overrideIv?: string,
): Promise<{ ciphertext: string; iv: string }> {
    const encoded = new TextEncoder().encode(plaintext);
    const explicitIv = overrideIv
        ? new Uint8Array(base64ToArrayBuffer(overrideIv))
        : undefined;

    const { cipherbytes, iv } = await encryptBytes(
        key,
        encoded.buffer,
        explicitIv,
    );

    return {
        ciphertext: cipherbytes,
        iv,
    };
}

export async function decryptText(
    key: CryptoKey,
    ciphertext: string,
    iv: string,
): Promise<{ plainText: string }> {
    const { bytes } = await decryptBytes(key, ciphertext, iv);

    const decoded = new TextDecoder().decode(bytes);

    return {
        plainText: decoded,
    };
}

export async function encryptBytes(
    key: CryptoKey,
    bytes: ArrayBuffer,
    explicitIv?: Uint8Array<ArrayBuffer>,
): Promise<{ cipherbytes: string; iv: string }> {
    const iv = explicitIv || crypto.getRandomValues(new Uint8Array(12));

    const ciphertextBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        bytes,
    );

    return {
        cipherbytes: arrayBufferToBase64(ciphertextBuffer),
        iv: arrayBufferToBase64(iv.buffer),
    };
}

export async function decryptBytes(
    key: CryptoKey,
    cipherbytes: string,
    iv: string,
): Promise<{ bytes: ArrayBuffer }> {
    const ivBuffer = base64ToArrayBuffer(iv);
    const cipherbytesBuffer = base64ToArrayBuffer(cipherbytes);

    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
        key,
        cipherbytesBuffer,
    );

    if (!decryptedBuffer || decryptedBuffer.byteLength === 0) {
        throw new Error('Получены пустые данные после расшифровки.');
    }

    return {
        bytes: decryptedBuffer,
    };
}
