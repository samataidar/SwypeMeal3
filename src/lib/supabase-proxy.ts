/**
 * Supabase Proxy для обхода блокировок
 * Используйте если Supabase заблокирован в вашем регионе
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://bbelyefgpptozjfmeyqq.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Публичные прокси для Supabase (если основной домен заблокирован)
const PROXY_URLS = [
  'https://supabase-cors-proxy.vercel.app',
  'https://supabase-proxy.example.com', // Замените на свой прокси
];

let currentProxyIndex = 0;

export function getSupabaseUrl(): string {
  // В России может быть заблокирован *.supabase.co
  // Используем прокси если основной URL недоступен
  if (import.meta.env.VITE_SUPABASE_PROXY) {
    return import.meta.env.VITE_SUPABASE_PROXY;
  }
  
  return SUPABASE_URL;
}

export function rotateProxy(): string {
  currentProxyIndex = (currentProxyIndex + 1) % PROXY_URLS.length;
  return PROXY_URLS[currentProxyIndex];
}
