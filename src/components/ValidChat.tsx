import { useParams } from 'react-router-dom';
import EmptyState from '@/components/EmptyState';

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUUID(value: string) {
    return typeof value === 'string' && UUID_REGEX.test(value);
}

type Props = {
    children: (chatId: string) => React.ReactNode;
};

export default function ValidChat({ children }: Props) {
    const { chatId } = useParams<{ chatId: string }>();

    if (!chatId || !isUUID(chatId)) {
        return (
            <div className="flex flex-1 h-full w-full min-h-0 bg-background">
                <EmptyState invalid={true} />
            </div>
        );
    }

    return <>{children(chatId)}</>;
}
