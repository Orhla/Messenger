import { supabase } from '@/supabase';
import type { GroupChatMessage, Profile } from '@/lib/types';
import { getSession } from '@/lib/auth.ts';

export async function createRoom(
    name: string,
    initialMembers: Profile[],
): Promise<void> {

    const session = await getSession()
    if (!session || !session.user) {
        throw new Error('User is not authenticated');
    }
    const creatorId = session?.user?.id;
    console.warn(
        'createRoom called with name:',
        name,
        'initialMembers:',
        initialMembers,
        'creator:',
        session?.user,
    );

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

    const memberIds = Array.from(
        new Set([creatorId, ...initialMembers.map((m) => m.id)]),
    );

    const { error: memberError } = await supabase.from('room_members').insert(
        memberIds.map((memberId) => ({
            room_id: newRoom.id,
            member_id: memberId,
        })),
    );

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
