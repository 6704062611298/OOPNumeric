'use strict';
/**
 * Validation ฝั่ง Server + helper แปลง/ตรวจ input ของทุกวิธีคำนวณ
 * ทุกค่าที่ผ่าน helper เหล่านี้จะกลายเป็นตัวเลข/โครงสร้างมาตรฐานก่อนเข้าอัลกอริทึมเสมอ
 */

const { compile, ExprError } = require('../expression/parser');

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

/** แปลงเป็น float พร้อมตรวจค่า min/max/default */
function asFloat(value, label, opts = {}) {
  if (value === undefined || value === null || value === '') {
    if (opts.default !== undefined) return opts.default;
    throw new ValidationError(`กรุณากรอกค่า "${label}"`);
  }
  const v = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(v)) {
    throw new ValidationError(`ค่า "${label}" ต้องเป็นตัวเลข (ได้รับ: "${value}")`);
  }
  if (opts.min !== undefined && v < opts.min) {
    throw new ValidationError(`ค่า "${label}" ต้องมีค่าไม่น้อยกว่า ${opts.min}`);
  }
  if (opts.max !== undefined && v > opts.max) {
    throw new ValidationError(`ค่า "${label}" ต้องมีค่าไม่เกิน ${opts.max}`);
  }
  return v;
}

/** แปลงเป็นจำนวนเต็ม พร้อมตรวจค่า min/max/default */
function asInt(value, label, opts = {}) {
  if (value === undefined || value === null || value === '') {
    if (opts.default !== undefined) return opts.default;
    throw new ValidationError(`กรุณากรอกค่า "${label}"`);
  }
  const v = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(v)) {
    throw new ValidationError(`ค่า "${label}" ต้องเป็นจำนวนเต็ม (ได้รับ: "${value}")`);
  }
  if (opts.min !== undefined && v < opts.min) {
    throw new ValidationError(`ค่า "${label}" ต้องมีค่าไม่น้อยกว่า ${opts.min}`);
  }
  if (opts.max !== undefined && v > opts.max) {
    throw new ValidationError(`ค่า "${label}" ต้องมีค่าไม่เกิน ${opts.max}`);
  }
  return v;
}

/** ตรวจ array จุดข้อมูล [{x,y}] → เรียงตาม x จากน้อยไปมาก */
function asPoints(points, label = 'จุดข้อมูล') {
  if (!Array.isArray(points) || points.length < 2) {
    throw new ValidationError(`${label}: ต้องมีอย่างน้อย 2 จุด`);
  }
  if (points.length > 50) {
    throw new ValidationError(`${label}: จุดข้อมูลเกินขอบเขต (สูงสุด 50 จุด)`);
  }
  const seen = new Set();
  const result = points.map((p, i) => {
    if (!p || typeof p !== 'object') {
      throw new ValidationError(`${label}: จุดที่ ${i + 1} ไม่ถูกต้อง`);
    }
    const x = typeof p.x === 'number' ? p.x : Number(String(p.x ?? '').trim());
    const y = typeof p.y === 'number' ? p.y : Number(String(p.y ?? '').trim());
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new ValidationError(`${label}: จุดที่ ${i + 1} ต้องกรอก x และ y เป็นตัวเลข`);
    }
    if (seen.has(x)) {
      throw new ValidationError(`${label}: มีค่า x = ${x} ซ้ำกัน (ค่า x ของแต่ละจุดต้องไม่ซ้ำ)`);
    }
    seen.add(x);
    return { x, y };
  });
  result.sort((p, q) => p.x - q.x);
  return result;
}

/** ตรวจเมทริกซ์ {n, a (n×n), b (n)} สำหรับระบบสมการเชิงเส้น (รับ key "a" หรือ "A" ทั้งคู่) */
function asMatrix(m, label = 'เมทริกซ์') {
  if (!m || typeof m !== 'object' || !Array.isArray(m.b)) {
    throw new ValidationError(`${label}: รูปแบบข้อมูลเมทริกซ์ไม่ถูกต้อง`);
  }
  const rawA = Array.isArray(m.a) ? m.a : m.A;
  if (!Array.isArray(rawA)) {
    throw new ValidationError(`${label}: รูปแบบข้อมูลเมทริกซ์ไม่ถูกต้อง`);
  }
  const n = typeof m.n === 'number' ? m.n : Number(String(m.n ?? '').trim());
  if (!Number.isInteger(n) || n < 1 || n > 10) {
    throw new ValidationError(`${label}: ขนาดเมทริกซ์ n ต้องเป็นจำนวนเต็ม 1–10`);
  }
  if (rawA.length !== n || m.b.length !== n) {
    throw new ValidationError(`${label}: จำนวนแถวของ A และ b ต้องเท่ากับ n = ${n}`);
  }
  const A = rawA.map((row, i) => {
    if (!Array.isArray(row) || row.length !== n) {
      throw new ValidationError(`${label}: แถวที่ ${i + 1} ของเมทริกซ์ A ต้องมี ${n} ค่า`);
    }
    return row.map((v) => {
      const num = typeof v === 'number' ? v : Number(String(v ?? '').trim());
      if (!Number.isFinite(num)) {
        throw new ValidationError(`${label}: แถวที่ ${i + 1} มีค่าที่ไม่ใช่ตัวเลข`);
      }
      return num;
    });
  });
  const b = m.b.map((v) => {
    const num = typeof v === 'number' ? v : Number(String(v ?? '').trim());
    if (!Number.isFinite(num)) {
      throw new ValidationError(`${label}: เวกเตอร์ b มีค่าที่ไม่ใช่ตัวเลข`);
    }
    return num;
  });
  return { n, A, b };
}

/** คอมไพล์สมการ f(x) เป็นฟังก์ชัน พร้อมแปลง error เป็นข้อความภาษาไทย */
function asExpression(value, label = 'f(x)') {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new ValidationError(`กรุณากรอกสมการ "${label}"`);
  }
  if (typeof value !== 'string') {
    throw new ValidationError(`${label}: ต้องเป็นข้อความ`);
  }
  try {
    return compile(value);
  } catch (e) {
    if (e instanceof ExprError) {
      throw new ValidationError(`${label}: ${e.message}`);
    }
    throw e;
  }
}

module.exports = {
  ValidationError,
  asFloat,
  asInt,
  asPoints,
  asMatrix,
  asExpression,
};
