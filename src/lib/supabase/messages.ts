import type { ChatMessage } from '@/lib/types.ts';
import { supabase } from '@/supabase.ts';
import { getOrCreateChatKey } from '@/lib/chatKeyManager.ts';
import { decryptText } from '@/lib/crypto.ts';

export async function fetchDirectMessages(
    currentUserId: string,
    correspondentId: string,
): Promise<ChatMessage[]> {
    const { data, error } = await supabase
        .from('messages')
        .select('*, profiles(email)')
        .or(
            `and(sender_id.eq.${correspondentId},receiver_id.eq.${currentUserId}),` +
                `and(sender_id.eq.${currentUserId},receiver_id.eq.${correspondentId})`,
        )
        .order('created_at');

    if (error) throw error;

    const aesKey = await getOrCreateChatKey(correspondentId);
    // todo: move decryption logic to a separate function
    const decryptedMessages = await Promise.all(
        data.map(async (msg) => {
            try {
                const { plainText } = await decryptText(
                    aesKey,
                    msg.ciphertext,
                    msg.iv,
                );
                console.log('Дешифрованное сообщение:', plainText);
                return {
                    ...msg,
                    text: plainText,
                };
            } catch (e) {
                console.error('Ошибка дешифрования:', e);
                return { ...msg, text: 'Ошибка дешифрования' };
            }
        }),
    );
    return decryptedMessages;
}
