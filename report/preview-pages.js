'use strict';
const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const p = await b.newPage();
  await p.setViewport({ width: 794, height: 1123 });
  await p.goto('file:///C:/Users/intel/Desktop/FastNumeric/report/oop-report-v2.html', { waitUntil: 'networkidle0', timeout: 30000 });
  const pages = await p.$$('.page');
  console.log('pages:', pages.length);
  for (let i = 0; i < pages.length; i++) {
    await pages[i].screenshot({ path: 'shots/pdf-page-' + (i + 1) + '.png' });
  }
  await b.close();
  console.log('done');
})().catch((e) => { console.error(e.message); process.exit(1); });
