'use strict';
/**
 * หมวด 6: Differentiation
 * - Forward Difference
 * - Backward Difference
 * - Central Difference
 * ทำงานบนจุดข้อมูลตาราง (x, y) ตามรูปแบบวิชา Numerical Methods
 */

const { BaseMethod } = require('./BaseMethod');
const { fmt } = require('./format');

function badRequest(msg) {
  return Object.assign(new Error(msg), { status: 400 });
}

/** ฐานร่วมของทั้งสามวิธี: หาตำแหน่ง i ที่ x ตรงกับจุดในตาราง */
function locatePoint(points, x) {
  const TOL = 1e-9;
  for (let i = 0; i < points.length; i++) {
    if (Math.abs(points[i].x - x) <= TOL) return i;
  }
  return -1;
}

class DifferenceMethod extends BaseMethod {
  /**
   * @param {'forward'|'backward'|'central'} kind
   */
  constructor(kind) {
    const metaByKind = {
      forward: {
        key: 'forward-difference',
        name: 'Forward Difference',
        nameTh: 'อนุพันธ์ forward difference',
        desc: 'ใช้จุดปัจจุบันกับจุดถัดไป',
      },
      backward: {
        key: 'backward-difference',
        name: 'Backward Difference',
        nameTh: 'อนุพันธ์ backward difference',
        desc: 'ใช้จุดปัจจุบันกับจุดก่อนหน้า',
      },
      central: {
        key: 'central-difference',
        name: 'Central Difference',
        nameTh: 'อนุพันธ์ central difference',
        desc: 'ใช้จุดก่อนหน้ากับจุดถัดไป (แม่นยำที่สุด O(h²))',
      },
    };
    const m = metaByKind[kind];
    super({
      key: m.key,
      category: 'differentiation',
      name: m.name,
      nameTh: m.nameTh,
      fields: [
        { name: 'points', label: 'จุดข้อมูล (x, y)', type: 'points' },
        { name: 'x', label: 'ค่า x ที่ต้องการหาอนุพันธ์', type: 'number' },
      ],
    });
    this.kind = kind;
  }

  solve({ points, x }) {
    const n = points.length;
    const i = locatePoint(points, x);
    if (i === -1) {
      throw badRequest(
        `ค่า x = ${fmt(x)} ไม่ตรงกับจุดข้อมูลใดในตาราง (จุดที่มี: ${points.map((p) => fmt(p.x)).join(', ')})`
      );
    }

    let p0;
    let p1;
    let formula;
    let substitution;

    if (this.kind === 'forward') {
      if (i === n - 1) {
        throw badRequest(
          `x = ${fmt(x)} เป็นจุดสุดท้ายของตาราง — Forward Difference ต้องใช้จุดถัดไปซึ่งไม่มี (ลองใช้ Backward Difference)`
        );
      }
      p0 = points[i];
      p1 = points[i + 1];
      formula = "f'(x) ≈ (f(xᵢ₊₁) − f(xᵢ)) / (xᵢ₊₁ − xᵢ)";
      substitution = `f'(${fmt(x)}) ≈ (${fmt(p1.y)} − ${fmt(p0.y)}) / (${fmt(p1.x)} − ${fmt(p0.x)})`;
    } else if (this.kind === 'backward') {
      if (i === 0) {
        throw badRequest(
          `x = ${fmt(x)} เป็นจุดแรกของตาราง — Backward Difference ต้องใช้จุดก่อนหน้าซึ่งไม่มี (ลองใช้ Forward Difference)`
        );
      }
      p0 = points[i - 1];
      p1 = points[i];
      formula = "f'(x) ≈ (f(xᵢ) − f(xᵢ₋₁)) / (xᵢ − xᵢ₋₁)";
      substitution = `f'(${fmt(x)}) ≈ (${fmt(p1.y)} − ${fmt(p0.y)}) / (${fmt(p1.x)} − ${fmt(p0.x)})`;
    } else {
      if (i === 0 || i === n - 1) {
        throw badRequest(
          `x = ${fmt(x)} เป็นจุดปลายของตาราง — Central Difference ต้องใช้ทั้งจุดก่อนหน้าและจุดถัดไปซึ่งไม่ครบ (ลองใช้ Forward หรือ Backward Difference)`
        );
      }
      p0 = points[i - 1];
      p1 = points[i + 1];
      formula = "f'(x) ≈ (f(xᵢ₊₁) − f(xᵢ₋₁)) / (xᵢ₊₁ − xᵢ₋₁)";
      substitution = `f'(${fmt(x)}) ≈ (${fmt(p1.y)} − ${fmt(p0.y)}) / (${fmt(p1.x)} − ${fmt(p0.x)})`;
    }

    const h = p1.x - p0.x;
    if (h === 0) throw badRequest('ระยะห่างระหว่างจุดเป็นศูนย์ (หารด้วยศูนย์)');
    const deriv = (p1.y - p0.y) / h;

    const steps = [
      {
        title: 'จุดข้อมูล (เรียงตาม x จากน้อยไปมาก)',
        lines: [points.map((p) => `(${fmt(p.x)}, ${fmt(p.y)})`).join('   ')],
      },
      {
        title: 'ตำแหน่งของ x และจุดที่ใช้คำนวณ',
        lines: [
          `x = ${fmt(x)} คือจุดลำดับที่ ${i} ในตาราง`,
          `ใช้จุด (${fmt(p0.x)}, ${fmt(p0.y)}) และ (${fmt(p1.x)}, ${fmt(p1.y)})`,
        ],
      },
      {
        title: 'สูตรและการแทนค่า',
        lines: [formula, substitution, `f'(${fmt(x)}) ≈ ${fmt(deriv)}`],
      },
    ];

    return {
      answer: `f'(${fmt(x)}) ≈ ${fmt(deriv)}`,
      answerValue: deriv,
      steps,
      table: {
        columns: ['i', 'xᵢ', 'yᵢ = f(xᵢ)'],
        rows: points.map((p, idx) => [String(idx), fmt(p.x), fmt(p.y)]),
      },
      meta: { usedIndex: i, kind: this.kind },
    };
  }
}

module.exports = { DifferenceMethod };
