export type BaseMessage = {
    id: string;
    sender_id: string;
    receiver_id: string;
    iv: string;
    created_at: string;
};

export type EncryptedMessage = BaseMessage & {
    ciphertext: string;
};

export type ChatMessage = BaseMessage & {
    text: string;
    // приходит только из select с join; в realtime-payload его нет
    profiles?: { email: string } | null;
};

export type Message = {
    id: string;
    senderId: string;
    senderLabel: string; // email отправителя, а не UUID
    text: string;
    createdAt: string;
};

export type DbRoomKeyRow = {
    room_id: string;
    member_id: string;
    wrapped_by: string;
    wrapped_key: string;
    iv: string;
};

export type GroupChatMessage = {
    id: string;
    room_id: string;
    sender_id: string;
    senderLabel: string;
    ciphertext: string;
    iv: string;
    created_at: string;
    profiles?: { email: string };
};

export type Profile = {
    id: string;
    email: string;
};

export type Room = {
    id: string;
    room_name: string;
};
