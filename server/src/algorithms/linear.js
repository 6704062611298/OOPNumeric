'use strict';
/**
 * หมวด 2: Linear Algebra Equation
 * - Gauss Elimination
 */

const { BaseMethod } = require('./BaseMethod');
const { fmt } = require('./format');

function badRequest(msg) {
  return Object.assign(new Error(msg), { status: 400 });
}

/** ตรวจว่าเมทริกซ์หลัง forward elimination เป็น singular หรือไม่ */
function checkSingular(A, n) {
  for (let i = 0; i < n; i++) {
    if (Math.abs(A[i][i]) < 1e-12) return true;
  }
  return false;
}

class GaussEliminationMethod extends BaseMethod {
  constructor() {
    super({
      key: 'gauss-elimination',
      category: 'linear',
      name: 'Gauss Elimination',
      nameTh: 'วิธีกัวส์ อิลิมิเนชัน',
      fields: [
        {
          name: 'matrix',
          label: 'ระบบสมการ AX = b',
          type: 'matrix',
        },
      ],
    });
  }

  solve({ matrix }) {
    const { n, A: A0, b: b0 } = matrix;
    // ทำสำเนาเพื่อไม่แก้ไขข้อมูลต้นฉบับ (encapsulation ของ input)
    const A = A0.map((r) => [...r]);
    const b = [...b0];
    const steps = [];

    steps.push({
      title: 'ระบบสมการเริ่มต้น (Augmented Matrix [A|b])',
      lines: [this._matrixString(A, b, n)],
    });

    // Forward Elimination
    for (let k = 0; k < n - 1; k++) {
      // Partial Pivoting: สลับแถวให้ pivot มีค่าสัมบูรณ์มากที่สุด (ลด floating point error)
      let maxRow = k;
      for (let i = k + 1; i < n; i++) {
        if (Math.abs(A[i][k]) > Math.abs(A[maxRow][k])) maxRow = i;
      }
      if (Math.abs(A[maxRow][k]) < 1e-12) {
        throw badRequest(
          `เมทริกซ์เป็น Singular (ไม่มีคำตอบหรือมีไม่จำกัด) — ไม่สามารถหา pivot ที่คอลัมน์ ${k + 1}`
        );
      }
      if (maxRow !== k) {
        [A[k], A[maxRow]] = [A[maxRow], A[k]];
        [b[k], b[maxRow]] = [b[maxRow], b[k]];
        steps.push({
          title: `แถวที่ ${k + 1}: สลับแถว (Partial Pivoting) R${k + 1} ↔ R${maxRow + 1}`,
          lines: [this._matrixString(A, b, n)],
        });
      }

      for (let i = k + 1; i < n; i++) {
        const m = A[i][k] / A[k][k];
        for (let j = k; j < n; j++) {
          A[i][j] -= m * A[k][j];
        }
        b[i] -= m * b[k];
        A[i][k] = 0; // บังคับเป็นศูนย์เพื่อไม่ให้เศษ floating point ค้าง
      }
      steps.push({
        title: `Forward Elimination คอลัมน์ที่ ${k + 1}`,
        lines: [
          `กำจัดตัวแปรที่ ${k + 1} ออกจากแถวล่างโดยใช้ Rᵢ ← Rᵢ − m·R${k + 1}`,
          this._matrixString(A, b, n),
        ],
      });
    }

    if (checkSingular(A, n)) {
      throw badRequest('เมทริกซ์เป็น Singular — ระบบไม่มีคำตอบหรือมีคำตอบไม่จำกัด');
    }

    // Back Substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      for (let j = i + 1; j < n; j++) {
        s -= A[i][j] * x[j];
      }
      x[i] = s / A[i][i];
    }

    steps.push({
      title: 'Back Substitution',
      lines: x.map((xi, i) => {
        let s = '';
        for (let j = i + 1; j < n; j++) {
          s += ` − (${fmt(A[i][j])})·x${j + 1}`;
        }
        return `x${i + 1} = (${fmt(b[i])}${s}) / ${fmt(A[i][i])} = ${fmt(xi)}`;
      }),
    });

    const columns = ['ตัวแปร', 'ค่า'];
    const rows = x.map((xi, i) => [`x${i + 1}`, fmt(xi)]);

    return {
      answer: x.map((xi, i) => `x${i + 1} = ${fmt(xi)}`).join(',  '),
      answerValue: null,
      steps,
      table: { columns, rows },
      meta: { solution: x },
    };
  }

  _matrixString(A, b, n) {
    return A.map(
      (row, i) => `[ ${row.map((v) => fmt(v, 4).padStart(10)).join('  ')} | ${fmt(b[i], 4).padStart(10)} ]`
    ).join('\n');
  }
}

module.exports = { GaussEliminationMethod };
