import { decryptBytes, decryptText } from '@/lib/crypto';
import type { AttachmentMetadata } from '@/lib/types';
import { downloadAttachment } from '@/lib/supabase/attachments';
import { supabase } from '@/supabase';
import { getOrCreateChatKey } from '@/lib/chatKeyManager';
import { getRoomKey } from '@/lib/roomKeyManager';

export async function decryptMessageText(
    ciphertext: string,
    iv: string,
    aesKey: CryptoKey,
): Promise<string> {
    try {
        const { plainText } = await decryptText(aesKey, ciphertext, iv);
        return plainText;
    } catch {
        console.error(`Ошибка дешифрования сообщения`);
        return 'Ошибка дешифрования сообщения';
    }
}

export async function downloadAndDecryptFile(
    attachment: AttachmentMetadata,
    messageIv: string,
    chatKey: CryptoKey,
): Promise<Blob> {
    // try {
        const encryptedBlob = await downloadAttachment(attachment.path);

        const encryptedBase64Text = await encryptedBlob.text();

        const { bytes: decryptedBuffer } = await decryptBytes(
            chatKey,
            encryptedBase64Text,
            messageIv,
        );

        return new Blob([decryptedBuffer], { type: attachment.mime });
    // } catch {
    //     throw new Error(
    //         'Не удалось расшифровать файл. Возможно, у вас нет доступа (неверный ключ шифрования) или файл был поврежден.',
    //     );
    // }
}

export async function downloadMessageFile(
    messageId: string,
    chatType: 'direct' | 'room',
    currentUserId: string,
): Promise<Blob> {
    const tableName = chatType === 'direct' ? 'messages' : 'room_messages';

    const { data: msg, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', messageId)
        .single();

    if (error || !msg) {
        throw new Error('Сообщение или файл не найдены в базе данных');
    }

    const attachment = {
        path: msg.attachment_path,
        name: msg.attachment_name,
        size: msg.attachment_size,
        mime: msg.attachment_mime,
    };

    if (!attachment.path || !msg.iv) {
        throw new Error('Данное сообщение не содержит зашифрованного файла');
    }

    let chatKey: CryptoKey;
    if (chatType === 'direct') {
        const correspondentId =
            msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
        chatKey = await getOrCreateChatKey(correspondentId);
    } else {
        chatKey = await getRoomKey(msg.room_id, currentUserId);
    }

    return await downloadAndDecryptFile(attachment, msg.iv, chatKey);
}
