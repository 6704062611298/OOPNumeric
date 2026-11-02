'use strict';
/**
 * ถ่ายภาพหน้าจอเว็บ FastNumeric สำหรับประกอบรายงาน
 * ใช้ Chrome headless ทำ screenshot ของแต่ละหน้า
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.join(__dirname, 'shots');
const BASE = 'http://localhost:8080';

fs.mkdirSync(OUT_DIR, { recursive: true });

const pages = [
  { url: '/', name: 'dashboard.png', w: 1280, h: 900 },
  { url: '/calculator', name: 'calculator-select.png', w: 1280, h: 900 },
  { url: '/calculator/bisection', name: 'calculator-bisection.png', w: 1280, h: 900 },
  { url: '/calculator/gauss-elimination', name: 'calculator-gauss.png', w: 1280, h: 900 },
  { url: '/history', name: 'history.png', w: 1280, h: 900 },
  { url: '/history/15', name: 'history-detail.png', w: 1280, h: 1100 },
];

for (const p of pages) {
  const out = path.join(OUT_DIR, p.name);
  try {
    execFileSync(CHROME, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars',
      `--screenshot=${out}`,
      `--window-size=${p.w},${p.h}`,
      '--virtual-time-budget=12000',
      `${BASE}${p.url}`,
    ], { stdio: 'ignore', timeout: 60000 });
    const ok = fs.existsSync(out) && fs.statSync(out).size > 10000;
    console.log(`${ok ? 'OK ' : 'FAIL'} ${p.name} ${ok ? '(' + Math.round(fs.statSync(out).size / 1024) + ' KB)' : ''}`);
  } catch (e) {
    console.log(`FAIL ${p.name}: ${e.message}`);
  }
}
