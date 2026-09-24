import { supabase } from '@/supabase';
import type { ChatMessage } from '@/lib/types';
import { getOrCreateChatKey } from '@/lib/chatKeyManager';
import { decryptText, encryptText } from '@/lib/crypto';

export async function fetchMessages(
    correspondentId: string,
): Promise<ChatMessage[]> {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${correspondentId},receiver_id.eq.${correspondentId}`)
        .order('created_at');

    if (error) throw error;

    const aesKey = await getOrCreateChatKey(correspondentId);
    const decryptedMessages = await Promise.all(
        data.map(async (msg) => {
            try {
                const { plainText } = await decryptText(
                    aesKey,
                    msg.ciphertext,
                    msg.iv,
                );
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

export async function sendMessage(
    text: string,
    senderId: string,
    receiverId: string,
): Promise<void> {
    const x = await supabase.auth.getUser();
    console.log('Current user:', x.data.user);
    const aesKey = await getOrCreateChatKey(receiverId);
    const { ciphertext, iv } = await encryptText(aesKey, text);
    const { error } = await supabase.from('messages').insert({
        ciphertext: ciphertext,
        iv: iv,
        receiver_id: receiverId,
        sender_id: senderId,
    });
    if (error) throw error;
}

export function subscribeToMessages(
    currentUserId: string,
    correspondentId: string,
    onMessage: (message: ChatMessage) => void,
): () => void {
    const chatId = [currentUserId, correspondentId].sort().join('_');
    const channel = supabase
        .channel(`chat-${chatId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            async ({ new: message }) => {
                const m = message as ChatMessage;
                if (
                    m.sender_id === correspondentId ||
                    m.receiver_id === correspondentId
                ) {
                    try {
                        const aesKey =
                            await getOrCreateChatKey(correspondentId);
                        const { plainText } = await decryptText(
                            aesKey,
                            m.ciphertext,
                            m.iv,
                        );

                        onMessage({
                            ...m,
                            ciphertext: plainText,
                        } as ChatMessage);
                    } catch (e) {
                        console.error('Ошибка дешифрования в realtime:', e);
                    }
                }
            },
        )
        .subscribe();

    return () => channel.unsubscribe();
}
