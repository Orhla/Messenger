import Sidebar from '@/components/Sidebar';
import type { Profile, Room } from '@/lib/types';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

export default function ChatLayout() {
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
                <Outlet />
            </main>
        </div>
    );
}
