/* ============================================================
   SCORING
   ------------------------------------------------------------
   One pure function. No DOM, no network — which is what makes
   it testable (see test/scoring.test.js) and safe to reuse.
   ============================================================ */

/**
 * Turn a list of picked option indexes into archetype scores.
 *
 * @param {number[]} answers  answers[i] = index of the option picked
 *                            for questions[i]. null/undefined = skipped.
 * @param {object}   data     the QUIZ_DATA object.
 * @returns {{scores:object, hits:object, archetype:string,
 *            archetypeLabel:string, tie:boolean, tiedWith:string[]}}
 */
function scoreQuiz(answers, data) {
  const ids = data.archetypes.map(a => a.id);

  const scores = {};
  const hits = {};              // how many questions each archetype scored on
  ids.forEach(id => { scores[id] = 0; hits[id] = 0; });

  answers.forEach((optIndex, qIndex) => {
    const question = data.questions[qIndex];
    if (!question) return;
    if (optIndex === null || optIndex === undefined) return;

    const option = question.options[optIndex];
    if (!option || !option.scores) return;

    Object.keys(option.scores).forEach(id => {
      if (!(id in scores)) return;          // ignore unknown archetype ids
      const points = Number(option.scores[id]) || 0;
      scores[id] += points;
      if (points > 0) hits[id] += 1;
    });
  });

  /* ---- pick a winner ------------------------------------------------
     1. highest total
     2. tie-break: whoever scored across the most questions (broad fit
        beats one lucky spike)
     3. still tied: first in the archetypes array, and we flag it so the
        host can pick by hand at the reveal.
     ------------------------------------------------------------------ */
  const top = Math.max(...ids.map(id => scores[id]));
  let candidates = ids.filter(id => scores[id] === top);
  const trueTie = candidates.length > 1;

  if (candidates.length > 1) {
    const mostHits = Math.max(...candidates.map(id => hits[id]));
    candidates = candidates.filter(id => hits[id] === mostHits);
  }

  const winner = candidates[0];
  const winnerMeta = data.archetypes.find(a => a.id === winner);

  return {
    scores,
    hits,
    archetype: winner,
    archetypeLabel: winnerMeta ? winnerMeta.label : winner,
    tie: trueTie,
    tiedWith: trueTie ? ids.filter(id => scores[id] === top) : []
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { scoreQuiz };
}
