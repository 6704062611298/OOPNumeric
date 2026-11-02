/**
 * API client สำหรับติดต่อ Backend
 * - Dev: ใช้ /api ผ่าน Vite dev proxy → http://localhost:4000 (ตั้งใน vite.config.js)
 * - Production (Docker): ใช้ /api ผ่าน Nginx reverse proxy → ไม่ต้อง hardcode host
 * - ถ้าต้องการชี้ตรง ให้ตั้ง VITE_API_URL ใน client/.env
 */
const BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  '/api';

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error(
      'เชื่อมต่อกับเซิร์ฟเวอร์ไม่ได้ — กรุณาตรวจสอบว่า Backend กำลังทำงานอยู่ (npm start ที่โฟลเดอร์ server)'
    );
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // ได้รับ response ที่ไม่ใช่ JSON (เช่น HTML) — เกิดเมื่อเรียกไปผิง URL/ไม่มี backend
      throw new Error(
        `การตอบกลับจากเซิร์ฟเวอร์ไม่ใช่ JSON (HTTP ${res.status}) — อาจเรียกไปที่ URL ผิด หรือ Backend ยังไม่ได้เปิด`
      );
    }
  }

  if (!res.ok) {
    throw new Error((data && data.error) || `เกิดข้อผิดพลาด (HTTP ${res.status})`);
  }
  if (data === null || data === undefined) {
    throw new Error('เซิร์ฟเวอร์ตอบกลับข้อมูลว่าง — กรุณาตรวจสอบว่า Backend ทำงานอยู่');
  }
  return data;
}

export const api = {
  getMethods: () => request('/methods'),
  calculate: (method, input) =>
    request('/calculate', { method: 'POST', body: JSON.stringify({ method, input }) }),
  getHistory: (limit = 50, offset = 0) =>
    request(`/history?limit=${limit}&offset=${offset}`),
  getHistoryDetail: (id) => request(`/history/${id}`),
  deleteHistory: (id) => request(`/history/${id}`, { method: 'DELETE' }),
  getStats: () => request('/stats'),
};
