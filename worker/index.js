import { proxyRequest } from '../functions/_lib/proxy.js';

// Optional Cloudflare Workers deployment (including `wrangler deploy
// --temporary`, which needs no account). Static files come from ./dist via the
// ASSETS binding; API and images are proxied exactly like on Pages/Netlify.
const BACKEND = 'https://swypemeal.onrender.com';
const UNSPLASH = 'https://images.unsplash.com';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return proxyRequest(request, BACKEND);
    }

    if (url.pathname.startsWith('/images/')) {
      return proxyRequest(request, UNSPLASH, '/images');
    }

    return env.ASSETS.fetch(request);
  },
};
