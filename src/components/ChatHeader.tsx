'use client';

import { Button } from '@/components/ui/button';

type Props = { chatName: string; buttonText: string; onClick: () => void };

export default function ChatHeader({ chatName, buttonText, onClick }: Props) {
    return (
        <header className="p-4 border-b flex items-center justify-between">
            <span className="font-semibold">{chatName}</span>
            <Button className="text-sm hover:underline" onClick={onClick}>
                {buttonText}
            </Button>
        </header>
    );
}
