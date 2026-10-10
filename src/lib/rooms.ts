import { supabase } from '@/supabase';
import type { Profile, Room } from '@/lib/types';
import { getSession } from '@/lib/auth.ts';

export async function createRoom(
    name: string,
    initialMembers: Profile[],
): Promise<Room> {
    const session = await getSession();
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
        .select('*')
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
    return {
        id: newRoom.id,
        room_name: newRoom.room_name,
    };
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
        .select('*, profiles:member_id(id, email)')
        .eq('room_id', roomId);

    if (error) throw error;
    return (data
        ?.map((item: any) => {
            if (!item.profiles) return null;
            return Array.isArray(item.profiles)
                ? item.profiles[0]
                : item.profiles;
        })
        .filter(Boolean) || []) as Profile[];
}
