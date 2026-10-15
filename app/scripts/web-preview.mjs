import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.ttf': 'font/ttf' };
/** Local export harness only; the actual hosting service needs equivalent SPA rewrites. */
export function createWebPreview(directory) {
  const root = resolve(directory);
  return createServer(async (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    let path;
    try { path = decodeURIComponent((req.url ?? '/').split('?')[0]); } catch { res.writeHead(400); res.end(); return; }
    if (path.includes('\0') || path.includes('\\') || path.split('/').includes('..')) { res.writeHead(400); res.end(); return; }
    let file = resolve(root, `.${path}`);
    if (file !== root && !file.startsWith(`${root}${sep}`)) { res.writeHead(400); res.end(); return; }
    if (path === '/') file = resolve(root, 'index.html');
    try {
      let bytes;
      try { bytes = await readFile(file); } catch {
        if (extname(path)) { res.writeHead(404); res.end(); return; }
        file = resolve(root, 'index.html'); bytes = await readFile(file);
      }
      res.writeHead(200, { 'Content-Type': `${types[extname(file)] ?? 'application/octet-stream'}`, 'Content-Length': bytes.length, 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch { res.writeHead(500); res.end(); }
  });
}
