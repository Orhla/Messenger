'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Users } from 'lucide-react';
import type { Profile } from '@/lib/types';
import SearchUsers from '@/components/SearchUsers';

type Props = {
    members: Profile[];
    onAddMember: (profile: Profile) => void;
};

export default function MembersPanel({ members, onAddMember }: Props) {
    const [showManagePanel, setShowManagePanel] = useState(false);

    const memberIds = members.map((member) => member.id);

    return (
        <div className="relative inline-block">
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

            {showManagePanel && (
                <div className="absolute left-0 top-full mt-1 w-80 rounded-2xl border bg-popover p-4 shadow-xl text-popover-foreground animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                    <div className="flex flex-col gap-3">
                        {/* Поиск и добавление */}
                        <div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                                <UserPlus className="h-3.5 w-3.5" />
                                <span>Пригласить пользователя</span>
                            </div>
                            <SearchUsers
                                onSelect={onAddMember}
                                excludeIds={memberIds}
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
        </div>
    );
}
