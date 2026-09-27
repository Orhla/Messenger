import { supabase } from '@/supabase';
import {
    deriveAesKeyFromSecret,
    deriveSharedSecretBits,
    importPublicKey,
} from '@/lib/crypto';
import { loadPrivateKey } from '@/lib/keystore';

const keyCache = new Map<string, CryptoKey>();
let currentPrivateKey: CryptoKey | null = null;

async function fetchRecipientPublicKey(
    correspondentId: string,
): Promise<CryptoKey> {
    const { data, error } = await supabase
        .from('profiles')
        .select('public_key')
        .eq('id', correspondentId)
        .single();

    if (error || !data?.public_key) {
        throw new Error(
            `Не удалось получить публичный ключ для пользователя: ${correspondentId}`,
        );
    }

    return await importPublicKey(data.public_key);
}

export async function getOrCreateChatKey(
    correspondentId: string,
): Promise<CryptoKey> {
    if (!currentPrivateKey) {
        currentPrivateKey = await loadPrivateKey();

        if (!currentPrivateKey) {
            throw new Error('Ключ не найден. Сгенерируйте ключ в настройках.');
        }
    }

    if (keyCache.has(correspondentId)) {
        return keyCache.get(correspondentId)!;
    }

    const theirPublicKey = await fetchRecipientPublicKey(correspondentId);
    const sharedSecret = await deriveSharedSecretBits(
        currentPrivateKey,
        theirPublicKey,
    );

    const aesKey = await deriveAesKeyFromSecret(sharedSecret);

    keyCache.set(correspondentId, aesKey);
    return aesKey;
}
