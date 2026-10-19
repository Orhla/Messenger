import { decryptText } from '@/lib/crypto';

export async function decryptMessageText(
    ciphertext: string,
    iv: string,
    aesKey: CryptoKey,
): Promise<string> {
    try {
        const { plainText } = await decryptText(aesKey, ciphertext, iv);
        return plainText;
    } catch {
        console.error(`Ошибка дешифрования сообщения`);
        return 'Ошибка дешифрования сообщения';
    }
}
