export type ChatMessage = {
    id: string;
    ciphertext: string;
    sender_id: string;
    receiver_id: string;
    iv: string;
    created_at: string;
};

export type Profile = {
    id: string;
    email: string;
};
