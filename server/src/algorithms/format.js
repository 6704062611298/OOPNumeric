'use strict';

/**
 * จัดรูปแบบตัวเลขสำหรับ "การแสดงผล" เท่านั้น
 * ค่าภายในการคำนวณยังเป็น double เต็มความแม่นยำเสมอ
 */
function fmt(v, digits = 6) {
  if (v === null || v === undefined || Number.isNaN(v)) return '-';
  if (!Number.isFinite(v)) return v > 0 ? '∞' : '-∞';
  if (v === 0) return (0).toFixed(digits);
  const a = Math.abs(v);
  if (a >= 1e12 || a < 1e-6) return v.toExponential(6);
  return v.toFixed(digits);
}

module.exports = { fmt };
