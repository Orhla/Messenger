import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  // тут нет юз-сервер. Значит переменные доступны в браузере. Что будем с эти делать?
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
