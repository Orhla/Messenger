import ChatHeader from '@/components/ChatHeader';
import ChatArea from '@/components/ChatArea';
import ChatFooter from '@/components/ChatFooter';
import { useState } from 'react';
import type { Message, Profile, SystemMessage } from '@/lib/types';
import { AttachButton } from '@/components/AttachButton';

type Props = {
    chatTitle: string;
    messages: (Message | SystemMessage)[];
    members: Profile[];
    onDownloadFile: (messageId: string) => Promise<void>;
    onSend: (text: string, file: File | null) => Promise<void>;
    onSignOut: () => void;
    children?: React.ReactNode;
};

export default function ChatView({
    chatTitle,
    messages,
    members,
    onDownloadFile,
    onSend,
    onSignOut,
    children,
}: Props) {
    const [text, setText] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSending, setIsSending] = useState(false);

    const handleSend = async () => {
        const trimmedText = text.trim();
        if (!trimmedText && !selectedFile) return;

        setIsSending(true);

        try {
            await onSend(trimmedText, selectedFile);
            setText('');
            setSelectedFile(null);
        } catch {
            console.error('Ошибка при отправке сообщения');
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <>
            <ChatHeader
                buttonText="Выйти"
                chatName={chatTitle}
                onClick={onSignOut}
            >
                {children}
            </ChatHeader>

            <ChatArea
                messages={messages}
                members={members}
                onDownloadFile={onDownloadFile}
            />

            <ChatFooter
                buttonText={isSending ? '...' : 'Отправить'}
                inputPlaceholder="Напишите сообщение..."
                messageText={text}
                onChange={(e) => setText(e.target.value)}
                onClick={handleSend}
                onKeyDown={handleKeyDown}
                attachButton={
                    <AttachButton
                        selectedFile={selectedFile}
                        onFileSelect={setSelectedFile}
                        disabled={isSending}
                    />
                }
            />
        </>
    );
}
