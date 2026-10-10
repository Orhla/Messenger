// 'use client';

import type { Profile } from '@/lib/types';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, UserPlus, Users } from 'lucide-react';
import SearchUsers from '@/components/SearchUsers';

type Props = {
    chatName: string;
    buttonText: string;
    onClick: () => void;
    kind?: 'direct' | 'room';
    members?: Profile[];
    onAddMember?: (profile: Profile) => void;
};

export default function ChatHeader({
    chatName,
    buttonText,
    onClick,
    kind = 'direct',
    members = [],
    onAddMember,
}: Props) {
    const [showManagePanel, setShowManagePanel] = useState(false);
    const initials = chatName ? chatName.slice(0, 1).toUpperCase() : '?';
    const isRoom = kind === 'room';

    return (
        <header className="p-3 flex items-center justify-between bg-background gap-4 border-b relative z-50">
            {/* Блок профиля собеседника или комнаты */}
            {chatName ? (
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-muted/40 border shadow-sm">
                        <div className="relative">
                            <Avatar className="h-10 w-10 border">
                                <AvatarFallback className="bg-muted font-medium text-muted-foreground text-sm">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            {!isRoom && (
                                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                            )}
                        </div>

                        <div className="flex flex-col">
                            <span className="font-medium text-sm leading-tight text-foreground">
                                {chatName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {isRoom ? `Групповой чат` : 'в сети'}
                            </span>
                        </div>
                    </div>

                    {/* Кнопка "Участники" только для комнат */}
                    {isRoom && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-2 rounded-xl text-xs shadow-sm bg-muted/20"
                            onClick={() => setShowManagePanel(!showManagePanel)}
                        >
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>Участники</span>
                            <span className="ml-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                                {members.length}
                            </span>
                        </Button>
                    )}
                </div>
            ) : (
                <div />
            )}

            {/* Всплывающее меню управления участниками комнаты */}
            {isRoom && showManagePanel && (
                <div className="absolute left-3 top-[calc(100%+4px)] w-80 rounded-2xl border bg-popover p-4 shadow-xl text-popover-foreground animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex flex-col gap-3">
                        {/* Поиск и добавление */}
                        <div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                                <UserPlus className="h-3.5 w-3.5" />
                                <span>Пригласить пользователя</span>
                            </div>
                            <SearchUsers
                                onSelectReceiver={(profile) => {
                                    onAddMember?.(profile);
                                }}
                            />
                        </div>

                        {/* Список людей в комнате */}
                        <div className="border-t pt-2">
                            <span className="text-xs font-semibold text-muted-foreground block mb-2">
                                Сейчас в комнате ({members.length}):
                            </span>
                            <div className="max-h-40 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                                {members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="text-xs py-1.5 px-2.5 bg-muted/60 hover:bg-muted rounded-lg truncate font-medium text-foreground"
                                        title={member.email}
                                    >
                                        {member.email}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Кнопка выхода из аккаунта */}
            <div className="px-1.5 py-1.5 rounded-xl bg-muted/40 border shadow-sm flex items-center">
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                    onClick={onClick}
                    title={buttonText}
                >
                    <LogOut className="h-5 w-5" />
                </Button>
            </div>
        </header>
    );
}
