import { supabase } from '@/supabase';
import type { GroupChatMessage } from '@/lib/types';

export async function createRoom(
    name: string,
    creatorId: string,
): Promise<void> {
    const { data: newRoom, error: roomError } = await supabase
        .from('rooms')
        .insert({
            room_name: name,
            creator: creatorId,
        })
        .select('id')
        .single();

    if (roomError) throw roomError;
    if (!newRoom)
        throw new Error('Не удалось получить ID созданного группового чата');

    const { error: memberError } = await supabase.from('room_members').insert({
        room_id: newRoom.id,
        member_id: creatorId,
    });

    if (memberError) throw memberError;
}

export async function getRooms() {
    const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at');

    if (error) throw error;
    return data;
}

export async function addMember(roomId: string, userId: string): Promise<void> {
    const { error } = await supabase.from('room_members').insert({
        room_id: roomId,
        member_id: userId,
    });

    if (error) throw error;
}

export async function getRoomMembers(roomId: string) {
    const { data, error } = await supabase
        .from('room_members')
        .select('*')
        .eq('room_id', roomId);

    if (error) throw error;
    return data;
}

export async function fetchRoomMessages(roomId: string) {
    const { data, error } = await supabase
        .from('room_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at');

    if (error) throw error;
    return data;
}

export async function sendRoomMessage(
    roomId: string,
    text: string,
    senderId: string,
): Promise<void> {
    const { error } = await supabase.from('room_messages').insert({
        room_id: roomId,
        sender_id: senderId,
        text: text,
    });

    if (error) throw error;
}

export function subscribeToRoomMessages(
    roomId: string,
    onMessage: (message: GroupChatMessage) => void,
): () => void {
    const channel = supabase
        .channel(`room_messages:${roomId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'room_messages',
                filter: `room_id=eq.${roomId}`,
            },
            async ({ new: message }: { new: GroupChatMessage }) => {
                if (message && message.room_id === roomId) {
                    try {
                        const plainText = message.text;

                        onMessage({
                            ...message,
                            text: plainText,
                        });
                    } catch (e) {
                        console.error('Ошибка обработки сообщения:', e);
                    }
                }
            },
        )
        .subscribe();

    return () => {
        channel.unsubscribe();
    };
}
