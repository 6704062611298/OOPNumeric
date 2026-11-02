'use strict';
/**
 * หมวด 4: Extrapolation
 * - Linear Extrapolation
 */

const { BaseMethod } = require('./BaseMethod');
const { fmt } = require('./format');

function badRequest(msg) {
  return Object.assign(new Error(msg), { status: 400 });
}

class LinearExtrapolationMethod extends BaseMethod {
  constructor() {
    super({
      key: 'linear-extrapolation',
      category: 'extrapolation',
      name: 'Linear Extrapolation',
      nameTh: 'การประมาณค่านอกช่วงแบบเชิงเส้น',
      fields: [
        { name: 'points', label: 'จุดข้อมูล (x, y)', type: 'points' },
        { name: 'x', label: 'ค่า x ที่ต้องการหา (นอกช่วงข้อมูล)', type: 'number' },
      ],
    });
  }

  solve({ points, x }) {
    const n = points.length;
    const xmin = points[0].x;
    const xmax = points[n - 1].x;
    const inside = x >= xmin && x <= xmax;
    if (inside) {
      throw badRequest(
        `ค่า x = ${fmt(x)} อยู่ในช่วงข้อมูล [${fmt(xmin)}, ${fmt(xmax)}] — เป็นการ Interpolation ไม่ใช่ Extrapolation (ใช้หมวด Interpolation แทน)`
      );
    }

    // เลือก 2 จุดปลายที่ใกล้ด้านที่ x อยู่
    let p0, p1;
    if (x > xmax) {
      // ทายฝั่งขวา: ใช้สองจุดสุดท้าย
      p0 = points[n - 2];
      p1 = points[n - 1];
    } else {
      // ทายฝั่งซ้าย: ใช้สองจุดแรก
      p0 = points[0];
      p1 = points[1];
    }

    const slope = (p1.y - p0.y) / (p1.x - p0.x);
    const y = p1.y + slope * (x - p1.x);

    const steps = [
      {
        title: 'จุดข้อมูลที่ใช้ (เรียงตาม x จากน้อยไปมาก)',
        lines: [points.map((p) => `(${fmt(p.x)}, ${fmt(p.y)})`).join('   ')],
      },
      {
        title: 'ตรวจสอบตำแหน่งของ x',
        lines: [
          `x = ${fmt(x)} อยู่นอกช่วงข้อมูล [${fmt(xmin)}, ${fmt(xmax)}] ${x > xmax ? '(ฝั่งขวา)' : '(ฝั่งซ้าย)'}`,
          `จึงใช้จุด (${fmt(p0.x)}, ${fmt(p0.y)}) และ (${fmt(p1.x)}, ${fmt(p1.y)}) ในการต่อเส้นออกไป`,
        ],
      },
      {
        title: 'สูตร Linear Extrapolation',
        lines: [
          'y = y₁ + m(x − x₁) โดย m = (y₁ − y₀)/(x₁ − x₀)',
          `m = (${fmt(p1.y)} − ${fmt(p0.y)}) / (${fmt(p1.x)} − ${fmt(p0.x)}) = ${fmt(slope)}`,
          `y = ${fmt(p1.y)} + ${fmt(slope)} × (${fmt(x)} − ${fmt(p1.x)})`,
          `y = ${fmt(y)}`,
        ],
      },
    ];

    return {
      answer: `y(${fmt(x)}) ≈ ${fmt(y)}`,
      answerValue: y,
      steps,
      table: {
        columns: ['i', 'xᵢ', 'yᵢ'],
        rows: points.map((p, i) => [String(i), fmt(p.x), fmt(p.y)]),
      },
      meta: { side: x > xmax ? 'right' : 'left' },
    };
  }
}

module.exports = { LinearExtrapolationMethod };
