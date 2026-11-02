'use strict';
/**
 * การเชื่อมต่อ SQLite และการสร้างตาราง
 * ใช้ node:sqlite (built-in) เพื่อไม่ต้องพึ่ง native dependency ภายนอก
 * ตำแหน่งไฟล์ DB กำหนดผ่าน env DB_PATH (สำหรับ Docker volume mount)
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', '..', 'data', 'fastnumeric.sqlite');

// สร้างโฟลเดอร์ถ้ายังไม่มี
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

// WAL mode ทำให้อ่านเขียนพร้อมกันได้ดีขึ้น
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// ตารางโจทย์ (problem): โจทย์เดียวกัน = category + method + input เหมือนกัน
db.exec(`
  CREATE TABLE IF NOT EXISTS problem (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    method TEXT NOT NULL,
    input_json TEXT NOT NULL,
    input_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    UNIQUE(category, method, input_hash)
  );
`);

// ตารางการคำนวณ (calculation): บันทึกทุกครั้งที่คำนวณโจทย์นั้น
db.exec(`
  CREATE TABLE IF NOT EXISTS calculation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_id INTEGER NOT NULL REFERENCES problem(id) ON DELETE CASCADE,
    answer TEXT NOT NULL,
    answer_value REAL,
    result_json TEXT NOT NULL,
    calculated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`);

db.exec('CREATE INDEX IF NOT EXISTS idx_calc_problem ON calculation(problem_id);');
db.exec('CREATE INDEX IF NOT EXISTS idx_problem_hash ON problem(input_hash);');

module.exports = { db, DB_PATH };
