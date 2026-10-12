import { useParams } from 'react-router-dom';
import RoomChat from '@/components/RoomChat.tsx';

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUUID(value: string) {
    return typeof value === 'string' && UUID_REGEX.test(value);
}


export default function ValidChat(){
    const { chatId } = useParams<{ chatId: string }>();
    if (!chatId || !isUUID(chatId)) {
        return <p>Invalid chat ID</p>;
    }
    return <RoomChat chatId={chatId} />;
}
