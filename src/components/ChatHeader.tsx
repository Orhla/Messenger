'use client';

import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type Props = { chatName: string; buttonText: string; onClick: () => void };

export default function ChatHeader({ chatName, buttonText, onClick }: Props) {
    const initials = chatName ? chatName.slice(0, 1).toUpperCase() : '?';

    return (
        <header className="p-3 flex items-center justify-between bg-background gap-4">
            {/* Блок профиля собеседника */}
            {chatName ? (
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-muted/40 border shadow-sm">
                    <div className="relative">
                        <Avatar className="h-10 w-10 border">
                            <AvatarFallback className="bg-muted font-medium text-muted-foreground text-sm">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                    </div>

                    <div className="flex flex-col">
                        <span className="font-medium text-sm leading-tight text-foreground">
                            {chatName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            в сети
                        </span>
                    </div>
                </div>
            ) : (
                <div />
            )}

            {/* Кнопка выхода из аккаунта */}
            <div className="px-1.5 py-1.5 rounded-xl bg-muted/40 border shadow-sm flex items-center">
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={onClick}
                    title={buttonText}
                >
                    <LogOut className="h-5 w-5" />
                </Button>
            </div>
        </header>
    );
}
