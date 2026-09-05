/* Mobile audit — real phone viewports, tap targets, overflow, zoom.
   node test/mobile.audit.js                                        */

const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'shots', 'mobile');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');

const TARGETS = [
  { name: 'iphone-se',      width: 375, height: 667, dpr: 2 },   // smallest common
  { name: 'iphone-14',      width: 390, height: 844, dpr: 3 },
  { name: 'pixel-7',        width: 412, height: 915, dpr: 2.6 },
  { name: 'android-small',  width: 360, height: 640, dpr: 2 },   // budget Android
  { name: 'galaxy-fold',    width: 320, height: 653, dpr: 2 },   // narrowest realistic
  { name: 'landscape',      width: 844, height: 390, dpr: 3 }
];

const MIN_TAP = 44;   // WCAG 2.5.5 / Apple HIG minimum

let problems = [];

async function auditScreen(page, label, target) {
  const report = await page.evaluate(() => {
    const doc = document.documentElement;

    const active = document.querySelector('.screen.is-active');
    const tappable = [...active.querySelectorAll('button, input, a')]
      .filter(el => el.offsetParent !== null);

    const small = tappable.map(el => {
      const r = el.getBoundingClientRect();
      return { tag: el.id || el.className || el.tagName, h: Math.round(r.height), w: Math.round(r.width) };
    }).filter(t => t.h < 44);

    const inputs = [...active.querySelectorAll('input')].map(el => ({
      id: el.id,
      fontSize: parseFloat(getComputedStyle(el).fontSize)
    }));

    // Does the active screen fit without vertical scrolling?
    const stage = document.querySelector('.stage');
    const contentHeight = active.getBoundingClientRect().height;

    return {
      hOverflow: doc.scrollWidth > doc.clientWidth,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      vScroll: doc.scrollHeight > doc.clientHeight + 2,
      contentHeight: Math.round(contentHeight),
      viewportHeight: doc.clientHeight,
      smallTargets: small,
      inputs
    };
  });

  if (report.hOverflow) {
    problems.push(`${target.name}/${label}: horizontal overflow (${report.scrollWidth} > ${report.clientWidth})`);
  }
  report.smallTargets.forEach(t => {
    problems.push(`${target.name}/${label}: tap target "${t.tag}" is ${t.h}px tall (min ${MIN_TAP})`);
  });
  report.inputs.forEach(i => {
    if (i.fontSize < 16) {
      problems.push(`${target.name}/${label}: input #${i.id} font-size ${i.fontSize}px — iOS will zoom on focus`);
    }
  });
  if (report.vScroll && report.contentHeight < report.viewportHeight) {
    problems.push(`${target.name}/${label}: page scrolls even though content fits`);
  }

  return report;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  console.log('\n=== Mobile audit ===\n');

  for (const target of TARGETS) {
    const ctx = await browser.newContext({
      viewport: { width: target.width, height: target.height },
      deviceScaleFactor: target.dpr,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForTimeout(600);

    const w = await auditScreen(page, 'welcome', target);
    await page.screenshot({ path: path.join(OUT, `${target.name}-1-welcome.png`) });

    await page.click('#btn-start');
    await page.waitForTimeout(400);
    await auditScreen(page, 'name', target);
    await page.screenshot({ path: path.join(OUT, `${target.name}-2-name.png`) });

    await page.fill('#input-player-name', 'Ori');
    await page.fill('#input-real-name', 'Orian Akash');
    await page.click('#btn-to-quiz');
    await page.waitForTimeout(400);

    const q = await auditScreen(page, 'question', target);
    await page.screenshot({ path: path.join(OUT, `${target.name}-3-question.png`) });

    // Longest question in the set — worst case for height.
    const longest = await page.evaluate(() => {
      let worst = 0, at = 0;
      QUIZ_DATA.questions.forEach((qq, i) => {
        const len = qq.text.length + qq.options.reduce((a, o) => a + o.text.length, 0);
        if (len > worst) { worst = len; at = i; }
      });
      return at;
    });
    for (let i = 0; i < longest; i++) {
      await page.click('.answer:nth-child(1)');
      await page.click('#btn-next');
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(250);
    const worst = await auditScreen(page, 'longest-question', target);
    await page.screenshot({ path: path.join(OUT, `${target.name}-4-longest.png`) });

    console.log(`  ${target.name.padEnd(15)} ${target.width}x${target.height}  ` +
                `question fits: ${q.contentHeight}px in ${q.viewportHeight}px ` +
                `${q.contentHeight <= q.viewportHeight ? '(no scroll)' : '(scrolls)'}  |  ` +
                `longest: ${worst.contentHeight}px ` +
                `${worst.contentHeight <= worst.viewportHeight ? '(no scroll)' : '(SCROLLS)'}`);

    await ctx.close();
  }

  await browser.close();

  console.log('\n--- Problems ---');
  if (problems.length === 0) {
    console.log('  none\n');
  } else {
    [...new Set(problems)].forEach(p => console.log('  ' + p));
    console.log('');
  }
  process.exit(problems.length ? 1 : 0);
})();
