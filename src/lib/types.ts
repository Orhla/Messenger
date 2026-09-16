export type ChatMessage = {
    id: string;
    text: string;
    sender_id: string;
    receiver_id: string;
    created_at: string;
};

export type Profile = {
    id: string;
    email: string;
};
