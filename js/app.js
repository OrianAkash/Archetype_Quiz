/* ============================================================
   APP — screen flow, question rendering, submission.
   Depends on: config.js, quiz-data.js, scoring.js
   ============================================================ */
(function () {
  'use strict';

  /* ---------- element lookups ------------------------------ */
  const $ = id => document.getElementById(id);

  const screens = {
    welcome:  $('screen-welcome'),
    name:     $('screen-name'),
    question: $('screen-question'),
    sending:  $('screen-sending'),
    done:     $('screen-done')
  };

  const els = {
    welcomeTitle:  $('welcome-title'),
    welcomeSub:    $('welcome-subtitle'),
    btnStart:      $('btn-start'),
    nameForm:      $('name-form'),
    inputPlayer:   $('input-player-name'),
    inputReal:     $('input-real-name'),
    fieldReal:     $('field-real-name'),
    errPlayer:     $('error-player-name'),
    errReal:       $('error-real-name'),
    progress:      $('progress'),
    progressLabel: $('progress-label'),
    progressFill:  $('progress-fill'),
    questionText:  $('question-text'),
    answers:       $('answers'),
    btnBack:       $('btn-back'),
    btnNext:       $('btn-next'),
    doneName:      $('done-name'),
    doneHeading:   $('done-heading'),
    doneBody:      $('done-body'),
    doneTag:       $('done-tag'),
    confetti:      $('confetti')
  };

  /* ---------- state ---------------------------------------- */
  const state = {
    playerId:   makeId(),
    playerName: '',
    realName:   '',
    answers:    new Array(QUIZ_DATA.questions.length).fill(null),
    index:      0,
    submitting: false
  };

  const STORAGE_KEY  = 'archetypeQuiz.pending';   // localStorage: failed sends
  const PROGRESS_KEY = 'archetypeQuiz.progress';  // sessionStorage: this attempt
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const SLOT_CLASS = ['answer--a', 'answer--b', 'answer--c', 'answer--d',
                      'answer--a', 'answer--b'];

  /* ============================================================
     Helpers
     ============================================================ */

  function makeId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'p-' + Date.now().toString(36) + '-' +
           Math.random().toString(36).slice(2, 10);
  }

  function show(name) {
    Object.values(screens).forEach(s => s.classList.remove('is-active'));
    screens[name].classList.add('is-active');
    window.scrollTo(0, 0);
  }

  /* localStorage can throw (private mode, blocked cookies, embedded
     previews). Every access goes through these two, and the quiz
     works perfectly well if both silently do nothing. */
  function storeGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function storeSet(key, value) {
    try { window.localStorage.setItem(key, value); return true; }
    catch (e) { return false; }
  }

  /* Progress uses sessionStorage on purpose, not localStorage. A phone
     gets passed around at a mixer — session scope means a reload resumes
     your own quiz, but a fresh tab starts clean for the next person. */
  function saveProgress() {
    try {
      window.sessionStorage.setItem(PROGRESS_KEY, JSON.stringify({
        playerId:   state.playerId,
        playerName: state.playerName,
        realName:   state.realName,
        answers:    state.answers,
        index:      state.index
      }));
    } catch (e) { /* private mode — progress just won't survive a reload */ }
  }

  function clearProgress() {
    try { window.sessionStorage.removeItem(PROGRESS_KEY); } catch (e) {}
  }

  function restoreProgress() {
    let saved;
    try { saved = JSON.parse(window.sessionStorage.getItem(PROGRESS_KEY) || 'null'); }
    catch (e) { return false; }

    if (!saved || !saved.playerName) return false;
    // Question count changed since they started — the saved answers no
    // longer line up with the questions, so don't pretend they do.
    if (!Array.isArray(saved.answers) ||
        saved.answers.length !== QUIZ_DATA.questions.length) {
      clearProgress();
      return false;
    }

    state.playerId   = saved.playerId || state.playerId;
    state.playerName = saved.playerName;
    state.realName   = saved.realName || '';
    state.answers    = saved.answers;
    state.index      = Math.min(saved.index || 0, QUIZ_DATA.questions.length - 1);
    return true;
  }

  /* ============================================================
     Welcome
     ============================================================ */

  els.welcomeTitle.textContent = QUIZ_DATA.meta.title;
  els.welcomeSub.textContent   = QUIZ_DATA.meta.subtitle;
  els.btnStart.textContent     = QUIZ_DATA.meta.startLabel;

  if (!CONFIG.askRealName) els.fieldReal.hidden = true;
  if (!CONFIG.showProgress) els.progress.style.display = 'none';

  els.btnStart.addEventListener('click', () => {
    show('name');
    setTimeout(() => els.inputPlayer.focus(), 260);
  });

  /* ============================================================
     Name form
     ============================================================ */

  function markInvalid(input, errorEl, isBad) {
    input.classList.toggle('is-invalid', isBad);
    errorEl.classList.toggle('is-shown', isBad);
  }

  els.nameForm.addEventListener('submit', e => {
    e.preventDefault();

    const player = els.inputPlayer.value.trim();
    const real   = CONFIG.askRealName ? els.inputReal.value.trim() : '';

    const badPlayer = player.length === 0;
    const badReal   = CONFIG.askRealName && real.length === 0;

    markInvalid(els.inputPlayer, els.errPlayer, badPlayer);
    if (CONFIG.askRealName) markInvalid(els.inputReal, els.errReal, badReal);

    if (badPlayer) { els.inputPlayer.focus(); return; }
    if (badReal)   { els.inputReal.focus();   return; }

    state.playerName = player;
    state.realName   = real;

    state.index = 0;
    saveProgress();
    renderQuestion();
    show('question');
  });

  [els.inputPlayer, els.inputReal].forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('is-invalid');
      const err = input === els.inputPlayer ? els.errPlayer : els.errReal;
      err.classList.remove('is-shown');
    });
  });

  /* ============================================================
     Questions
     ============================================================ */

  function renderQuestion() {
    const total = QUIZ_DATA.questions.length;
    const q = QUIZ_DATA.questions[state.index];

    els.progressLabel.textContent = 'Question ' + (state.index + 1) + ' of ' + total;
    // (index + 1) so question 1 already shows a sliver of progress —
    // an empty bar on the first screen reads as broken.
    els.progressFill.style.width = (((state.index + 1) / total) * 100) + '%';

    els.questionText.textContent = q.text;

    els.answers.innerHTML = '';
    q.options.forEach((option, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'answer ' + (SLOT_CLASS[i] || 'answer--a');
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', state.answers[state.index] === i ? 'true' : 'false');
      if (state.answers[state.index] === i) btn.classList.add('is-picked');

      const glyph = document.createElement('span');
      glyph.className = 'answer__glyph';
      const letter = document.createElement('span');
      letter.textContent = LETTERS[i] || (i + 1);
      glyph.appendChild(letter);

      const label = document.createElement('span');
      label.className = 'answer__text';
      label.textContent = option.text;

      btn.append(glyph, label);
      btn.addEventListener('click', () => pick(i));
      els.answers.appendChild(btn);
    });

    // display:none, not visibility:hidden — otherwise the hidden Back
    // button keeps its slot and shoves Next off-centre on question 1.
    const showBack = CONFIG.allowBack && state.index > 0;
    els.btnBack.style.display = showBack ? '' : 'none';
    els.btnNext.disabled = state.answers[state.index] === null;
    els.btnNext.textContent =
      state.index === total - 1 ? 'Finish' : 'Next';
  }

  function pick(optionIndex) {
    state.answers[state.index] = optionIndex;

    els.answers.querySelectorAll('.answer').forEach((btn, i) => {
      const on = i === optionIndex;
      btn.classList.toggle('is-picked', on);
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
    });

    els.btnNext.disabled = false;
    saveProgress();
  }

  els.btnNext.addEventListener('click', () => {
    if (state.answers[state.index] === null) return;

    if (state.index < QUIZ_DATA.questions.length - 1) {
      state.index += 1;
      saveProgress();
      renderQuestion();
      screens.question.classList.remove('is-active');
      void screens.question.offsetWidth;      // restart the pop animation
      screens.question.classList.add('is-active');
    } else {
      finish();
    }
  });

  els.btnBack.addEventListener('click', () => {
    if (state.index === 0) return;
    state.index -= 1;
    saveProgress();
    renderQuestion();
  });

  /* Keyboard: 1-4 or A-D to answer, Enter to advance. */
  document.addEventListener('keydown', e => {
    if (!screens.question.classList.contains('is-active')) return;
    const q = QUIZ_DATA.questions[state.index];

    const numeric = parseInt(e.key, 10);
    if (numeric >= 1 && numeric <= q.options.length) { pick(numeric - 1); return; }

    const alphaIndex = LETTERS.indexOf(e.key.toUpperCase());
    if (alphaIndex > -1 && alphaIndex < q.options.length) { pick(alphaIndex); return; }

    if (e.key === 'Enter' && !els.btnNext.disabled) els.btnNext.click();
  });

  /* ============================================================
     Finish + submit
     ============================================================ */

  function buildPayload() {
    const result = scoreQuiz(state.answers, QUIZ_DATA);

    return {
      playerId:       state.playerId,
      playerName:     state.playerName,
      realName:       state.realName,
      archetype:      result.archetype,
      archetypeLabel: result.archetypeLabel,
      scores:         result.scores,
      tie:            result.tie,
      tiedWith:       result.tiedWith,
      answers:        state.answers,
      answerLabels:   state.answers.map((optIndex, qIndex) => {
        const q = QUIZ_DATA.questions[qIndex];
        if (!q || optIndex === null) return '';
        return (q.options[optIndex] || {}).text || '';
      }),
      questionCount:  QUIZ_DATA.questions.length,
      clientTime:     new Date().toISOString()
    };
  }

  async function finish() {
    if (state.submitting) return;
    state.submitting = true;

    els.progressFill.style.width = '100%';
    const payload = buildPayload();

    show('sending');

    const outcome = await submit(payload);

    els.doneName.textContent    = 'Thanks, ' + state.playerName + '!';
    els.doneHeading.textContent = QUIZ_DATA.meta.finishHeading;
    els.doneBody.textContent    = QUIZ_DATA.meta.finishBody;

    if (outcome === 'queued') {
      els.doneTag.textContent = 'Saved on this device — it will send when you\'re back online';
      els.doneTag.classList.add('tag--warn');
    } else if (outcome === 'demo') {
      els.doneTag.textContent = 'Demo mode — nothing was sent (see the console)';
      els.doneTag.classList.add('tag--warn');
    } else {
      els.doneTag.textContent = 'Sit tight — no peeking';
    }

    clearProgress();
    show('done');
    confetti();
    state.submitting = false;
  }

  /**
   * Returns 'sent' | 'queued' | 'demo'.
   *
   * Apps Script and CORS: sending as text/plain keeps this a "simple"
   * request, so the browser skips the preflight OPTIONS that Apps
   * Script cannot answer. If the response still can't be read, we
   * resend with mode:'no-cors' — the script receives it fine, we just
   * can't see the reply, which is an acceptable trade at a mixer.
   */
  async function submit(payload) {
    if (!CONFIG.endpoint) {
      console.log('[DEMO MODE] nothing sent. Payload was:', payload);
      console.table(payload.scores);
      return 'demo';
    }

    const body = JSON.stringify(payload);

    try {
      const res = await fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: body,
        redirect: 'follow'
      });
      if (res.ok) return 'sent';
      throw new Error('HTTP ' + res.status);
    } catch (err) {
      console.warn('Readable POST failed, retrying fire-and-forget:', err);
    }

    try {
      await fetch(CONFIG.endpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: body
      });
      return 'sent';
    } catch (err) {
      console.error('Submission failed, queueing locally:', err);
    }

    if (CONFIG.retryFailedSubmissions) queue(payload);
    return 'queued';
  }

  function queue(payload) {
    let pending = [];
    try { pending = JSON.parse(storeGet(STORAGE_KEY) || '[]'); } catch (e) { pending = []; }
    pending.push(payload);
    storeSet(STORAGE_KEY, JSON.stringify(pending));
  }

  /* On load, try to flush anything stranded by an earlier drop-out. */
  async function flushQueue() {
    if (!CONFIG.endpoint || !CONFIG.retryFailedSubmissions) return;

    let pending = [];
    try { pending = JSON.parse(storeGet(STORAGE_KEY) || '[]'); } catch (e) { return; }
    if (!pending.length) return;

    const stillPending = [];
    for (const payload of pending) {
      try {
        await fetch(CONFIG.endpoint, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
      } catch (e) {
        stillPending.push(payload);
      }
    }
    storeSet(STORAGE_KEY, JSON.stringify(stillPending));
    if (pending.length !== stillPending.length) {
      console.log('Flushed ' + (pending.length - stillPending.length) + ' queued submission(s).');
    }
  }

  /* ============================================================
     Confetti
     ============================================================ */

  function confetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const colours = ['#ef4d5c', '#2f95dd', '#f4a72c', '#3fb56d', '#ff5f7e', '#8b5cf6'];
    const frag = document.createDocumentFragment();

    for (let i = 0; i < 64; i++) {
      const bit = document.createElement('i');
      bit.style.left            = Math.random() * 100 + 'vw';
      bit.style.background      = colours[i % colours.length];
      bit.style.animationDelay  = (Math.random() * 1.4) + 's';
      bit.style.animationDuration = (2.6 + Math.random() * 2.2) + 's';
      bit.style.transform       = 'rotate(' + (Math.random() * 360) + 'deg)';
      if (i % 3 === 0) bit.style.borderRadius = '50%';
      frag.appendChild(bit);
    }
    els.confetti.appendChild(frag);
    setTimeout(() => { els.confetti.innerHTML = ''; }, 7000);
  }

  /* ============================================================
     Go
     ============================================================ */

  flushQueue();

  /* A phone browser can drop a backgrounded tab at any moment. If this
     one comes back mid-quiz, put them where they left off rather than
     making them start over. */
  if (restoreProgress()) {
    renderQuestion();
    show('question');
  }

  /* Belt and braces: warn before a refresh, since restore only covers
     the same tab. */
  window.addEventListener('beforeunload', e => {
    const started = state.answers.some(a => a !== null);
    const finished = screens.done.classList.contains('is-active');
    if (started && !finished) { e.preventDefault(); e.returnValue = ''; }
  });

  /* Save on the way out too — pagehide is the one event iOS reliably
     fires when a tab is backgrounded or discarded. */
  window.addEventListener('pagehide', () => {
    const started = state.answers.some(a => a !== null);
    if (started && !screens.done.classList.contains('is-active')) saveProgress();
  });

})();
