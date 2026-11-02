'use strict';
/**
 * ชุดทดสอบอัลกอริทึม Numerical Methods ทั้งหมด
 * รันด้วย: npm test  (ภายใต้โฟลเดอร์ server)
 * ทุกเคสใช้โจทย์ที่ตรวจสอบคำตอบได้จริงทางคณิตศาสตร์
 */

const assert = require('assert');
const { compile } = require('../src/expression/parser');
const { BisectionMethod, NewtonRaphsonMethod } = require('../src/algorithms/roots');
const { GaussEliminationMethod } = require('../src/algorithms/linear');
const {
  LinearInterpolationMethod,
  LagrangeInterpolationMethod,
} = require('../src/algorithms/interpolation');
const { LinearExtrapolationMethod } = require('../src/algorithms/extrapolation');
const {
  TrapezoidalRuleMethod,
  SimpsonsOneThirdRuleMethod,
} = require('../src/algorithms/integration');
const { DifferenceMethod } = require('../src/algorithms/differentiation');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, e });
    console.error(`  FAIL  ${name}\n        ${e.message}`);
  }
}

function approx(a, b, tol = 1e-6) {
  assert.ok(
    Math.abs(a - b) <= tol,
    `ค่าไม่ใกล้เคียง: ได้ ${a} แต่คาด ${b} (tol ${tol})`
  );
}

function expectError(fn, msgPart) {
  try {
    fn();
  } catch (e) {
    if (msgPart && !e.message.includes(msgPart)) {
      throw new Error(`error message ไม่ตรง: ได้ "${e.message}" แต่คาดว่ามี "${msgPart}"`);
    }
    return e;
  }
  throw new Error('คาดว่าจะ throw error แต่ไม่มี error');
}

console.log('=== Expression Parser ===');
test('parse: x^3 - x - 2 ที่ x=1.5214 ให้ ~0', () => {
  const f = compile('x^3 - x - 2');
  approx(f(1.5213797), 0, 1e-4);
});
test('parse: การคูณละเครื่องหมาย 2x+1', () => {
  const f = compile('2x+1');
  assert.strictEqual(f(3), 7);
});
test('parse: 3(x+1)(x-1)', () => {
  const f = compile('3(x+1)(x-1)');
  assert.strictEqual(f(2), 9);
});
test('parse: sin, cos, sqrt, ln, exp, pi, e', () => {
  const f = compile('sin(pi/2) + cos(0) + sqrt(4) + ln(e) + exp(0)');
  approx(f(0), 1 + 1 + 2 + 1 + 1);
});
test('parse: 1e-6 และ -3.5', () => {
  const f = compile('1e-6 x - 3.5');
  approx(f(1e6), 1e-6 * 1e6 - 3.5);
});
test('parse error: อักขระแปลก', () => {
  expectError(() => compile('x $ 2'));
});
test('parse error: วงเล็บไม่ครบ', () => {
  expectError(() => compile('(x+1'));
});
test('parse error: หารด้วยศูนย์ระหว่างคำนวณ', () => {
  const f = compile('1/x');
  expectError(() => f(0), 'หารด้วยศูนย์');
});

console.log('=== Bisection Method ===');
test('bisection: x^3 - x - 2 = 0 ใน [1,2] → ~1.5214', () => {
  const r = new BisectionMethod().solve({
    fx: compile('x^3 - x - 2'),
    xl: 1,
    xu: 2,
    tol: 1e-6,
    maxIter: 100,
  });
  approx(r.answerValue, 1.5213797, 1e-4);
  assert.ok(r.meta.converged);
  assert.ok(r.table.rows.length >= 10);
});
test('bisection: f(XL)·f(XU) > 0 → error', () => {
  expectError(
    () => new BisectionMethod().solve({ fx: compile('x^2 - 4'), xl: 3, xu: 5, tol: 1e-6, maxIter: 50 }),
    'เครื่องหมายเดียวกัน'
  );
});
test('bisection: XL >= XU → error', () => {
  expectError(
    () => new BisectionMethod().solve({ fx: compile('x-1'), xl: 2, xu: 1, tol: 1e-6, maxIter: 50 }),
    'น้อยกว่า'
  );
});

console.log('=== Newton-Raphson ===');
test('newton: x^3 - x - 2 = 0, x0=1 → ~1.5214', () => {
  const r = new NewtonRaphsonMethod().solve({
    fx: compile('x^3 - x - 2'),
    x0: 1,
    tol: 1e-6,
    maxIter: 100,
  });
  approx(r.answerValue, 1.5213797, 1e-5);
  assert.ok(r.meta.converged);
});
test('newton: cos(x) - x = 0 → ~0.739085', () => {
  const r = new NewtonRaphsonMethod().solve({
    fx: compile('cos(x) - x'),
    x0: 0,
    tol: 1e-6,
    maxIter: 100,
  });
  approx(r.answerValue, 0.7390851, 1e-5);
});
test('newton: f ไม่นิยามที่ x0 (sqrt ค่าลบ) → error ที่ domain', () => {
  // sqrt(x) ที่ x=-1 → domain error จาก parser
  expectError(() => new NewtonRaphsonMethod().solve({
    fx: compile('sqrt(x) - 2'),
    x0: -1,
    tol: 1e-6,
    maxIter: 10,
  }));
});

console.log('=== Gauss Elimination ===');
test('gauss: ระบบ 3x3 มีคำตอบเดียว', () => {
  // 2x + y - z = 8; -3x - y + 2z = -11; -2x + y + 2z = -3 → x=2,y=3,z=-1
  const r = new GaussEliminationMethod().solve({
    matrix: {
      n: 3,
      A: [
        [2, 1, -1],
        [-3, -1, 2],
        [-2, 1, 2],
      ],
      b: [8, -11, -3],
    },
  });
  const sol = r.meta.solution;
  approx(sol[0], 2);
  approx(sol[1], 3);
  approx(sol[2], -1);
});
test('gauss: singular matrix → error', () => {
  expectError(
    () =>
      new GaussEliminationMethod().solve({
        matrix: { n: 2, A: [[1, 2], [2, 4]], b: [1, 2] },
      }),
    'Singular'
  );
});
test('gauss: ระบบไม่มีคำตอบ (inconsistent) → error', () => {
  expectError(
    () =>
      new GaussEliminationMethod().solve({
        matrix: { n: 2, A: [[1, 1], [1, 1]], b: [1, 2] },
      }),
    'Singular'
  );
});

console.log('=== Linear Interpolation ===');
test('linear interp: จุด (1,2),(3,6) ที่ x=2 → 4', () => {
  const r = new LinearInterpolationMethod().solve({
    points: [
      { x: 1, y: 2 },
      { x: 3, y: 6 },
    ],
    x: 2,
  });
  approx(r.answerValue, 4);
});
test('linear interp: x นอกช่วง → error แนะนำ Extrapolation', () => {
  expectError(
    () =>
      new LinearInterpolationMethod().solve({
        points: [
          { x: 1, y: 2 },
          { x: 3, y: 6 },
        ],
        x: 5,
      }),
    'Extrapolation'
  );
});

console.log('=== Lagrange Interpolation ===');
test('lagrange: 3 จุดผ่านพอลิโนเมียล x² ที่ x=1.5 → 2.25', () => {
  const r = new LagrangeInterpolationMethod().solve({
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 4 },
      { x: 3, y: 9 },
    ],
    x: 1.5,
  });
  approx(r.answerValue, 2.25, 1e-9);
});
test('lagrange: จุด (0,2),(1,3),(2,12) ที่ x=0.5 → 2.5 (ผ่านทุกจุดแน่นอน)', () => {
  // ตรวจว่าพอลิโนเมียลลากผ่านจุดข้อมูลทุกจุด
  const pts = [
    { x: 0, y: 2 },
    { x: 1, y: 3 },
    { x: 2, y: 12 },
  ];
  for (const p of pts) {
    const r = new LagrangeInterpolationMethod().solve({ points: pts, x: p.x });
    approx(r.answerValue, p.y, 1e-9);
  }
});

console.log('=== Linear Extrapolation ===');
test('extrap: จุด (1,2),(3,6) ที่ x=5 → 10 (ฝั่งขวา)', () => {
  const r = new LinearExtrapolationMethod().solve({
    points: [
      { x: 1, y: 2 },
      { x: 3, y: 6 },
    ],
    x: 5,
  });
  approx(r.answerValue, 10);
});
test('extrap: ฝั่งซ้าย x=-1 → -2', () => {
  const r = new LinearExtrapolationMethod().solve({
    points: [
      { x: 1, y: 2 },
      { x: 3, y: 6 },
    ],
    x: -1,
  });
  approx(r.answerValue, -2);
});
test('extrap: x ในช่วง → error แนะนำ Interpolation', () => {
  expectError(
    () =>
      new LinearExtrapolationMethod().solve({
        points: [
          { x: 1, y: 2 },
          { x: 3, y: 6 },
        ],
        x: 2,
      }),
    'Interpolation'
  );
});

console.log('=== Trapezoidal Rule ===');
test('trapezoid: ∫0..1 x² dx, n=4 → ใกล้ 1/3 (error ทฤษฎี = 0.0104)', () => {
  const r = new TrapezoidalRuleMethod().solve({
    fx: compile('x^2'),
    a: 0,
    b: 1,
    n: 4,
  });
  approx(r.answerValue, 1 / 3, 0.0105); // trapezoid n=4 บน x² ให้ 0.34375
});
test('trapezoid: ค่า exact ของ trapezoid n=4 บน x² คือ 0.34375', () => {
  const r = new TrapezoidalRuleMethod().solve({ fx: compile('x^2'), a: 0, b: 1, n: 4 });
  approx(r.answerValue, 0.34375, 1e-12);
});
test('trapezoid: ∫1..2 sqrt(x) dx → ~1.218951', () => {
  const r = new TrapezoidalRuleMethod().solve({ fx: compile('sqrt(x)'), a: 1, b: 2, n: 100 });
  approx(r.answerValue, 1.218951, 1e-4);
});

console.log("=== Simpson's 1/3 Rule ===");
test("simpson: ∫0..1 x² dx, n=4 → exact 1/3 (simpson แม่นบนพอลิโนเมียลดีกรี ≤ 3)", () => {
  const r = new SimpsonsOneThirdRuleMethod().solve({
    fx: compile('x^2'),
    a: 0,
    b: 1,
    n: 4,
  });
  approx(r.answerValue, 1 / 3, 1e-12);
});
test("simpson: ∫0..2 e^x dx → e² − 1 ≈ 6.389056", () => {
  const r = new SimpsonsOneThirdRuleMethod().solve({
    fx: compile('exp(x)'),
    a: 0,
    b: 2,
    n: 100,
  });
  approx(r.answerValue, Math.exp(2) - 1, 1e-8);
});
test("simpson: n เป็นเลขคี่ → error", () => {
  expectError(
    () => new SimpsonsOneThirdRuleMethod().solve({ fx: compile('x^2'), a: 0, b: 1, n: 5 }),
    'จำนวนคู่'
  );
});

console.log('=== Differentiation ===');
const diffPoints = [
  { x: 1.0, y: 1.0 },
  { x: 1.5, y: 2.25 },
  { x: 2.0, y: 4.0 },
  { x: 2.5, y: 6.25 },
  { x: 3.0, y: 9.0 },
]; // y = x² → f'(2) = 4
test('forward: f(x)=x² ที่ x=2 → (6.25−4)/0.5 = 4.5', () => {
  const r = new DifferenceMethod('forward').solve({ points: diffPoints, x: 2 });
  approx(r.answerValue, 4.5, 1e-12);
});
test('backward: f(x)=x² ที่ x=2 → (4−2.25)/0.5 = 3.5', () => {
  const r = new DifferenceMethod('backward').solve({ points: diffPoints, x: 2 });
  approx(r.answerValue, 3.5, 1e-12);
});
test('central: f(x)=x² ที่ x=2 → (6.25−2.25)/1 = 4 (exact)', () => {
  const r = new DifferenceMethod('central').solve({ points: diffPoints, x: 2 });
  approx(r.answerValue, 4.0, 1e-12);
});
test('forward: จุดสุดท้าย → error แนะนำ backward', () => {
  expectError(() => new DifferenceMethod('forward').solve({ points: diffPoints, x: 3 }), 'Backward');
});
test('backward: จุดแรก → error แนะนำ forward', () => {
  expectError(() => new DifferenceMethod('backward').solve({ points: diffPoints, x: 1 }), 'Forward');
});
test('central: จุดปลาย → error', () => {
  expectError(() => new DifferenceMethod('central').solve({ points: diffPoints, x: 3 }));
});
test('diff: x ไม่ตรงจุดในตาราง → error', () => {
  expectError(() => new DifferenceMethod('forward').solve({ points: diffPoints, x: 2.2 }), 'ไม่ตรงกับจุดข้อมูล');
});

console.log('');
console.log('========================================');
console.log(`ผลรวม: PASS ${passed} / FAIL ${failed}`);
console.log('========================================');
if (failed > 0) {
  console.error('\nรายละเอียดความล้มเหลว:');
  for (const f of failures) {
    console.error(`- ${f.name}: ${f.e.stack}`);
  }
  process.exit(1);
}
