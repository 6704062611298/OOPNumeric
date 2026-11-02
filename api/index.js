'use strict';
/**
 * Vercel Function entry point — export Express app ทั้งตัว
 * Vercel จะ match path เอง (เช่น /api/methods → router ของ Express)
 *
 * หมายเหตุ: บน Vercel filesystem เขียนได้เฉพาะ /tmp เท่านั้น
 * จึงต้องตั้ง DB_PATH ไปที่ /tmp ก่อน require app (ถ้ายังไม่ได้ตั้ง)
 */

if (!process.env.DB_PATH) {
  process.env.DB_PATH = '/tmp/fastnumeric.sqlite';
}

module.exports = require('../server/src/app').app;
