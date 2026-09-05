/* Inlines css/ and js/ into single-file builds.
   node build-single.js  ->  dist/                                  */

const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('index.html');
const css  = read('css/style.css');

const js = ['js/config.js', 'js/quiz-data.js', 'js/scoring.js', 'js/app.js']
  .map(f => '/* ===== ' + f + ' ===== */\n' + read(f))
  .join('\n\n');

const FONT_LINK = /<link rel="preconnect"[\s\S]*?rel="stylesheet">/;
const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;700;800&display=swap');";

/* ---- 1. Standalone: a complete document, works from a file:// ---- */
let standalone = html
  .replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + css + '\n</style>')
  .replace(/<script src="js\/(config|quiz-data|scoring)\.js"><\/script>\s*/g, '')
  .replace('<script src="js/app.js"></script>', '<script>\n' + js + '\n</script>');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/quiz-standalone.html'), standalone);

/* ---- 2. Artifact page: no doctype/html/head/body wrapper -------- */
const bodyInner = standalone
  .slice(standalone.indexOf('<body>') + '<body>'.length,
         standalone.lastIndexOf('</body>'));

const title = (standalone.match(/<title>([\s\S]*?)<\/title>/) || [, 'Archetype Quiz'])[1];

const artifact =
  '<title>' + title + '</title>\n' +
  '<style>\n' + FONT_IMPORT + '\n' + css + '\n</style>\n' +
  bodyInner.replace(FONT_LINK, '').trim() + '\n';

fs.writeFileSync(path.join(root, 'dist/artifact-page.html'), artifact);

const kb = f => (fs.statSync(path.join(root, f)).size / 1024).toFixed(1) + ' KB';
console.log('dist/quiz-standalone.html  ' + kb('dist/quiz-standalone.html'));
console.log('dist/artifact-page.html    ' + kb('dist/artifact-page.html'));
