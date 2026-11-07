import { proxyRequest } from '../_lib/proxy.js';

// /images/<unsplash-path> -> https://images.unsplash.com/<unsplash-path>
const UPSTREAM = 'https://images.unsplash.com';

export function onRequest(context) {
  return proxyRequest(context.request, UPSTREAM, '/images');
}
