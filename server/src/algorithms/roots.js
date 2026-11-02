'use strict';
/**
 * หมวด 1: Root of Equation
 * - Bisection Method
 * - Newton-Raphson Method
 */

const { BaseMethod } = require('./BaseMethod');
const { fmt } = require('./format');

const DEFAULT_TOL = 1e-6;
const DEFAULT_MAX_ITER = 100;

/** ประเมินค่า f พร้อมตรวจ domain เช่น sqrt ของค่าลบ */
function evalAt(f, x, label) {
  const v = f(x);
  if (!Number.isFinite(v)) {
    throw Object.assign(new Error(`ไม่สามารถคำนวณ ${label} = ${fmt(x)} ได้ (ค่าฟังก์ชันไม่นิยาม อาจเป็น domain error)`), {
      status: 400,
    });
  }
  return v;
}

// ---------------------------------------------------------------------------
// Bisection
// ---------------------------------------------------------------------------
class BisectionMethod extends BaseMethod {
  constructor() {
    super({
      key: 'bisection',
      category: 'root',
      name: 'Bisection Method',
      nameTh: 'วิธีแบ่งครึ่งช่วง',
      fields: [
        { name: 'fx', label: 'f(x) = 0', type: 'expression', placeholder: 'เช่น x^3 - x - 2' },
        { name: 'xl', label: 'XL (ปลายซ้าย)', type: 'number' },
        { name: 'xu', label: 'XU (ปลายขวา)', type: 'number' },
        { name: 'tol', label: 'Tolerance', type: 'number', default: 1e-6 },
        { name: 'maxIter', label: 'Max Iterations', type: 'int', default: 100, min: 1, max: 1000 },
      ],
    });
  }

  solve({ fx, xl, xu, tol, maxIter }) {
    if (xl >= xu) {
      throw Object.assign(new Error('ค่า XL ต้องน้อยกว่า XU'), { status: 400 });
    }
    const fxl = evalAt(fx, xl, 'f(XL)');
    const fxu = evalAt(fx, xu, 'f(XU)');
    if (fxl === 0) return this._root(fx, xl, 0, [], `XL = ${fmt(xl)} เป็นรากของสมการ (f(XL) = 0)`);
    if (fxu === 0) return this._root(fx, xu, 0, [], `XU = ${fmt(xu)} เป็นรากของสมการ (f(XU) = 0)`);
    if (fxl * fxu > 0) {
      throw Object.assign(
        new Error(
          `f(XL) และ f(XU) มีเครื่องหมายเดียวกัน (${fmt(fxl)} และ ${fmt(fxu)}) — ไม่มีการเปลี่ยนเครื่องหมายในช่วง [${fmt(xl)}, ${fmt(xu)}] จึงไม่สามารถใช้ Bisection ได้ (ลองเปลี่ยนช่วง)`
        ),
        { status: 400 }
      );
    }

    const rows = [];
    let a = xl;
    let b = xu;
    let prev = null;
    let iter = 0;
    let root = (a + b) / 2;

    for (; iter < maxIter; iter++) {
      const fa = iter === 0 ? fxl : evalAt(fx, a, 'f(XL)');
      root = (a + b) / 2;
      const froot = evalAt(fx, root, 'f(x)');
      const error = prev === null ? '-' : Math.abs((root - prev) / root) * 100;
      rows.push({
        iter: iter + 1,
        xl: a,
        xu: b,
        xr: root,
        fxl: fa,
        fxr: froot,
        error,
      });
      if (froot === 0) break;
      if (fa * froot < 0) {
        b = root;
      } else {
        a = root;
      }
      if (prev !== null && Math.abs((root - prev) / root) * 100 < tol) break;
      prev = root;
    }

    const converged = iter < maxIter;
    const columns = ['#', 'XL', 'XU', 'XR', 'f(XL)', 'f(XR)', 'Error (%)'];
    const tableRows = rows.map((r) => [
      String(r.iter),
      fmt(r.xl), fmt(r.xu), fmt(r.xr), fmt(r.fxl), fmt(r.fxr),
      r.error === '-' ? '-' : fmt(r.error),
    ]);

    const steps = [
      {
        title: 'สูตรและเงื่อนไข',
        lines: [
          `สมการ: f(x) = 0 ในช่วง [${fmt(xl)}, ${fmt(xu)}]`,
          'XR = (XL + XU) / 2',
          'ถ้า f(XL)·f(XR) < 0 รากอยู่ครึ่งซ้าย → XU = XR ; ถ้าไม่ XL = XR',
          `Tolerance = ${tol}, Max Iterations = ${maxIter}`,
        ],
      },
      {
        title: 'การทำซ้ำ',
        lines: [
          `ทำซ้ำไปทั้งหมด ${rows.length} รอบ`,
          converged
            ? `ลู่เข้า: |(XR ใหม่ − XR เดิม) / XR ใหม่| × 100 < ${tol}`
            : `ครบจำนวนรอบสูงสุด (${maxIter}) แล้วแต่ยังไม่บรรลุ Tolerance — ค่าที่ได้เป็นค่าประมาณ`,
        ],
      },
    ];

    return {
      answer: `รากของสมการ (root) ≈ ${fmt(root)}`,
      answerValue: root,
      steps,
      table: { columns, rows: tableRows },
      meta: { iterations: rows.length, converged },
    };
  }

  _root(fx, x, iterCount, rows, answer) {
    return {
      answer,
      answerValue: x,
      steps: [{ title: 'ผลลัพธ์ทันที', lines: [answer] }],
      table: null,
      meta: { iterations: iterCount, converged: true },
    };
  }
}

// ---------------------------------------------------------------------------
// Newton-Raphson
// ---------------------------------------------------------------------------
class NewtonRaphsonMethod extends BaseMethod {
  constructor() {
    super({
      key: 'newton-raphson',
      category: 'root',
      name: 'Newton-Raphson Method',
      nameTh: 'วิธีนิวตัน-ราฟสัน',
      fields: [
        { name: 'fx', label: 'f(x) = 0', type: 'expression', placeholder: 'เช่น x^3 - x - 2' },
        { name: 'x0', label: 'X0 (ค่าเริ่มต้น)', type: 'number' },
        { name: 'tol', label: 'Tolerance', type: 'number', default: 1e-6 },
        { name: 'maxIter', label: 'Max Iterations', type: 'int', default: 100, min: 1, max: 1000 },
      ],
    });
  }

  solve({ fx, x0, tol, maxIter }) {
    // อนุพันธ์เชิงตัวเลขแบบ central difference ความแม่นยำสูง (h แปรผันตามขนาด x)
    const df = (x) => {
      const h = Math.max(1e-9, Math.abs(x) * 1e-8);
      return (evalAt(fx, x + h, "f(x+h)") - evalAt(fx, x - h, "f(x-h)")) / (2 * h);
    };

    const rows = [];
    let x = x0;
    let iter = 0;
    let root = x;
    let converged = false;
    let reason = '';

    for (; iter < maxIter; iter++) {
      const f0 = evalAt(fx, x, 'f(x)');
      const d0 = df(x);
      if (d0 === 0) {
        reason = `อนุพันธ์ f'(x) เป็นศูนย์ที่ x = ${fmt(x)} ทำให้หารด้วยศูนย์ — ลองเปลี่ยนค่าเริ่มต้น X0`;
        break;
      }
      const xNew = x - f0 / d0;
      if (!Number.isFinite(xNew)) {
        reason = 'ค่าในการทำซ้ำไม่นิยาม (เกิด overflow หรือหารด้วยค่าใกล้ศูนย์) — ลองเปลี่ยน X0';
        break;
      }
      const error = iter === 0 ? '-' : Math.abs((xNew - x) / xNew) * 100;
      rows.push({ iter: iter + 1, x, fx: f0, dfx: d0, xNew, error });
      root = xNew;
      if (Math.abs((xNew - x) / xNew) * 100 < tol) {
        converged = true;
        reason = `ลู่เข้า: |(x ใหม่ − x เดิม) / x ใหม่| × 100 < ${tol}`;
        break;
      }
      x = xNew;
    }
    if (!converged && !reason) {
      reason = `ครบจำนวนรอบสูงสุด (${maxIter}) แล้วแต่ยังไม่บรรลุ Tolerance — อาจไม่ลู่เข้าหรือลู่เข้าช้า ลองเปลี่ยน X0`;
    }

    const columns = ['#', 'xᵢ', 'f(xᵢ)', "f'(xᵢ)", 'xᵢ₊₁', 'Error (%)'];
    const tableRows = rows.map((r) => [
      String(r.iter),
      fmt(r.x), fmt(r.fx), fmt(r.dfx), fmt(r.xNew),
      r.error === '-' ? '-' : fmt(r.error),
    ]);

    const steps = [
      {
        title: 'สูตรและเงื่อนไข',
        lines: [
          'สูตร: xᵢ₊₁ = xᵢ − f(xᵢ) / f\'(xᵢ)',
          `ค่าเริ่มต้น X0 = ${fmt(x0)}`,
          `Tolerance = ${tol}, Max Iterations = ${maxIter}`,
          "หมายเหตุ: f'(x) คำนวณด้วยอนุพันธ์เชิงตัวเลข (central difference)",
        ],
      },
      {
        title: 'การทำซ้ำ',
        lines: [`ทำซ้ำไปทั้งหมด ${rows.length} รอบ — ${reason}`],
      },
    ];

    return {
      answer: `รากของสมการ (root) ≈ ${fmt(root)}`,
      answerValue: root,
      steps,
      table: { columns, rows: tableRows },
      meta: { iterations: rows.length, converged },
    };
  }
}

module.exports = { BisectionMethod, NewtonRaphsonMethod, DEFAULT_TOL, DEFAULT_MAX_ITER };
