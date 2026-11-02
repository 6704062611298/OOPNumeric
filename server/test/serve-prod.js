'use strict';
/**
 * ทดสอบ production serving แบบจำลอง Nginx (ใช้เมื่อไม่มี Docker บนเครื่อง):
 * - เสิร์ฟ client/dist เป็น static ที่ port 8080
 * - reverse proxy /api → http://localhost:4000 (เหมือน nginx.conf ที่ใช้ใน Docker)
 * นี่เป็นสคริปต์ทดสอบเท่านั้น — ใน Docker จริงใช้ Nginx ตาม client/nginx.conf
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', '..', 'client', 'dist');
const PORT = Number(process.env.PROD_PORT) || 8080;
const API_TARGET = { host: 'localhost', port: 4000 };

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    // reverse proxy ไปยัง backend
    const proxy = http.request(
      { ...API_TARGET, path: req.url, method: req.method, headers: { ...req.headers, host: 'localhost:4000' } },
      (pRes) => {
        res.writeHead(pRes.statusCode, pRes.headers);
        pRes.pipe(res);
      }
    );
    proxy.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'เชื่อมต่อ backend ไม่ได้' }));
    });
    req.pipe(proxy);
    return;
  }

  // static serving พร้อม SPA fallback
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.normalize(path.join(DIST, urlPath));
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // fallback ไป index.html (react-router)
      fs.readFile(path.join(DIST, 'index.html'), (err2, index) => {
        if (err2) {
          res.writeHead(404);
          return res.end('Not found — กรุณา build client ก่อน (npm run build)');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(index);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Production preview ที่ http://localhost:${PORT} (static + /api proxy → :4000)`);
});
