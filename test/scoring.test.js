/* ============================================================
   Scoring tests + question-balance audit.
   No dependencies. Run with:   node test/scoring.test.js
   ============================================================ */

const QUIZ_DATA = require('../js/quiz-data.js');
const { scoreQuiz } = require('../js/scoring.js');

let failures = 0;

function check(name, condition, detail) {
  if (condition) {
    console.log('  PASS  ' + name);
  } else {
    failures++;
    console.log('  FAIL  ' + name + (detail ? '\n        ' + detail : ''));
  }
}

const ids = QUIZ_DATA.archetypes.map(a => a.id);
const questions = QUIZ_DATA.questions;

console.log('\n=== 1. Data integrity ===\n');

check('at least one question exists', questions.length > 0);

let badIds = [];
let missingScores = [];
questions.forEach((q, qi) => {
  if (!q.text) missingScores.push('Q' + (qi + 1) + ' has no text');
  q.options.forEach((opt, oi) => {
    if (!opt.scores || Object.keys(opt.scores).length === 0) {
      missingScores.push('Q' + (qi + 1) + ' option ' + (oi + 1) + ' scores nothing');
    }
    Object.keys(opt.scores || {}).forEach(id => {
      if (!ids.includes(id)) badIds.push('Q' + (qi + 1) + ' option ' + (oi + 1) + ' -> "' + id + '"');
    });
  });
});

check('every option scores at least one archetype', missingScores.length === 0, missingScores.join('; '));
check('no option references an unknown archetype id', badIds.length === 0, badIds.join('; '));

const optionCounts = [...new Set(questions.map(q => q.options.length))];
check('every question has 2-5 options',
      questions.every(q => q.options.length >= 2 && q.options.length <= 5),
      'option counts found: ' + optionCounts.join(', '));


console.log('\n=== 2. Scoring behaviour ===\n');

const allA = questions.map(() => 0);
const rA = scoreQuiz(allA, QUIZ_DATA);
check('scoring returns a valid archetype id', ids.includes(rA.archetype));
check('scores object covers every archetype',
      ids.every(id => typeof rA.scores[id] === 'number'));

const empty = questions.map(() => null);
const rEmpty = scoreQuiz(empty, QUIZ_DATA);
check('all-skipped input does not crash and scores zero',
      ids.every(id => rEmpty.scores[id] === 0));
check('all-skipped input flags a tie', rEmpty.tie === true);

const partial = questions.map((q, i) => (i < 3 ? 0 : null));
const rPartial = scoreQuiz(partial, QUIZ_DATA);
check('partial answers score without error',
      Object.values(rPartial.scores).reduce((a, b) => a + b, 0) > 0);

const overflow = questions.map(() => 99);
const rOverflow = scoreQuiz(overflow, QUIZ_DATA);
check('out-of-range option indexes are ignored safely',
      ids.every(id => rOverflow.scores[id] === 0));

// Deliberate two-way tie: hand-build scores by picking mirrored answers.
const forced = scoreQuiz([], QUIZ_DATA);
check('empty answer array is handled', forced.scores[ids[0]] === 0);


console.log('\n=== 3. Can every archetype actually win? ===\n');

ids.forEach(target => {
  // Greedy: for each question pick whichever option gives `target` most.
  const greedy = questions.map(q => {
    let bestIndex = 0, bestPoints = -Infinity;
    q.options.forEach((opt, i) => {
      const pts = (opt.scores || {})[target] || 0;
      if (pts > bestPoints) { bestPoints = pts; bestIndex = i; }
    });
    return bestIndex;
  });
  const r = scoreQuiz(greedy, QUIZ_DATA);
  check(target + ' is reachable as a result', r.archetype === target,
        'greedy play produced "' + r.archetype + '" instead; scores ' +
        JSON.stringify(r.scores));
});


console.log('\n=== 4. Balance audit (exhaustive) ===\n');

// Walk every possible combination of answers and count who wins.
const wins = {};
const trueTies = {};
ids.forEach(id => { wins[id] = 0; });

let total = 0;
const counts = questions.map(q => q.options.length);
let combos = counts.reduce((a, b) => a * b, 1);

if (combos > 3_000_000) {
  console.log('  (skipped: ' + combos.toLocaleString() + ' combinations is too many)');
} else {
  const answers = new Array(questions.length).fill(0);
  let tieCount = 0;

  function walk(depth) {
    if (depth === questions.length) {
      const r = scoreQuiz(answers, QUIZ_DATA);
      wins[r.archetype]++;
      if (r.tie) tieCount++;
      total++;
      return;
    }
    for (let i = 0; i < counts[depth]; i++) {
      answers[depth] = i;
      walk(depth + 1);
    }
  }
  walk(0);

  console.log('  ' + total.toLocaleString() + ' possible answer combinations\n');
  const shares = {};
  ids.forEach(id => {
    const pct = (wins[id] / total) * 100;
    shares[id] = pct;
    const bar = '#'.repeat(Math.round(pct / 2));
    console.log('    ' + id.padEnd(14) + (pct.toFixed(1) + '%').padStart(6) + '  ' + bar);
  });

  const tiePct = (tieCount / total) * 100;
  console.log('\n    exact ties:  ' + tiePct.toFixed(1) + '% (auto-resolved, flagged in the Sheet)\n');

  const min = Math.min(...Object.values(shares));
  const max = Math.max(...Object.values(shares));

  check('no archetype is unreachable', min > 1,
        'lowest share is ' + min.toFixed(1) + '%');
  check('no archetype dominates (all under 45%)', max < 45,
        'highest share is ' + max.toFixed(1) + '%');
  check('spread between most and least common is under 25 points',
        (max - min) < 25,
        'spread is ' + (max - min).toFixed(1) + ' points');
}


console.log('\n=== 5. Position-bias audit ===\n');

// If one archetype kept landing in slot A, players would spot it.
const slotPrimary = {};
ids.forEach(id => { slotPrimary[id] = [0, 0, 0, 0, 0]; });

questions.forEach(q => {
  q.options.forEach((opt, slot) => {
    let top = null, topPts = 0;
    Object.entries(opt.scores || {}).forEach(([id, pts]) => {
      if (pts > topPts) { topPts = pts; top = id; }
    });
    if (top) slotPrimary[top][slot]++;
  });
});

let biased = [];
ids.forEach(id => {
  const row = slotPrimary[id].slice(0, 4);
  console.log('    ' + id.padEnd(14) + 'A:' + row[0] + '  B:' + row[1] +
              '  C:' + row[2] + '  D:' + row[3]);
  const maxInOneSlot = Math.max(...row);
  if (maxInOneSlot > questions.length * 0.6) {
    biased.push(id + ' sits in one slot ' + maxInOneSlot + '/' + questions.length + ' times');
  }
});

console.log('');
check('no archetype is glued to one answer position', biased.length === 0, biased.join('; '));


console.log('\n' + (failures === 0
  ? '=== ALL CHECKS PASSED ==='
  : '=== ' + failures + ' CHECK(S) FAILED ===') + '\n');

process.exit(failures === 0 ? 0 : 1);
