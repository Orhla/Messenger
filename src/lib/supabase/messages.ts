import type { ChatMessage, EncryptedMessage, Message } from '@/lib/types.ts';
import { supabase } from '@/supabase.ts';
import { getOrCreateChatKey } from '@/lib/chatKeyManager.ts';
import { encryptText } from '@/lib/crypto.ts';
import { decryptMessageText } from '@/lib/message.decrypter';

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
    const decryptedMessages = await Promise.all(
        data.map(async (msg) => {
            const plainText = await decryptMessageText(
                msg.ciphertext,
                msg.iv,
                aesKey,
            );
            return {
                ...msg,
                text: plainText,
            };
        }),
    );
    return decryptedMessages;
}

export async function sendDirectMessage(
    text: string,
    senderId: string,
    receiverId: string,
): Promise<void> {
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

export async function insertDirectMessage(payload: {
    ciphertext: string;
    iv: string;
    receiver_id: string;
    sender_id: string;
}): Promise<void> {
    const { error } = await supabase.from('messages').insert(payload);
    if (error) throw error;
}

export function subscribeToDirectMessages(
    currentUserId: string,
    correspondentId: string,
    onMessage: (message: Message) => void,
): () => void {
    const chatId = [currentUserId, correspondentId].sort().join('_');
    const channel = supabase
        .channel(`chat-${chatId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            async ({ new: message }: { new: EncryptedMessage }) => {
                if (
                    message.sender_id === correspondentId ||
                    message.receiver_id === correspondentId
                ) {
                    const aesKey = await getOrCreateChatKey(correspondentId);
                    const plainText = await decryptMessageText(
                        message.ciphertext,
                        message.iv,
                        aesKey,
                    );

                    const mappedMessage: Message = {
                        id: message.id,
                        senderId: message.sender_id,
                        senderLabel:
                            message.sender_id === currentUserId
                                ? 'Вы'
                                : correspondentId,
                        text: plainText,
                        createdAt: message.created_at,
                    };

                    onMessage(mappedMessage);
                }
            },
        )
        .subscribe();

    return () => channel.unsubscribe();
}
