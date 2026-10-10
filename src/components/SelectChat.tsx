import { MessageSquarePlus } from 'lucide-react';
import SearchUsers from '@/components/SearchUsers.tsx';
import type { Profile } from '@/lib/types.ts';
import { useNavigate } from 'react-router-dom';

export default function SelectChat() {
    const navigate = useNavigate();

    function handleSelectReceiver(profile: Profile) {
        navigate(`/chat/direct/${profile.id}`);
    }
    return (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-muted/5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground/70 mb-4 border border-dashed border-muted-foreground/30">
                <MessageSquarePlus className="h-8 w-8 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-semibold text-foreground/80">
                Чат не выбран
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-[240px]">
                Выберите собеседника в списке, чтобы начать переписку.
            </p>
            <SearchUsers onSelectReceiver={handleSelectReceiver} />
        </div>
    );
}
