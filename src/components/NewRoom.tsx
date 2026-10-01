import SearchUsers from '@/components/SearchUsers.tsx';
import type { Profile } from '@/lib/types.ts';
import { useState } from 'react';
import { createRoom } from '@/lib/rooms.ts';

export default function NewRoom() {
    const [initialMembers, setInitialMembers] = useState<Profile[]>([]);
    const [roomName, setRoomName] = useState('');

    return (
        <div className="flex h-screen flex-col max-w-md mx-auto border-x bg-background">
            <p>Создать новую комнату</p>
            <p>Выбранные участники: {initialMembers.map((member) => member.email).join(', ')}</p>
            <SearchUsers onSelectReceiver={(profile) => {
                setInitialMembers((prev) => [...prev, profile]);
            }} />
            <input type="text" placeholder="Название комнаты" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
            <button onClick={()=>{createRoom(roomName, initialMembers)}}>Создать комнату</button>
        </div>
    );
}
