import type { GroupChatMessage, Message } from '@/lib/types.ts';
import { supabase } from '@/supabase.ts';
import { getRoomKey } from '@/lib/roomKeyManager';
import { decryptText, encryptText } from '@/lib/crypto';

export async function fetchRoomMessages(chatId: string): Promise<Message[]> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Пользователь не авторизован');

    const { data, error } = await supabase
        .from('room_messages')
        .select('*, profiles(email)')
        .eq('room_id', chatId)
        .order('created_at');

    if (error) throw error;
    if (!data || data.length === 0) return [];

    try {
        const roomKey = await getRoomKey(chatId, user.id);

        return await Promise.all(
            data.map(async (msg) => {
                let plainText = '🔒 [Ошибка декодирования сообщения]';
                try {
                    const result = await decryptText(
                        roomKey,
                        msg.ciphertext,
                        msg.iv,
                    );
                    plainText = result.plainText;
                } catch (e) {
                    console.error('Ошибка дешифрования строки сообщения:', e);
                }

                const attachment = msg.attachment_path
                    ? {
                          path: msg.attachment_path,
                          name: msg.attachment_name || 'file',
                          size: msg.attachment_size || 0,
                          mime:
                              msg.attachment_mime || 'application/octet-stream',
                      }
                    : undefined;

                return {
                    id: msg.id,
                    senderId: msg.sender_id,
                    senderLabel: msg.profiles?.email || msg.sender_id,
                    text: plainText,
                    createdAt: msg.created_at,
                    attachment,
                };
            }),
        );
    } catch (keyError) {
        console.error('Ключ от комнаты отсутствует:', keyError);
        return data.map((msg: GroupChatMessage) => {
            return {
                id: msg.id,
                senderId: msg.sender_id,
                text: '🔒 [Сообщение зашифровано. Ключ отсутствует]',
                createdAt: msg.created_at,
            };
        });
    }
}

export async function sendRoomMessage(
    text: string,
    senderId: string,
    chatId: string,
): Promise<void> {
    const roomKey = await getRoomKey(chatId, senderId);
    const { ciphertext, iv } = await encryptText(roomKey, text);

    const { error } = await supabase.from('room_messages').insert({
        ciphertext: ciphertext,
        iv: iv,
        room_id: chatId,
        sender_id: senderId,
    });
    if (error) throw error;
}

export async function insertRoomMessage(payload: {
    ciphertext: string;
    iv: string;
    room_id: string;
    sender_id: string;
    attachment_path?: string | null;
    attachment_name?: string | null;
    attachment_size?: number | null;
    attachment_mime?: string | null;
}): Promise<void> {
    const { error } = await supabase.from('room_messages').insert(payload);
    if (error) throw error;
}

export function subscribeToRoomMessages(
    chatId: string,
    onMessage: (message: Message) => void,
): () => void {
    const channel = supabase
        .channel(`room-chat-${chatId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'room_messages',
                filter: `room_id=eq.${chatId}`,
            },
            async (event: {
                new: GroupChatMessage & {
                    attachment_path?: string | null;
                    attachment_name?: string | null;
                    attachment_size?: number | null;
                    attachment_mime?: string | null;
                };
            }) => {
                const message = event.new;
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                let plainText = '🔒 [Ошибка декодирования]';

                if (user) {
                    try {
                        const roomKey = await getRoomKey(chatId, user.id);
                        const result = await decryptText(
                            roomKey,
                            message.ciphertext,
                            message.iv,
                        );
                        plainText = result.plainText;
                    } catch (err) {
                        console.error('Realtime-дешифрование провалено:', err);
                    }
                }

                const attachment = message.attachment_path
                    ? {
                          path: message.attachment_path,
                          name: message.attachment_name || 'file',
                          size: message.attachment_size || 0,
                          mime:
                              message.attachment_mime ||
                              'application/octet-stream',
                      }
                    : undefined;

                onMessage({
                    id: message.id,
                    senderId: message.sender_id,
                    text: plainText,
                    createdAt: message.created_at,
                    attachment,
                });
            },
        )
        .subscribe();

    return () => channel.unsubscribe();
}
