'use strict';
/**
 * ถ่ายภาพหน้าผลลัพธ์การคำนวณ: กรอกฟอร์ม Bisection แล้วกดคำนวณ รอผลลัพธ์ แล้วถ่าย
 * และถ่ายหน้าตารางเลือกวิธี + history
 */
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(__dirname, 'shots');
const BASE = 'http://localhost:8080';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });

  // 1) Bisection + ผลลัพธ์
  await page.goto(`${BASE}/calculator/bisection`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input', { timeout: 15000 });
  const inputs = await page.$$('input');
  // ลำดับ input: fx, xl, xu, tol, maxIter
  await inputs[0].type('x^3 - x - 2');
  await inputs[1].type('1');
  await inputs[2].type('2');
  // tol, maxIter มี default แล้ว
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    btns.find((b) => b.textContent.includes('คำนวณ')).click();
  });
  await page.waitForFunction(
    () => document.body.textContent.includes('คำตอบ'),
    { timeout: 20000 }
  );
  await new Promise((r) => setTimeout(r, 800));
  // scroll ลงให้เห็นทั้งฟอร์มและผลลัพธ์
  await page.screenshot({ path: path.join(OUT, 'result-bisection.png'), fullPage: false });
  console.log('OK result-bisection.png');

  // scroll ลงล่างเพื่อเห็นตาราง iteration + วิธีทำ
  await page.evaluate(() => window.scrollTo(0, 700));
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUT, 'result-bisection-table.png') });
  console.log('OK result-bisection-table.png');

  // 2) Gauss elimination ผลลัพธ์
  await page.goto(`${BASE}/calculator/gauss-elimination`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('table input', { timeout: 15000 });
  // 3x3: กรอกเมทริกซ์ [[2,1,-1],[-3,-1,2],[-2,1,2]] | b=[8,-11,-3]
  const vals = ['2', '1', '-1', '-3', '-1', '2', '-2', '1', '2'];
  const bvals = ['8', '-11', '-3'];
  await page.evaluate((vals, bvals) => {
    // เปลี่ยนขนาดเมทริกซ์เป็น 3x3 ก่อน
    const sel = document.querySelector('select');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    setter.call(sel, '3');
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, vals, bvals);
  await new Promise((r) => setTimeout(r, 300));
  const cells = await page.$$('table input');
  // MatrixEditor วาง input แบบสลับ: แต่ละแถว = [A 3 ช่อง, b 1 ช่อง]
  // n=3 → index ของ A: 0,1,2, 4,5,6, 8,9,10 | index ของ b: 3,7,11
  const aIdx = [0, 1, 2, 4, 5, 6, 8, 9, 10];
  const bIdx = [3, 7, 11];
  const fill = async (idx, val) => {
    await cells[idx].click({ clickCount: 3 }); // เลือกข้อความเดิมทั้งช่อง
    await cells[idx].type(String(val));
  };
  for (let i = 0; i < 9; i++) await fill(aIdx[i], vals[i]);
  for (let i = 0; i < 3; i++) await fill(bIdx[i], bvals[i]);
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    btns.find((b) => b.textContent.includes('คำนวณ')).click();
  });
  await page.waitForFunction(() => document.body.textContent.includes('คำตอบ'), { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(OUT, 'result-gauss.png') });
  console.log('OK result-gauss.png');

  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
