import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEYS = {
  URL: 'interclasse_supabase_url',
  KEY: 'interclasse_supabase_key',
};

export const getSupabaseCredentials = () => {
  const customUrl = localStorage.getItem(STORAGE_KEYS.URL);
  const customKey = localStorage.getItem(STORAGE_KEYS.KEY);

  const url = customUrl || import.meta.env.VITE_SUPABASE_URL || '';
  const key = customKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  return { url: url.trim(), key: key.trim() };
};

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, key } = getSupabaseCredentials();

  if (!url || !key || !url.startsWith('http')) {
    return null;
  }

  if (cachedClient && cachedUrl === url && cachedKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key);
    cachedUrl = url;
    cachedKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Erro ao inicializar cliente do Supabase:', err);
    return null;
  }
};

export const isSupabaseConfigured = (): boolean => {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key && url.startsWith('http') && key.length > 10);
};

export const saveSupabaseCredentials = (url: string, key: string) => {
  if (url) {
    localStorage.setItem(STORAGE_KEYS.URL, url.trim());
  } else {
    localStorage.removeItem(STORAGE_KEYS.URL);
  }

  if (key) {
    localStorage.setItem(STORAGE_KEYS.KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEYS.KEY);
  }

  cachedClient = null;
  cachedUrl = '';
  cachedKey = '';
};
