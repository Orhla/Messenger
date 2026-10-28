export type BaseMessage = {
    id: string;
    sender_id: string;
    receiver_id: string;
    iv: string;
    created_at: string;
    attachment?: AttachmentMetadata;
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
    text: string;
    createdAt: string;
    attachment?: AttachmentMetadata;
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
    attachment?: AttachmentMetadata;
};

export type Profile = {
    id: string;
    email: string;
};

export type Room = {
    id: string;
    room_name: string;
};

export type AttachmentMetadata = {
    path: string;
    name: string;
    size: number;
    mime: string;
};

export type SystemMessage = {
    id: string;
    type: 'system';
    text: string;
    created_at: string;
};

export type CallState =
    | { status: 'idle' }
    | { status: 'calling'; peerId: string }
    | { status: 'ringing'; peerId: string; offer: RTCSessionDescriptionInit }
    | { status: 'connecting'; peerId: string }
    | { status: 'connected'; peerId: string; startedAt: number };

export type CallSignal =
    | { type: 'offer'; sdp: RTCSessionDescriptionInit; from: string }
    | { type: 'answer'; sdp: RTCSessionDescriptionInit; from: string }
    | { type: 'ice-candidate'; candidate: RTCIceCandidateInit; from: string }
    | { type: 'call-end'; from: string }
    | { type: 'call-reject'; from: string };

export type UseWebRTCOptions = {
    currentUserId: string;
    peerId: string;
    onSystemMessage: (text: string) => void;
};

export type UseWebRTCResult = {
    callState: CallState;
    startCall: () => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: () => void;
    hangUp: () => void;
};
