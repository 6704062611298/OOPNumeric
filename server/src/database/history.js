'use strict';
/**
 * Repository สำหรับประวัติการคำนวณ (Data Access Layer)
 */

const crypto = require('crypto');
const { db } = require('./db');

/** สร้าง hash ของ input เพื่อระบุโจทย์ซ้ำ (category + method + input) */
function hashInput(category, method, input) {
  // เรียง key ก่อน hash ให้ {a,b} กับ {b,a} ให้ hash เดียวกัน
  const canonical = JSON.stringify(input, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.keys(v).sort().reduce((acc, key) => ({ ...acc, [key]: v[key] }), {})
      : v
  );
  return crypto.createHash('sha256').update(`${category}|${method}|${canonical}`).digest('hex');
}

/**
 * บันทึกผลการคำนวณ
 * - ถ้าโจทย์ (category+method+input) เคยมีแล้ว → เพิ่ม record ใน calculation เท่านั้น (นับจำนวนครั้ง)
 * - ถ้าโจทย์ใหม่ → สร้าง problem ใหม่ + calculation
 */
function saveCalculation({ category, method, input, answer, answerValue, result }) {
  const inputJson = JSON.stringify(input);
  const inputHash = hashInput(category, method, input);

  db.prepare(
    `INSERT INTO problem (category, method, input_json, input_hash)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(category, method, input_hash) DO NOTHING`
  ).run(category, method, inputJson, inputHash);

  const problem = db
    .prepare('SELECT id FROM problem WHERE category = ? AND method = ? AND input_hash = ?')
    .get(category, method, inputHash);

  db.prepare(
    `INSERT INTO calculation (problem_id, answer, answer_value, result_json)
     VALUES (?, ?, ?, ?)`
  ).run(problem.id, answer, answerValue, JSON.stringify(result));

  return problem.id;
}

/** รายการประวัติล่าสุด */
function listHistory({ limit = 50, offset = 0 } = {}) {
  return db
    .prepare(
      `SELECT p.id, p.category, p.method, p.input_json, p.created_at,
              COUNT(c.id) AS times_calculated,
              MAX(c.calculated_at) AS last_calculated_at
       FROM problem p
       LEFT JOIN calculation c ON c.problem_id = p.id
       GROUP BY p.id
       ORDER BY last_calculated_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset);
}

/** นับจำนวนโจทย์ทั้งหมด */
function countProblems() {
  return db.prepare('SELECT COUNT(*) AS n FROM problem').get().n;
}

/** รายละเอียดโจทย์ + ผลลัพธ์ล่าสุด */
function getProblemDetail(id) {
  const problem = db
    .prepare(
      `SELECT p.id, p.category, p.method, p.input_json, p.created_at,
              COUNT(c.id) AS times_calculated
       FROM problem p
       LEFT JOIN calculation c ON c.problem_id = p.id
       WHERE p.id = ?
       GROUP BY p.id`
    )
    .get(id);
  if (!problem) return null;

  const calculations = db
    .prepare(
      `SELECT id, answer, answer_value, calculated_at
       FROM calculation WHERE problem_id = ? ORDER BY calculated_at DESC, id DESC`
    )
    .all(id);

  const latest = db
    .prepare('SELECT result_json FROM calculation WHERE problem_id = ? ORDER BY id DESC LIMIT 1')
    .get(id);

  return {
    ...problem,
    input: JSON.parse(problem.input_json),
    calculations,
    latestResult: latest ? JSON.parse(latest.result_json) : null,
  };
}

/** ลบโจทย์และประวัติทั้งหมดของโจทย์นั้น */
function deleteProblem(id) {
  const info = db.prepare('DELETE FROM problem WHERE id = ?').run(id);
  return info.changes > 0;
}

/** สถิติสำหรับ Dashboard */
function getStats() {
  const totalProblems = countProblems();
  const totalCalculations = db.prepare('SELECT COUNT(*) AS n FROM calculation').get().n;
  const byCategory = db
    .prepare(
      `SELECT p.category, COUNT(DISTINCT p.id) AS problems, COUNT(c.id) AS calculations
       FROM problem p LEFT JOIN calculation c ON c.problem_id = p.id
       GROUP BY p.category ORDER BY calculations DESC`
    )
    .all();
  const topProblems = db
    .prepare(
      `SELECT p.id, p.category, p.method, COUNT(c.id) AS times_calculated
       FROM problem p JOIN calculation c ON c.problem_id = p.id
       GROUP BY p.id ORDER BY times_calculated DESC, p.id ASC LIMIT 5`
    )
    .all();
  return { totalProblems, totalCalculations, byCategory, topProblems };
}

module.exports = {
  saveCalculation,
  listHistory,
  getProblemDetail,
  deleteProblem,
  getStats,
  countProblems,
  hashInput,
};
