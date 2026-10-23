import { supabase } from '@/supabase';

const BUCKET_NAME = 'attachments';

export async function uploadAttachment(
    path: string,
    blob: Blob,
): Promise<string> {
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, blob, {
            upsert: false,
        });

    if (error) {
        throw new Error(`Ошибка загрузки файла в хранилище`);
    }

    return data.path;
}

export async function downloadAttachment(path: string): Promise<Blob> {
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(path);

    if (error) {
        throw new Error(`Ошибка скачивания файла из хранилища`);
    }

    if (data.size === 0) {
        throw new Error('Файл на сервере пуст или отсутствует.');
    }

    return data;
}
