/* Encodes a spread of URLs at every ECC level and dumps the matrices
   as JSON. test/qr_decode.py then renders and decodes each one with
   OpenCV — proving the encoder is correct, not merely plausible.

   node test/qr.verify.js && python3 test/qr_decode.py                */

const QR = require('../js/qr.js');
const fs = require('fs');
const path = require('path');

const CASES = [
  'https://orian.github.io/quiz/',
  'https://lynnledesign.github.io/le-pet-shop/',
  'https://orianakashilbc.github.io/personality-website/',
  'https://orianakashilbc.github.io/hope-mixer-personality-quiz/index.html',
  // A long one, to push into higher versions where alignment patterns
  // and the 16-bit character count kick in.
  'https://orianakashilbc.github.io/hope-mixer-personality-quiz/?utm_source=qr&utm_medium=print&utm_campaign=social-mixer-september-2026&table=7',
  'HELLO WORLD',
  'https://example.com/ünïcödé-tëst'
];

const LEVELS = ['L', 'M', 'Q', 'H'];

const out = [];
let built = 0;

for (const text of CASES) {
  for (const level of LEVELS) {
    let matrix;
    try {
      matrix = QR.encode(text, level);
    } catch (e) {
      out.push({ text, level, error: String(e.message) });
      continue;
    }
    out.push({
      text,
      level,
      version: matrix.version,
      mask: matrix.mask,
      size: matrix.length,
      rows: matrix.map(row => row.map(c => (c ? 1 : 0)).join(''))
    });
    built++;
  }
}

fs.writeFileSync(path.join(__dirname, 'qr-cases.json'), JSON.stringify(out));
console.log('built ' + built + ' QR matrices across ' + CASES.length +
            ' inputs x ' + LEVELS.length + ' ECC levels');

// Structural sanity that doesn't need a decoder.
let structural = 0;
for (const c of out) {
  if (c.error) continue;
  const expected = c.version * 4 + 17;
  if (c.size !== expected) {
    console.log('  FAIL size: v' + c.version + ' should be ' + expected + ', got ' + c.size);
    structural++;
  }
  // Finder pattern: top-left 7x7 must have a dark ring and dark centre.
  const m = c.rows.map(r => r.split('').map(Number));
  const finderOK = m[0].slice(0, 7).every(v => v === 1) &&
                   m[6].slice(0, 7).every(v => v === 1) &&
                   m[3][3] === 1 && m[1][1] === 0 && m[5][5] === 0;
  if (!finderOK) { console.log('  FAIL finder pattern at v' + c.version + '/' + c.level); structural++; }
}
console.log(structural === 0 ? 'structural checks: PASS' : 'structural checks: ' + structural + ' FAILED');
