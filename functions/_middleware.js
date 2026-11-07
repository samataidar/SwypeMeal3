// Cloudflare Pages SPA fallback.
//
// Cloudflare Pages returns 404 for client-side routes like /queue unless a
// `_redirects` rule exists. We avoid `_redirects` here because Netlify reads
// the same file from `dist` before its own `netlify.toml` rules, which would
// shadow the /api proxy. Middleware is Cloudflare-only and keeps both hosts
// working from one build.

export async function onRequest(context) {
  const request = context.request;

  // Only navigation requests can need the SPA shell. API, images and assets
  // are returned as-is (including their real 404s).
  const accept = request.headers.get('accept') || '';
  const isNavigation = request.method === 'GET' && accept.includes('text/html');

  const response = await context.next();
  if (!isNavigation || response.status !== 404) return response;

  const url = new URL(request.url);
  return context.env.ASSETS.fetch(new URL('/', url));
}
