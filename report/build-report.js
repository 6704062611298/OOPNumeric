'use strict';
/**
 * ฝังภาพ screenshot เป็น base64 data URI ลง HTML รายงาน
 * อ่าน report/template.html ที่มี placeholder {{img:name.png}} แล้วเขียน report/oop-report-v2.html
 */
const fs = require('fs');
const path = require('path');

const SHOTS = path.join(__dirname, 'shots');
let html = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

const placeholders = [...html.matchAll(/\{\{img:([^}]+)\}\}/g)].map((m) => m[1]);
const unique = [...new Set(placeholders)];
for (const name of unique) {
  const file = path.join(SHOTS, name);
  if (!fs.existsSync(file)) {
    console.error(`MISSING: ${name}`);
    continue;
  }
  const b64 = fs.readFileSync(file).toString('base64');
  html = html.split(`{{img:${name}}}`).join(`data:image/png;base64,${b64}`);
  console.log(`embedded: ${name} (${Math.round(b64.length / 1024)} KB)`);
}

fs.writeFileSync(path.join(__dirname, 'oop-report-v2.html'), html);
console.log('WROTE oop-report-v2.html');
