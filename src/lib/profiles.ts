import { supabase } from '@/supabase';
import type { Profile } from '@/lib/types';

export async function searchProfiles(query: string): Promise<Profile[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', `%${query}%`)
        .limit(10);

    if (error) throw error;
    return data;
}
