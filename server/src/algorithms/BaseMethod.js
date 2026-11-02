'use strict';

/**
 * Base class ของทุกวิธีคำนวณ (Abstraction)
 *
 * - meta คือข้อมูลประกอบของวิธีคำนวณ ใช้สร้างฟอร์มใน UI อัตโนมัติ:
 *     { key, category, name, nameTh, fields: [{ name, label, type, ... }] }
 * - type ของ field ที่รองรับ: expression | number | int | points | matrix
 * - solve(input) ให้ subclass ไป implement (Polymorphism)
 *
 * ผลลัพธ์ที่ solve() ต้องคืน:
 *     {
 *       answer: string,              // คำตอบสุดท้าย
 *       answerValue: number | null,  // ค่าตัวเลขของคำตอบ (ถ้ามี)
 *       steps: [{ title, lines?: string[], table?: { columns, rows } }],
 *       table: { columns, rows } | null,  // ตารางหลัก (iteration / ค่าที่ใช้คำนวณ)
 *       meta: object                        // ข้อมูลเพิ่มเติม เช่น จำนวนรอบ
 *     }
 *
 * การเพิ่มวิธีคำนวณใหม่: สร้าง class extends BaseMethod แล้ว register ใน registry.js
 */
class BaseMethod {
  constructor(meta) {
    if (!meta || !meta.key || !meta.category || !meta.name) {
      throw new Error('method meta ต้องมี key, category และ name');
    }
    this.meta = meta;
  }

  /** @abstract */
  solve(_input) {
    throw new Error(`วิธี '${this.meta.key}' ยังไม่ได้ implement เมธอด solve()`);
  }
}

module.exports = { BaseMethod };
