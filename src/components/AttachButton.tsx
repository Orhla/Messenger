import { FileText, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRef } from 'react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

type AttachButtonProps = {
    selectedFile: File | null;
    onFileSelect: (file: File | null) => void;
    disabled?: boolean;
};

export function AttachButton({
    selectedFile,
    onFileSelect,
    disabled = false,
}: AttachButtonProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            alert('Ошибка: Файл слишком большой. Максимальный размер — 10 МБ.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        onFileSelect(file);
    };

    const handleRemoveFile = () => {
        onFileSelect(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="flex flex-col">
            {/* Панель предпросмотра файла над строкой ввода */}
            {selectedFile && (
                <div className="absolute bottom-[73px] left-4 right-4 flex items-center justify-between p-2 bg-muted rounded border text-sm text-muted-foreground animate-in fade-in-50 duration-200 z-10">
                    <div className="flex items-center gap-2 truncate">
                        <FileText size={16} className="text-primary shrink-0" />
                        <span className="truncate font-medium text-foreground">
                            {selectedFile.name}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                            ({(selectedFile.size / 1024 / 1024).toFixed(2)} МБ)
                        </span>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveFile}
                        className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                    >
                        <X size={14} />
                    </Button>
                </div>
            )}

            {/* Скрытый нативный инпут */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                disabled={disabled}
            />

            {/* Кнопка-скрепка */}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="text-muted-foreground hover:text-primary rounded-full shrink-0"
                title="Прикрепить файл"
            >
                <Paperclip size={20} />
            </Button>
        </div>
    );
}
