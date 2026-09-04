import type { MiddlewareHandler } from 'hono';

// Behind nginx the app sees http://host/… while the browser sent Origin
// https://host. Waku's server-action check compares the two and answers 403.
// Trust the proxy's X-Forwarded-Proto and rebuild the request on the right scheme.
export default (): MiddlewareHandler => async (c, next) => {
  const proto = c.req.header('x-forwarded-proto');
  const raw = c.req.raw;
  if (proto === 'https' && raw.url.startsWith('http://')) {
    const url = 'https://' + raw.url.slice('http://'.length);
    const init: RequestInit & { duplex?: 'half' } = {
      method: raw.method,
      headers: raw.headers,
      body: raw.body,
      duplex: 'half',
    };
    c.req.raw = new Request(url, init);
  }
  await next();
};
