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

export type ChatMessage = BaseMessage &  {
    text: string;
};

export type Profile = {
    id: string;
    email: string;
};
