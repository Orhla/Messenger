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
};

export type GroupChatMessage = {
    id: string;
    sender_id: string;
    room_id: string;
    text: string;
    created_at: string;
    profiles: {
        email: string;
    };
};

export type Profile = {
    id: string;
    email: string;
};

export type Room = {
    id: string;
    room_name: string;
};

export type ActiveChat =
    | { kind: 'direct'; correspondent: Profile }
    | { kind: 'room'; room: Room }
    | null;
