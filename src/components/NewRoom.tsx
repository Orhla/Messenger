import { useState, type SubmitEventHandler } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, X, Hash } from 'lucide-react';

import SearchUsers from '@/components/SearchUsers.tsx';
import type { Profile } from '@/lib/types.ts';
import { createRoom } from '@/lib/rooms.ts';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function NewRoom() {
    const [initialMembers, setInitialMembers] = useState<Profile[]>([]);
    const [roomName, setRoomName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleRemoveMember = (profileId: string) => {
        setInitialMembers((prev) =>
            prev.filter((member) => member.id !== profileId),
        );
    };

    const handleSelectMember = (profile: Profile) => {
        setInitialMembers((prev) => {
            if (prev.some((member) => member.id === profile.id)) return prev;
            return [...prev, profile];
        });
    };

    const handleCreate: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();
        if (!roomName.trim()) return;

        try {
            setIsLoading(true);
            const newRoom = await createRoom(roomName, initialMembers);
            navigate(`/chat/room/${newRoom.id}`); // или на другой ваш роут со списком комнат
        } catch (error) {
            console.error('Ошибка при создании комнаты:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen flex-col max-w-md mx-auto border-x bg-background overflow-hidden">
            {/* Шапка страницы */}
            <header className="flex items-center gap-3 border-b px-4 py-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(-1)}
                    className="h-8 w-8"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="font-semibold text-lg">Новая комната</h1>
            </header>

            {/* Контент формы с прокруткой, если участников будет много */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <form onSubmit={handleCreate} className="space-y-6">
                    {/* Секция: Название */}
                    <div className="space-y-2">
                        <Label htmlFor="room-name">Название комнаты</Label>
                        <div className="relative">
                            <Hash className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="room-name"
                                type="text"
                                placeholder="например: флудилка, разработка"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                className="pl-9"
                                maxLength={50}
                                autoFocus
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Секция: Участники */}
                    <div className="space-y-3">
                        <Label>Добавить участников</Label>

                        {/* Поиск пользователей */}
                        <SearchUsers onSelectReceiver={handleSelectMember} />

                        {/* Список выбранных участников */}
                        <div className="space-y-2">
                            <span className="text-xs font-medium text-muted-foreground block">
                                Выбрано участников: {initialMembers.length}
                            </span>

                            {initialMembers.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-muted/40 min-h-[44px] items-center">
                                    {initialMembers.map((member) => (
                                        <Badge
                                            key={member.id}
                                            variant="secondary"
                                            className="gap-1 py-1 pl-2.5 pr-1.5 text-sm font-normal"
                                        >
                                            <span className="truncate max-w-[150px]">
                                                {member.email}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-4 w-4 rounded-full p-0 hover:bg-muted-foreground/20"
                                                onClick={() =>
                                                    handleRemoveMember(
                                                        member.id,
                                                    )
                                                }
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed rounded-md bg-muted/20 text-muted-foreground">
                                    <UserPlus className="h-6 w-6 stroke-1 mb-1" />
                                    <p className="text-xs">
                                        Пока никто не добавлен
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Фиксированная или нижняя кнопка создания */}
                    <div className="pt-4">
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={!roomName.trim() || isLoading}
                        >
                            {isLoading ? 'Создание...' : 'Создать комнату'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
