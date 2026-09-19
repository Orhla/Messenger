'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Props = {
    messageText: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    inputPlaceholder: string;
    onClick: () => void;
    buttonText: string;
};

export default function ChatFooter({
    messageText,
    onChange,
    onKeyDown,
    inputPlaceholder,
    onClick,
    buttonText,
}: Props) {
    return (
        <footer className="p-4 border-t flex gap-2 bg-background">
            <Input
                value={messageText}
                onChange={onChange}
                onKeyDown={onKeyDown}
                placeholder={inputPlaceholder}
                className="flex-1"
            />
            <Button onClick={onClick}>{buttonText}</Button>
        </footer>
    );
}
