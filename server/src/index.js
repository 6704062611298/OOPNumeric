'use strict';
/**
 * FastNumeric API Server (Express)
 */

const express = require('express');
const { router } = require('./routes');
const { DB_PATH } = require('./database/db');

const app = express();
const PORT = Number(process.env.PORT) || 4000;

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FastNumeric API server listening on http://0.0.0.0:${PORT}`);
  console.log(`SQLite database: ${DB_PATH}`);
});
