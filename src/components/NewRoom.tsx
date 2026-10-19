import { useState, type SubmitEventHandler } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, X, Hash, AlertCircle } from 'lucide-react';

import SearchUsers from '@/components/SearchUsers.tsx';
import type { Profile } from '@/lib/types.ts';
import { createRoom } from '@/lib/rooms.ts';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import { createRoomKeys } from '@/lib/roomKeyManager';

export default function NewRoom() {
    const [initialMembers, setInitialMembers] = useState<Profile[]>([]);
    const [roomName, setRoomName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorText, setErrorText] = useState<string | null>(null); // Стейт для вывода ошибок крипты
    const navigate = useNavigate();

    const { session } = useAuth();
    const currentUserId = session!.user.id;

    const handleRemoveMember = (profileId: string) => {
        setInitialMembers((prev) =>
            prev.filter((member) => member.id !== profileId),
        );
        setErrorText(null);
    };

    const excludeIds = [
        currentUserId,
        ...initialMembers.map((member) => member.id),
    ].filter(Boolean);

    const handleSelectMember = (profile: Profile) => {
        setErrorText(null);
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
            setErrorText(null);

            const newRoom = await createRoom(roomName, initialMembers);
            const allMemberIds = [
                currentUserId,
                ...initialMembers.map((m) => m.id),
            ];

            await createRoomKeys(newRoom.id, currentUserId, allMemberIds);

            navigate(`/chat/room/${newRoom.id}`);
        } catch (error) {
            console.error('Ошибка при создании зашифрованной комнаты:', error);
            setErrorText(
                'Не удалось настроить шифрование для комнаты. Попробуйте еще раз.',
            );
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

            {/* Контент формы с прокруткой */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <form onSubmit={handleCreate} className="space-y-6">
                    {/* Вывод ошибки шифрования / валидации ключей участников */}
                    {errorText && (
                        <div className="flex gap-2.5 items-start p-3 text-sm rounded-md bg-destructive/10 text-destructive border border-destructive/20 animate-in fade-in-50 duration-200">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-medium">
                                    Ошибка безопасности
                                </p>
                                <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">
                                    {errorText}
                                </p>
                            </div>
                        </div>
                    )}

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
                                onChange={(e) => {
                                    setRoomName(e.target.value);
                                    if (errorText) setErrorText(null);
                                }}
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
                        <SearchUsers
                            onSelect={handleSelectMember}
                            excludeIds={excludeIds}
                        />

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
                            {isLoading
                                ? 'Создание и шифрование...'
                                : 'Создать комнату'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
