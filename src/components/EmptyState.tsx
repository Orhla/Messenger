'use client';

type Props = {
    loading?: boolean;
    invalid?: boolean;
    notFound?: boolean;
};

export default function EmptyState({ loading, invalid, notFound }: Props) {
    const config = (loading && {
        text: 'Загрузка чата...',
        className: 'text-muted-foreground animate-pulse',
    }) ||
        (invalid && {
            text: 'Некорректный идентификатор чата.',
            className: 'text-destructive font-medium mb-4',
        }) ||
        (notFound && {
            text: 'Чат не найден или был удален.',
            className: 'text-muted-foreground mb-4',
        }) || {
            text: 'Выберите, кому написать, или войдите в комнату',
            className: 'text-muted-foreground mb-4',
        };

    return (
        <div className="flex flex-1 items-center justify-center">
            <p className={config.className}>{config.text}</p>
        </div>
    );
}
