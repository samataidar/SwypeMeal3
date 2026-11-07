import { proxyRequest } from '../_lib/proxy.js';

// Same destination as vercel.json / netlify.toml.
const BACKEND = 'https://swypemeal.onrender.com';

export function onRequest(context) {
  return proxyRequest(context.request, BACKEND);
}
