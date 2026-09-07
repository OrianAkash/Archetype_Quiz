/* Drives the real quiz in Chromium and screenshots every screen.
   node test/ui.screens.js                                        */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'shots');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2
  });

  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(URL);
  await page.waitForTimeout(1400);            // let fonts + bob settle
  await page.screenshot({ path: path.join(OUT, '1-welcome.png') });

  await page.click('#btn-start');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, '2-name.png') });

  // Validation should block an empty submit.
  await page.click('#btn-to-quiz');
  await page.waitForTimeout(300);
  const blocked = await page.isVisible('#screen-name.is-active');
  await page.screenshot({ path: path.join(OUT, '3-name-validation.png') });

  await page.fill('#input-player-name', 'Ori');
  await page.fill('#input-real-name', 'Orian Akash');
  await page.click('#btn-to-quiz');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, '4-question-unanswered.png') });

  const nextDisabledBefore = await page.isDisabled('#btn-next');

  await page.click('.answer:nth-child(3)');
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(OUT, '5-question-picked.png') });

  const nextDisabledAfter = await page.isDisabled('#btn-next');

  // Answer the rest, varying picks. Option counts vary per question
  // (some have 2, some 3, some 4), so pick within what's actually there.
  const totalQuestions = await page.evaluate(() => QUIZ_DATA.questions.length);
  for (let q = 0; q < totalQuestions; q++) {
    if (q > 0) {
      const available = await page.locator('.answer').count();
      const n = (q % available) + 1;
      await page.click(`.answer:nth-child(${n})`);
      await page.waitForTimeout(90);
    }
    if (q === 4) await page.screenshot({ path: path.join(OUT, '6-question-mid.png') });
    if (q === totalQuestions - 1) {
      await page.screenshot({ path: path.join(OUT, '7-question-last.png') });
    }
    await page.click('#btn-next');
    await page.waitForTimeout(160);
  }

  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, '8-done.png') });

  const doneVisible = await page.isVisible('#screen-done.is-active');
  const doneText = await page.textContent('#done-body');

  // Desktop width check.
  const wide = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  await wide.goto(URL);
  await wide.waitForTimeout(1200);
  await wide.screenshot({ path: path.join(OUT, '9-desktop.png') });

  // Horizontal overflow check on a small phone.
  const small = await browser.newPage({ viewport: { width: 320, height: 700 } });
  await small.goto(URL);
  await small.waitForTimeout(800);
  const overflow = await small.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth);
  await small.screenshot({ path: path.join(OUT, '10-small-phone.png') });

  await browser.close();

  console.log('\n--- UI checks ---');
  console.log('empty submit blocked ..... ' + (blocked ? 'PASS' : 'FAIL'));
  console.log('Next disabled pre-pick ... ' + (nextDisabledBefore ? 'PASS' : 'FAIL'));
  console.log('Next enabled post-pick ... ' + (!nextDisabledAfter ? 'PASS' : 'FAIL'));
  console.log('reached done screen ...... ' + (doneVisible ? 'PASS' : 'FAIL'));
  console.log('completion copy correct .. ' +
    (doneText.includes('revealed during the program') ? 'PASS' : 'FAIL'));
  console.log('no horizontal overflow ... ' + (!overflow ? 'PASS' : 'FAIL'));
  console.log('js errors ................ ' + (errors.length ? 'FAIL\n  ' + errors.join('\n  ') : 'none'));
  console.log('\nshots written to shots/');
})();
