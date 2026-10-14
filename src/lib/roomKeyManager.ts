import { generateRoomKey, unwrapRoomKey, wrapRoomKey } from '@/lib/roomCrypto';
import type { DbRoomKeyRow } from '@/lib/types';
import { getOrCreateChatKey } from '@/lib/chatKeyManager';
import { fetchRoomKey, insertRoomKeys } from '@/lib/supabase/roomKeys';

const roomKeyCache = new Map<string, CryptoKey>();

export async function createRoomKeys(
    roomId: string,
    creatorId: string,
    memberIds: string[],
): Promise<void> {
    const roomKey = await generateRoomKey();
    const rows: DbRoomKeyRow[] = [];

    for (const memberId of memberIds) {
        const pairKey = await getOrCreateChatKey(memberId);

        const { wrappedKey, iv } = await wrapRoomKey(roomKey, pairKey);

        rows.push({
            room_id: roomId,
            member_id: memberId,
            wrapped_by: creatorId,
            wrapped_key: wrappedKey,
            iv: iv,
        });
    }

    await insertRoomKeys(rows);

    roomKeyCache.set(roomId, roomKey);
}

export async function shareRoomKey(
    roomId: string,
    currentUserId: string,
    newMemberId: string,
): Promise<void> {
    const roomKey = await getRoomKey(roomId, currentUserId);

    const pairKey = await getOrCreateChatKey(newMemberId);

    const { wrappedKey, iv } = await wrapRoomKey(roomKey, pairKey);

    const row: DbRoomKeyRow = {
        room_id: roomId,
        member_id: newMemberId,
        wrapped_by: currentUserId,
        wrapped_key: wrappedKey,
        iv: iv,
    };

    await insertRoomKeys([row]);
}

export async function getRoomKey(
    roomId: string,
    currentUserId: string,
): Promise<CryptoKey> {
    if (roomKeyCache.has(roomId)) {
        return roomKeyCache.get(roomId)!;
    }

    const envelope = await fetchRoomKey(roomId, currentUserId);

    if (!envelope) {
        throw new Error(
            `Ключ для комнаты ${roomId} не найден, либо у вас нет к нему доступа.`,
        );
    }

    const pairKey = await getOrCreateChatKey(envelope.wrapped_by);

    const roomKey = await unwrapRoomKey(
        envelope.wrapped_key,
        envelope.iv,
        pairKey,
    );

    roomKeyCache.set(roomId, roomKey);
    return roomKey;
}
