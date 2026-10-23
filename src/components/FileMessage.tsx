import { Download, FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import type { AttachmentMetadata } from '@/lib/types';

type Props = {
    attachment: AttachmentMetadata;
    onDownload: () => Promise<void>;
    isMe: boolean;
};

export default function FileMessage({ attachment, onDownload, isMe }: Props) {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        if (isDownloading) return;
        setIsDownloading(true);
        try {
            await onDownload();
        } catch {
            console.error('Ошибка скачивания файла');
        } finally {
            setIsDownloading(false);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div
            className={`flex items-center gap-3 p-3 border rounded-xl max-w-sm my-1 shadow-sm transition-colors
                ${
                    isMe
                        ? 'bg-primary border-primary text-primary-foreground ml-auto'
                        : 'bg-muted border-border text-foreground mr-auto'
                }`}
        >
            <div
                className={`p-2 rounded-lg shrink-0 
                    ${isMe ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}
            >
                <FileText size={24} />
            </div>

            <div className="flex-1 min-w-0">
                <p
                    className={`text-sm font-medium truncate ${isMe ? 'text-white' : 'text-foreground'}`}
                    title={attachment.name}
                >
                    {attachment.name}
                </p>
                <p
                    className={`text-xs ${isMe ? 'text-white/70' : 'text-muted-foreground'}`}
                >
                    {formatSize(attachment.size)}
                </p>
            </div>

            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                disabled={isDownloading}
                className={`h-9 w-9 rounded-lg shrink-0 
                    ${
                        isMe
                            ? 'text-white/80 hover:text-white hover:bg-white/10'
                            : 'text-muted-foreground hover:text-foreground hover:bg-black/5'
                    }`}
                title="Скачать файл"
            >
                {isDownloading ? (
                    <Loader2 size={16} className="animate-spin" />
                ) : (
                    <Download size={16} />
                )}
            </Button>
        </div>
    );
}
