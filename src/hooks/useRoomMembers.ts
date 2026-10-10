import { useCallback, useEffect, useState } from 'react';
import type { Profile } from '@/lib/types';
import { addMember, getRoomMembers } from '@/lib/rooms';

export function useRoomMembers(roomId: string | null) {
    const [members, setMembers] = useState<Profile[]>([]);

    useEffect(() => {
        setMembers([]);
        if (!roomId) return;

        let cancelled = false;
        getRoomMembers(roomId)
            .then((loaded) => {
                if (!cancelled) setMembers(loaded);
            })
            .catch(console.error);

        return () => {
            cancelled = true;
        };
    }, [roomId]);

    const add = useCallback(
        async (profile: Profile) => {
            if (!roomId) return;
            try {
                await addMember(roomId, profile.id);
                setMembers((prev) =>
                    prev.some((m) => m.id === profile.id)
                        ? prev
                        : [...prev, profile],
                );
            } catch (error) {
                console.error('Не удалось добавить участника в комнату:', error);
            }
        },
        [roomId],
    );

    return { members, addMember: add };
}
