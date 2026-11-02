'use strict';
/**
 * Express Router หลัก — API ทั้งหมดอยู่ภายใต้ /api
 */

const express = require('express');
const { listMethods, getMethod, categories } = require('../algorithms/registry');
const history = require('../database/history');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/methods — รายการหมวดและวิธีคำนวณ (สำหรับสร้าง UI อัตโนมัติ)
// ---------------------------------------------------------------------------
router.get('/methods', (_req, res) => {
  res.json({ categories: listMethods() });
});

// ---------------------------------------------------------------------------
// POST /api/calculate — คำนวณและบันทึกประวัติ
// body: { method: 'bisection', input: {...} }
// ---------------------------------------------------------------------------
router.post('/calculate', (req, res) => {
  const { method: methodKey, input } = req.body || {};
  if (!methodKey || typeof methodKey !== 'string') {
    return res.status(400).json({ error: 'กรุณาระบุวิธีคำนวณ (method)' });
  }
  const method = getMethod(methodKey);
  if (!method) {
    return res.status(400).json({ error: `ไม่พบวิธีคำนวณ '${methodKey}'` });
  }

  // แปลง/ตรวจ input ตาม field definition ของวิธีนั้น ๆ
  const parsed = {};
  try {
    for (const field of method.meta.fields) {
      const raw = input ? input[field.name] : undefined;
      switch (field.type) {
        case 'expression':
          parsed[field.name] = require('../validation').asExpression(raw, field.label);
          break;
        case 'number':
          parsed[field.name] = require('../validation').asFloat(raw, field.label, {
            min: field.min,
            max: field.max,
            default: field.default,
          });
          break;
        case 'int':
          parsed[field.name] = require('../validation').asInt(raw, field.label, {
            min: field.min,
            max: field.max,
            default: field.default,
          });
          break;
        case 'points':
          parsed[field.name] = require('../validation').asPoints(raw, field.label);
          break;
        case 'matrix':
          parsed[field.name] = require('../validation').asMatrix(raw, field.label);
          break;
        default:
          throw new Error(`ชนิด field ไม่รู้จัก: ${field.type}`);
      }
    }
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message });
  }

  // คำนวณจริง
  let result;
  try {
    result = method.solve(parsed);
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message });
  }

  // บันทึกลงฐานข้อมูล — เก็บ input "แบบ raw ที่ user กรอก" เพื่อให้เรียกดูย้อนหลังได้สมบูรณ์
  const rawInput = {};
  for (const field of method.meta.fields) {
    const v = input ? input[field.name] : undefined;
    if (v === undefined && field.default !== undefined) {
      rawInput[field.name] = field.default;
    } else {
      rawInput[field.name] = v;
    }
  }

  let problemId = null;
  let dbError = null;
  try {
    problemId = history.saveCalculation({
      category: method.meta.category,
      method: methodKey,
      input: rawInput,
      answer: result.answer,
      answerValue: typeof result.answerValue === 'number' ? result.answerValue : null,
      result,
    });
  } catch (e) {
    // ประวัติล้มเหลวไม่ควรทำให้การคำนวณล้มเหลวตาม — แจ้งใน response
    dbError = `บันทึกประวัติไม่สำเร็จ: ${e.message}`;
  }

  res.json({
    method: {
      key: method.meta.key,
      name: method.meta.name,
      nameTh: method.meta.nameTh,
      category: method.meta.category,
      categoryName: categories.get(method.meta.category),
    },
    result,
    problemId,
    dbError,
  });
});

// ---------------------------------------------------------------------------
// GET /api/history — รายการประวัติ
// ---------------------------------------------------------------------------
router.get('/history', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const rows = history.listHistory({ limit, offset });
  res.json({
    items: rows.map((r) => ({
      id: r.id,
      category: r.category,
      method: r.method,
      input: JSON.parse(r.input_json),
      timesCalculated: r.times_calculated,
      createdAt: r.created_at,
      lastCalculatedAt: r.last_calculated_at,
    })),
    total: history.countProblems(),
  });
});

// ---------------------------------------------------------------------------
// GET /api/history/:id — รายละเอียดโจทย์ย้อนหลัง
// ---------------------------------------------------------------------------
router.get('/history/:id(\\d+)', (req, res) => {
  const detail = history.getProblemDetail(Number(req.params.id));
  if (!detail) return res.status(404).json({ error: 'ไม่พบโจทย์นี้ในประวัติ' });
  res.json({
    id: detail.id,
    category: detail.category,
    method: detail.method,
    input: detail.input,
    createdAt: detail.created_at,
    timesCalculated: detail.times_calculated,
    calculations: detail.calculations,
    result: detail.latestResult,
  });
});

// DELETE /api/history/:id — ลบโจทย์
router.delete('/history/:id(\\d+)', (req, res) => {
  const ok = history.deleteProblem(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: 'ไม่พบโจทย์นี้ในประวัติ' });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// GET /api/stats — ข้อมูล Dashboard
// ---------------------------------------------------------------------------
router.get('/stats', (_req, res) => {
  res.json(history.getStats());
});

module.exports = { router };
