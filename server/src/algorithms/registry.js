'use strict';
/**
 * Registry ของทุกวิธีคำนวณ (Composition + Open/Closed)
 * การเพิ่มวิธีใหม่: สร้าง class ในไฟล์ของหมวดนั้นแล้วเพิ่มบรรทัด register() ที่นี่เท่านั้น
 */

const { BisectionMethod, NewtonRaphsonMethod } = require('./roots');
const { GaussEliminationMethod } = require('./linear');
const { LinearInterpolationMethod, LagrangeInterpolationMethod } = require('./interpolation');
const { LinearExtrapolationMethod } = require('./extrapolation');
const { TrapezoidalRuleMethod, SimpsonsOneThirdRuleMethod } = require('./integration');
const { DifferenceMethod } = require('./differentiation');

/** @type {Map<string, BaseMethod>} */
const methods = new Map();
/** @type {Map<string, string>} category key → ชื่อหมวด */
const categories = new Map([
  ['root', 'Root of Equation'],
  ['linear', 'Linear Algebra Equation'],
  ['interpolation', 'Interpolation'],
  ['extrapolation', 'Extrapolation'],
  ['integration', 'Integration'],
  ['differentiation', 'Differentiation'],
]);

function register(method) {
  if (methods.has(method.meta.key)) {
    throw new Error(`method key ซ้ำ: ${method.meta.key}`);
  }
  methods.set(method.meta.key, method);
}

[
  new BisectionMethod(),
  new NewtonRaphsonMethod(),
  new GaussEliminationMethod(),
  new LinearInterpolationMethod(),
  new LagrangeInterpolationMethod(),
  new LinearExtrapolationMethod(),
  new TrapezoidalRuleMethod(),
  new SimpsonsOneThirdRuleMethod(),
  new DifferenceMethod('forward'),
  new DifferenceMethod('backward'),
  new DifferenceMethod('central'),
].forEach(register);

/** รายการวิธีทั้งหมดแบบ meta (สำหรับสร้าง UI ฝั่ง client) */
function listMethods() {
  return [...categories.entries()].map(([catKey, catName]) => ({
    key: catKey,
    name: catName,
    methods: [...methods.values()]
      .filter((m) => m.meta.category === catKey)
      .map((m) => ({
        key: m.meta.key,
        name: m.meta.name,
        nameTh: m.meta.nameTh,
        fields: m.meta.fields,
      })),
  }));
}

function getMethod(key) {
  return methods.get(key) || null;
}

module.exports = { listMethods, getMethod, categories };
