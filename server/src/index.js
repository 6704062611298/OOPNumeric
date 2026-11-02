'use strict';
/**
 * FastNumeric API Server (Express) — สำหรับรัน local/Docker
 * (บน Vercel จะใช้ api/index.js ที่ root แทน ไม่ผ่านไฟล์นี้)
 */

const { app } = require('./app');

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FastNumeric API server listening on http://0.0.0.0:${PORT}`);
});
