'use strict';
/**
 * หมวด 5: Integration
 * - Trapezoidal Rule
 * - Simpson's 1/3 Rule
 */

const { BaseMethod } = require('./BaseMethod');
const { fmt } = require('./format');

function badRequest(msg) {
  return Object.assign(new Error(msg), { status: 400 });
}

/** สร้างขั้นตอนร่วม: แบ่งช่วง + ตารางค่า f(xi) */
function buildCommonSteps(fx, a, b, n, h) {
  const xs = [];
  for (let i = 0; i <= n; i++) xs.push(a + i * h);
  const fxRows = xs.map((xi, i) => {
    const v = fx(xi);
    if (!Number.isFinite(v)) {
      throw badRequest(`ไม่สามารถคำนวณ f(${fmt(xi)}) ได้ (ค่าไม่นิยามในช่วงการ積分)`);
    }
    return [String(i), fmt(xi), fmt(v)];
  });
  const steps = [
    {
      title: 'ค่าที่ใช้คำนวณ',
      lines: [
        `ขอบเขต: a = ${fmt(a)}, b = ${fmt(b)}`,
        `จำนวนช่วงย่อย n = ${n}`,
        `ความกว้างแต่ละช่วง h = (b − a)/n = (${fmt(b)} − ${fmt(a)})/${n} = ${fmt(h)}`,
      ],
    },
    {
      title: 'ค่า f(xᵢ) ที่จุดต่าง ๆ',
      table: { columns: ['i', 'xᵢ', 'f(xᵢ)'], rows: fxRows },
    },
  ];
  return { xs, steps };
}

// ---------------------------------------------------------------------------
// Trapezoidal Rule
// ---------------------------------------------------------------------------
class TrapezoidalRuleMethod extends BaseMethod {
  constructor() {
    super({
      key: 'trapezoidal',
      category: 'integration',
      name: 'Trapezoidal Rule',
      nameTh: 'กฎสี่เหลี่ยมคางหมู',
      fields: [
        { name: 'fx', label: 'f(x)', type: 'expression', placeholder: 'เช่น sqrt(x) หรือ 1/x' },
        { name: 'a', label: 'a (ขอบล่าง)', type: 'number' },
        { name: 'b', label: 'b (ขอบบน)', type: 'number' },
        { name: 'n', label: 'n (จำนวนช่วงย่อย)', type: 'int', default: 4, min: 1, max: 1000 },
      ],
    });
  }

  solve({ fx, a, b, n }) {
    if (a === b) throw badRequest('ขอบล่าง a และขอบบน b ต้องไม่เท่ากัน');
    let lo = a;
    let hi = b;
    let sign = 1;
    if (a > b) {
      // รองรับการกลับขอบเขต: ∫a..b = −∫b..a
      lo = b;
      hi = a;
      sign = -1;
    }
    const h = (hi - lo) / n;
    const { xs, steps } = buildCommonSteps(fx, lo, hi, n, h);

    // I = h/2 [f(x0) + 2f(x1) + ... + 2f(x_{n-1}) + f(xn)]
    const fs = xs.map((xi) => fx(xi));
    let sum = fs[0] + fs[n];
    const termLines = [`f(x₀) = ${fmt(fs[0])}`, `f(x${n}) = ${fmt(fs[n])}`];
    const midTerms = [];
    for (let i = 1; i < n; i++) {
      sum += 2 * fs[i];
      midTerms.push(`2·f(x${i}) = 2 × ${fmt(fs[i])} = ${fmt(2 * fs[i])}`);
    }
    if (midTerms.length) termLines.push(...midTerms);
    const I = sign * (h / 2) * sum;

    steps.push({
      title: 'สูตร Trapezoidal Rule',
      lines: [
        'I = (h/2) [ f(x₀) + 2·Σf(xᵢ) + f(xₙ) ],  i = 1..n−1',
        `ผลรวมในวงเล็บ = ${fmt(sum)}`,
        `I = (${fmt(h)}/2) × ${fmt(sum)}${sign < 0 ? ' × (−1) [ขอบเขตกลับด้าน]' : ''}`,
        `I = ${fmt(I)}`,
      ],
    });
    steps.push({ title: 'พจน์ที่ใช้รวม', lines: termLines });

    return {
      answer: `∫ จาก ${fmt(a)} ถึง ${fmt(b)} f(x) dx ≈ ${fmt(I)}`,
      answerValue: I,
      steps,
      table: { columns: ['i', 'xᵢ', 'f(xᵢ)'], rows: xs.map((xi, i) => [String(i), fmt(xi), fmt(fx(xi))]) },
      meta: { h, n },
    };
  }
}

// ---------------------------------------------------------------------------
// Simpson's 1/3 Rule
// ---------------------------------------------------------------------------
class SimpsonsOneThirdRuleMethod extends BaseMethod {
  constructor() {
    super({
      key: 'simpson-1-3',
      category: 'integration',
      name: "Simpson's 1/3 Rule",
      nameTh: 'กฎซิมป์สัน 1/3',
      fields: [
        { name: 'fx', label: 'f(x)', type: 'expression', placeholder: 'เช่น exp(-x^2)' },
        { name: 'a', label: 'a (ขอบล่าง)', type: 'number' },
        { name: 'b', label: 'b (ขอบบน)', type: 'number' },
        { name: 'n', label: 'n (จำนวนช่วงย่อย — ต้องเป็นจำนวนคู่)', type: 'int', default: 4, min: 2, max: 1000 },
      ],
    });
  }

  solve({ fx, a, b, n }) {
    if (n % 2 !== 0) {
      throw badRequest(`Simpson's 1/3 Rule ต้องใช้จำนวนช่วงย่อย n เป็นจำนวนคู่ (ได้รับ n = ${n}) — กรุณากรอกค่าคู่เช่น 4, 6, 8`);
    }
    if (a === b) throw badRequest('ขอบล่าง a และขอบบน b ต้องไม่เท่ากัน');
    let lo = a;
    let hi = b;
    let sign = 1;
    if (a > b) {
      lo = b;
      hi = a;
      sign = -1;
    }
    const h = (hi - lo) / n;
    const { xs, steps } = buildCommonSteps(fx, lo, hi, n, h);
    const fs = xs.map((xi) => fx(xi));

    // I = h/3 [f(x0) + 4f(x1) + 2f(x2) + ... + 4f(x_{n-1}) + f(xn)]
    let sum = fs[0] + fs[n];
    const oddTerms = [];
    const evenTerms = [];
    for (let i = 1; i < n; i++) {
      if (i % 2 === 1) {
        sum += 4 * fs[i];
        oddTerms.push(`4·f(x${i}) = 4 × ${fmt(fs[i])} = ${fmt(4 * fs[i])}`);
      } else {
        sum += 2 * fs[i];
        evenTerms.push(`2·f(x${i}) = 2 × ${fmt(fs[i])} = ${fmt(2 * fs[i])}`);
      }
    }
    const I = sign * (h / 3) * sum;

    steps.push({
      title: "สูตร Simpson's 1/3 Rule",
      lines: [
        'I = (h/3) [ f(x₀) + 4·Σf(xₒᵈᵈ) + 2·Σf(xₑᵥₑₙ) + f(xₙ) ]',
        `พจน์คี่ (คูณ 4): ${oddTerms.length} พจน์, พจน์คู่ (คูณ 2): ${evenTerms.length} พจน์`,
        `ผลรวมในวงเล็บ = ${fmt(sum)}`,
        `I = (${fmt(h)}/3) × ${fmt(sum)}${sign < 0 ? ' × (−1) [ขอบเขตกลับด้าน]' : ''}`,
        `I = ${fmt(I)}`,
      ],
    });
    steps.push({
      title: 'พจน์ที่ใช้รวม',
      lines: [`f(x₀) = ${fmt(fs[0])}`, `f(xₙ) = ${fmt(fs[n])}`, ...oddTerms, ...evenTerms],
    });

    return {
      answer: `∫ จาก ${fmt(a)} ถึง ${fmt(b)} f(x) dx ≈ ${fmt(I)}`,
      answerValue: I,
      steps,
      table: { columns: ['i', 'xᵢ', 'f(xᵢ)'], rows: xs.map((xi, i) => [String(i), fmt(xi), fmt(fx(xi))]) },
      meta: { h, n },
    };
  }
}

module.exports = { TrapezoidalRuleMethod, SimpsonsOneThirdRuleMethod };
