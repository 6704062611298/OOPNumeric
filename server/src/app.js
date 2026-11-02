'use strict';
/**
 * FastNumeric API — สร้างและ export Express app (แยกจาก listen)
 * - Local/Docker: server/src/index.js require ไฟล์นี้แล้ว app.listen()
 * - Vercel: api/index.js (ที่ root) require ไฟล์นี้ export ให้ Vercel Function
 */

const express = require('express');
const { router } = require('./routes');
const { DB_PATH } = require('./database/db');

const app = express();

app.use(express.json({ limit: '256kb' }));

// ลำดับ middleware สำคัญ: CORS ก่อน routes
app.use((req, res, next) => {
  const allowed = (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim());
  const origin = req.headers.origin;
  if (allowed.includes('*') || (origin && allowed.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ข้อความที่ path / — บอกว่านี่คือ API server (frontend อยู่ที่อื่น)
app.get('/', (_req, res) => {
  res.json({
    ok: true,
    name: 'FastNumeric API',
    endpoints: ['/api/methods', '/api/calculate', '/api/history', '/api/stats', '/api/health'],
  });
});

app.use('/api', router);

// Health check สำหรับ Docker
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// 404 สำหรับ path ที่ไม่มี
app.use((req, res) => {
  res.status(404).json({ error: `ไม่พบ endpoint: ${req.method} ${req.path}` });
});

// Error handler กลาง
app.use((err, req, res, _next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'รูปแบบ JSON ไม่ถูกต้อง' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'ข้อมูลส่งมาใหญ่เกินไป' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
});

module.exports = { app, DB_PATH };
