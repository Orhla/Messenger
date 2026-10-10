'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import SearchUsers from '@/components/SearchUsers';

import type { ActiveChat, Profile, Room } from '@/lib/types';
import { getRooms } from '@/lib/rooms';
import { Link } from 'react-router-dom';

type SidebarProps = {
    onSelectUser: (profile: Profile) => void;
    onSelectRoom: (room: Room) => void;
    currentActive: ActiveChat;
};

export default function Sidebar({
    onSelectUser,
    onSelectRoom,
    currentActive,
}: SidebarProps) {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoadingRooms, setIsLoadingRooms] = useState(false);

    useEffect(() => {
        setIsLoadingRooms(true);
        getRooms()
            .then(setRooms)
            .catch((err) => console.error('Не удалось загрузить комнаты', err))
            .finally(() => setIsLoadingRooms(false));
    }, []);

    return (
        <div className="flex h-screen w-80 flex-col border-r bg-background">
            <Tabs defaultValue="direct" className="flex flex-1 flex-col">
                {/* Переключатель вкладок */}
                <div className="px-4 pt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="direct">Личные</TabsTrigger>
                        <TabsTrigger value="rooms">Комнаты</TabsTrigger>
                    </TabsList>
                </div>

                {/* Вкладка "Личные" */}
                <TabsContent
                    value="direct"
                    className="flex flex-1 flex-col m-0 p-4"
                >
                    <SearchUsers onSelectReceiver={onSelectUser} />
                </TabsContent>

                {/* Вкладка "Комнаты" */}
                <TabsContent
                    value="rooms"
                    className="flex flex-1 flex-col m-0 p-4 gap-4 overflow-hidden"
                >
                    {/* Создание комнаты */}
                    <Link to="/chat/room/new" className="w-full">
                        <Button
                            variant="outline"
                            className="w-full justify-center h-10"
                        >
                            ➕ Создать комнату
                        </Button>
                    </Link>

                    {/* Список комнат с прокруткой */}
                    <ScrollArea className="flex-1 pr-3">
                        {isLoadingRooms ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                Загрузка комнат...
                            </p>
                        ) : rooms.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                Комнат пока нет
                            </p>
                        ) : (
                            <div className="space-y-1">
                                {rooms.map((room) => {
                                    const isActive =
                                        currentActive?.kind === 'room' &&
                                        currentActive.room.id === room.id;
                                    return (
                                        <button
                                            key={room.id}
                                            onClick={() => onSelectRoom(room)}
                                            className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors block border border-transparent
                        ${
                            isActive
                                ? 'bg-primary text-primary-foreground font-medium'
                                : 'hover:bg-muted text-foreground'
                        }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="truncate">
                                                    # {room.room_name}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    );
}
