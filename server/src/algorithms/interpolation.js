'use strict';
/**
 * หมวด 3: Interpolation
 * - Linear Interpolation
 * - Lagrange Interpolation
 */

const { BaseMethod } = require('./BaseMethod');
const { fmt } = require('./format');

function badRequest(msg) {
  return Object.assign(new Error(msg), { status: 400 });
}

// ---------------------------------------------------------------------------
// Linear Interpolation
// ---------------------------------------------------------------------------
class LinearInterpolationMethod extends BaseMethod {
  constructor() {
    super({
      key: 'linear-interpolation',
      category: 'interpolation',
      name: 'Linear Interpolation',
      nameTh: 'การประมาณค่าแบบเชิงเส้น',
      fields: [
        { name: 'points', label: 'จุดข้อมูล (x, y)', type: 'points' },
        { name: 'x', label: 'ค่า x ที่ต้องการหา', type: 'number' },
      ],
    });
  }

  solve({ points, x }) {
    // validation แยกประเด็น x ซ้ำไว้ที่ asPoints แล้ว
    if (points.length < 2) throw badRequest('การประมาณค่าเชิงเส้นต้องมีจุดข้อมูลอย่างน้อย 2 จุด');

    // หาช่วง [x0, x1] ที่ x อยู่ระหว่าง (ต้อง interpolation ไม่ใช่ extrapolation)
    let idx = -1;
    for (let i = 0; i < points.length - 1; i++) {
      if (x >= points[i].x && x <= points[i + 1].x) {
        idx = i;
        break;
      }
    }
    if (idx === -1) {
      throw badRequest(
        `ค่า x = ${fmt(x)} อยู่นอกช่วงข้อมูล [${fmt(points[0].x)}, ${fmt(points[points.length - 1].x)}] — เป็นการ Extrapolation ซึ่ง Linear Interpolation ไม่รองรับ (กรุณาใช้หมวด Extrapolation หรือเลือก x ในช่วง)`
      );
    }

    const p0 = points[idx];
    const p1 = points[idx + 1];
    const y = p0.y + (p1.y - p0.y) * (x - p0.x) / (p1.x - p0.x);

    const steps = [
      {
        title: 'จุดข้อมูลที่ใช้ (ข้อมูลถูกเรียงตาม x จากน้อยไปมาก)',
        lines: points.map((p) => `(${fmt(p.x)}, ${fmt(p.y)})`).join('   '),
      },
      {
        title: 'เลือกช่วงที่ x อยู่',
        lines: [
          `x = ${fmt(x)} อยู่ระหว่าง x₀ = ${fmt(p0.x)} และ x₁ = ${fmt(p1.x)}`,
          `ดังนั้นใช้จุด (${fmt(p0.x)}, ${fmt(p0.y)}) และ (${fmt(p1.x)}, ${fmt(p1.y)})`,
        ],
      },
      {
        title: 'สูตร Linear Interpolation',
        lines: [
          'y = y₀ + (y₁ − y₀)(x − x₀) / (x₁ − x₀)',
          `y = ${fmt(p0.y)} + (${fmt(p1.y)} − ${fmt(p0.y)})(${fmt(x)} − ${fmt(p0.x)}) / (${fmt(p1.x)} − ${fmt(p0.x)})`,
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
      meta: { usedPoints: [p0, p1] },
    };
  }
}

// ---------------------------------------------------------------------------
// Lagrange Interpolation (รองรับ n จุด → พอลิโนเมียลดีกรี n−1)
// ---------------------------------------------------------------------------
class LagrangeInterpolationMethod extends BaseMethod {
  constructor() {
    super({
      key: 'lagrange-interpolation',
      category: 'interpolation',
      name: 'Lagrange Interpolation',
      nameTh: 'การประมาณค่าแบบลากรองจ์',
      fields: [
        { name: 'points', label: 'จุดข้อมูล (x, y)', type: 'points' },
        { name: 'x', label: 'ค่า x ที่ต้องการหา', type: 'number' },
      ],
    });
  }

  solve({ points, x }) {
    const n = points.length;
    // Lagrange อนุญาตให้ x อยู่นอกช่วงได้ (มันคือ polynomial ที่ลากผ่านทุกจุด)
    // แต่แจ้งเตือนใน steps หากเป็นการ extrapolate
    const outside = x < points[0].x || x > points[n - 1].x;

    let result = 0;
    const termLines = [];
    for (let i = 0; i < n; i++) {
      let num = 1;
      let den = 1;
      for (let j = 0; j < n; j++) {
        if (j !== i) {
          num *= x - points[j].x;
          den *= points[i].x - points[j].x;
        }
      }
      const Li = num / den;
      const term = Li * points[i].y;
      result += term;
      termLines.push(
        `L${i}(x) · y${i} = [${this._prodStr(x, points, i)}] / [${this._prodStr(null, points, i)}] × ${fmt(points[i].y)} = ${fmt(Li)} × ${fmt(points[i].y)} = ${fmt(term)}`
      );
    }

    const steps = [
      {
        title: 'จุดข้อมูลที่ใช้ (เรียงตาม x จากน้อยไปมาก)',
        lines: [points.map((p) => `(${fmt(p.x)}, ${fmt(p.y)})`).join('   ')],
      },
      {
        title: 'สูตร Lagrange Interpolation',
        lines: [
          `P(x) = Σ [ yᵢ · Lᵢ(x) ] โดย Lᵢ(x) = Π (x − xⱼ)/(xᵢ − xⱼ), j ≠ i  (${n} จุด → พอลิโนเมียลดีกรี ${n - 1})`,
          ...(outside
            ? [`⚠ หมายเหตุ: x = ${fmt(x)} อยู่นอกช่วงข้อมูล ผลลัพธ์นี้จึงเป็นการ Extrapolation`]
            : []),
        ],
      },
      {
        title: 'คำนวณแต่ละพจน์',
        lines: termLines,
      },
      {
        title: 'รวมค่า',
        lines: [`P(${fmt(x)}) = ${termLines.length} พจน์รวมกัน = ${fmt(result)}`],
      },
    ];

    return {
      answer: `P(${fmt(x)}) ≈ ${fmt(result)}`,
      answerValue: result,
      steps,
      table: {
        columns: ['i', 'xᵢ', 'yᵢ'],
        rows: points.map((p, i) => [String(i), fmt(p.x), fmt(p.y)]),
      },
      meta: { outside },
    };
  }

  _prodStr(x, points, i) {
    const parts = [];
    for (let j = 0; j < points.length; j++) {
      if (j !== i) {
        parts.push(`(${x === null ? '' : fmt(x) + ' − '}${fmt(points[j].x)})`);
      }
    }
    return parts.join('');
  }
}

module.exports = { LinearInterpolationMethod, LagrangeInterpolationMethod };
