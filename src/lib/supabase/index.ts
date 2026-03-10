import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isConfigured =
  supabaseUrl &&
  supabaseUrl.startsWith('http') &&
  supabaseAnonKey &&
  supabaseAnonKey !== 'placeholder-key';

if (!isConfigured && typeof window !== 'undefined') {
  console.warn(
    '⚠️ Supabase is not configured. The UI will load, but database features (saving/loading) will not work.'
  );
}

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any);

export { createClient as createBrowserClient } from './client';
