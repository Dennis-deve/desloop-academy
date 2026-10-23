// Local inspection server only. Render deploys the static artifact using exact Blueprint rules.
// No private routes, wildcard SPA fallback or API proxy are provided here.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';

const root = resolve('dist/render-public');
const catalog = JSON.parse(await readFile('src/curriculum/public-catalog.json', 'utf8'));
const pages = new Set([
  '/', '/courses', '/how-it-works', '/availability',
  ...catalog.courses.map((course) => `/courses/${course.slug}`),
]);
const individual = new Set([
  '/favicon.png', '/apple-touch-icon.png', '/sw.js',
  '/brand/app-icon.webp', '/brand/brandmark-dark.webp',
  '/brand/wordmark-dark.webp', '/brand/wordmark-light.webp', '/brand/wordmark-mono.webp',
]);
const types = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.html': 'text/html; charset=utf-8',
};
const headers = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  // Local preview omits frame-ancestors so the sandbox's iframe can display it.
  // The actual Render Blueprint sets frame-ancestors 'none' for the public site.
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'self'",
};
export function createPublicServer() {
  return createServer(async (req, res) => {
    let pathname;
    try {
      pathname = new URL(req.url ?? '/', 'http://internal.invalid').pathname;
    } catch {
      res.writeHead(400, headers).end();
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, headers).end();
      return;
    }
    const isPage = pages.has(pathname);
    const file = isPage ? '/index.html' : pathname;
    if (!isPage && !individual.has(file) && !/^\/assets\/[A-Za-z0-9._-]+\.(?:js|css|woff2?)$/.test(file)) {
      res.writeHead(404, headers).end('Page unavailable');
      return;
    }
    const extension = file.slice(file.lastIndexOf('.'));
    try {
      const contents = await readFile(join(root, file));
      res.writeHead(200, {
        ...headers,
        'content-type': types[extension] ?? 'application/octet-stream',
        'content-length': contents.byteLength,
        'cache-control': 'no-store',
      });
      res.end(req.method === 'HEAD' ? undefined : contents);
    } catch {
      res.writeHead(404, headers).end('Page unavailable');
    }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PUBLIC_PREVIEW_PORT ?? '4173');
  createPublicServer().listen(port, '0.0.0.0', () => {
    console.log(`Read-only Desloop guide listening on port ${port}; private routes 404`);
  });
}
