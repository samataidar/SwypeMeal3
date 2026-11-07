// Shared reverse-proxy helper for Cloudflare Pages Functions.
//
// Cloudflare Pages `_redirects` cannot proxy to an external domain, so /api
// and /images are handled by Functions instead. The browser still talks only
// to the Pages origin, exactly like it does with vercel.json and netlify.toml.

export async function proxyRequest(request, upstreamBase, stripPrefix = '') {
  const incoming = new URL(request.url);
  let pathname = incoming.pathname;

  if (stripPrefix && pathname.startsWith(stripPrefix)) {
    pathname = pathname.slice(stripPrefix.length) || '/';
  }

  const target = new URL(pathname + incoming.search, upstreamBase);
  const headers = new Headers(request.headers);
  headers.delete('host');

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  try {
    const response = await fetch(target.toString(), init);
    const responseHeaders = new Headers(response.headers);

    // Workers fetch decodes the body; the original encoding/length headers
    // would no longer match. Let the runtime set them.
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    responseHeaders.delete('transfer-encoding');
    responseHeaders.delete('connection');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        detail: 'Upstream request failed',
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 502,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      },
    );
  }
}
