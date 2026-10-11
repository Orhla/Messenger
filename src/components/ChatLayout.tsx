'use client';

import Sidebar from '@/components/Sidebar';
import type { Profile, Room } from '@/lib/types';
import { useNavigate, useParams } from 'react-router-dom';

type Props = {
    children: React.ReactNode;
};

export default function ChatLayout({ children }: Props) {
    const { chatId } = useParams<{ chatId: string }>();
    const navigate = useNavigate();

    const handleSelectUser = (profile: Profile) => {
        navigate(`/chat/direct/${profile.id}`);
    };

    const handleSelectRoom = (room: Room) => {
        navigate(`/chat/room/${room.id}`);
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-background">
            <Sidebar
                currentActiveId={chatId}
                onSelectUser={handleSelectUser}
                onSelectRoom={handleSelectRoom}
            />
            <main className="flex-1 flex h-full flex-col min-w-0 border-l">
                {children}
            </main>
        </div>
    );
}
