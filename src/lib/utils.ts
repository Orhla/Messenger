import type { Message, SystemMessage } from '@/lib/types';

export { cn } from 'cn';

export function getUsername(): string {
    // а как пользователь может изменить имя? )
    const stored = localStorage.getItem('username');
    if (stored) return stored;
    const name = 'User_' + Math.random().toString(36).slice(2, 6);
    localStorage.setItem('username', name);
    return name;
}

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

export function isSystemMessage(
    message: Message | SystemMessage,
): message is SystemMessage {
    return 'type' in message && message.type === 'system';
}
