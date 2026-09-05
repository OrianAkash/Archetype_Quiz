/* ============================================================
   ARCHETYPE QUIZ — Google Apps Script backend
   ------------------------------------------------------------
   This one file is your API *and* your database driver.
   The Google Sheet it lives in is the database.

   Endpoints once deployed as a Web App:

     POST  <url>                        submit a completed quiz
     GET   <url>?playerId=abc123        one participant's result
     GET   <url>?key=SECRET&all=1       every result (host view)
     GET   <url>?key=SECRET&summary=1   counts per archetype
     GET   <url>                        health check

   Setup order is in README.md — read that, not this comment.
   ============================================================ */


/* ---------- 1. Settings ----------------------------------- */

/** Guards the endpoints that return EVERYONE's data — real names
 *  and all — so a guest who finds the web app URL can't download
 *  the whole list mid-event.
 *
 *  !! LEAVE THIS PLACEHOLDER ALONE IN THE REPO !!
 *
 *  GitHub Pages needs a public repo on a free account, so anything
 *  committed here is readable by anyone on the internet. Set the
 *  real key ONLY inside the Apps Script editor, which is private to
 *  your Google account. This file is just the reference copy — the
 *  code that actually runs lives in Apps Script.
 *
 *  If you ever paste the real key here by accident: change it in
 *  Apps Script, redeploy, and treat the old one as burned. Deleting
 *  the commit is not enough — it stays in the history. */
var ADMIN_KEY = 'set-the-real-key-in-the-apps-script-editor-only';

/** The tab inside the spreadsheet. Created automatically. */
var SHEET_NAME = 'Responses';

/** Must match the `id` values in quiz-data.js, in the order you
 *  want the score columns to appear. */
var ARCHETYPE_IDS = ['redPanda', 'rats', 'monkey', 'hummingbird'];

var HEADERS = [
  'Timestamp',
  'PlayerId',
  'PlayerName',
  'RealName',
  'RedPandaScore',
  'RatsScore',
  'MonkeyScore',
  'HummingBirdScore',
  'PlayerArchetype',
  'Tie',
  'TiedWith',
  'Answers',
  'AnswerLabels'
];


/* ---------- 2. Write API ---------------------------------- */

function doPost(e) {
  var lock = LockService.getScriptLock();

  try {
    // Two people finishing at the same instant must not land on the
    // same row. 20s is plenty for a single append.
    lock.waitLock(20000);

    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'Empty request body.' });
    }

    var data = JSON.parse(e.postData.contents);

    if (!data.playerId)   return json({ ok: false, error: 'Missing playerId.' });
    if (!data.playerName) return json({ ok: false, error: 'Missing playerName.' });

    var sheet  = getSheet();
    var scores = data.scores || {};

    var row = [
      new Date(),
      String(data.playerId),
      String(data.playerName),
      String(data.realName || ''),
      Number(scores[ARCHETYPE_IDS[0]] || 0),
      Number(scores[ARCHETYPE_IDS[1]] || 0),
      Number(scores[ARCHETYPE_IDS[2]] || 0),
      Number(scores[ARCHETYPE_IDS[3]] || 0),
      String(data.archetypeLabel || data.archetype || ''),
      data.tie ? 'YES' : '',
      (data.tiedWith || []).join(', '),
      JSON.stringify(data.answers || []),
      (data.answerLabels || []).join(' | ')
    ];

    // The client retries a submission it couldn't confirm, so the same
    // playerId can arrive twice. Overwrite rather than duplicate.
    var existingRow = findRowByPlayerId(sheet, data.playerId);

    if (existingRow > 0) {
      sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
      return json({ ok: true, updated: true, playerId: data.playerId });
    }

    sheet.appendRow(row);
    return json({ ok: true, created: true, playerId: data.playerId });

  } catch (err) {
    return json({ ok: false, error: String(err) });

  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}


/* ---------- 3. Read API ----------------------------------- */

function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};

  try {
    // --- one participant, by id (safe to expose) ---
    if (params.playerId) {
      var record = getResult(params.playerId);
      if (!record) return json({ ok: false, error: 'No result for that playerId.' });
      return json({ ok: true, result: record });
    }

    // --- everything, admin only ---
    if (params.all) {
      if (params.key !== ADMIN_KEY) return json({ ok: false, error: 'Bad key.' });
      return json({ ok: true, results: getAllResults() });
    }

    // --- headline counts, admin only ---
    if (params.summary) {
      if (params.key !== ADMIN_KEY) return json({ ok: false, error: 'Bad key.' });

      var tally = {};
      var ties = 0;
      getAllResults().forEach(function (r) {
        tally[r.playerArchetype] = (tally[r.playerArchetype] || 0) + 1;
        if (r.tie) ties++;
      });
      return json({ ok: true, total: getAllResults().length, byArchetype: tally, ties: ties });
    }

    return json({ ok: true, status: 'Archetype quiz API is running.' });

  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}


/* ---------- 4. Sheet helpers ------------------------------ */

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
         .setFontWeight('bold')
         .setBackground('#2c2340')
         .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function findRowByPlayerId(sheet, playerId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  var ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(playerId)) return i + 2;
  }
  return -1;
}

function rowToObject(row) {
  return {
    timestamp:       row[0],
    playerId:        row[1],
    playerName:      row[2],
    realName:        row[3],
    scores: {
      redPanda:      row[4],
      rats:          row[5],
      monkey:        row[6],
      hummingbird:   row[7]
    },
    playerArchetype: row[8],
    tie:             row[9] === 'YES',
    tiedWith:        row[10] ? String(row[10]).split(', ') : [],
    answers:         safeParse(row[11])
  };
}

function safeParse(value) {
  try { return JSON.parse(value); } catch (e) { return []; }
}

function getResult(playerId) {
  var sheet = getSheet();
  var rowIndex = findRowByPlayerId(sheet, playerId);
  if (rowIndex < 0) return null;
  return rowToObject(sheet.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0]);
}

function getAllResults() {
  var sheet = getSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, HEADERS.length)
              .getValues()
              .map(rowToObject);
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}


/* ---------- 5. Run-by-hand utilities ---------------------- */
/* Pick these from the function dropdown in the Apps Script editor. */

/** Creates the Responses tab and headers. Run once after pasting. */
function setup() {
  getSheet();
  SpreadsheetApp.getActiveSpreadsheet().toast('Sheet ready.', 'Archetype quiz', 5);
}

/** Writes one fake row so you can check the columns line up. */
function addTestRow() {
  doPost({
    postData: {
      contents: JSON.stringify({
        playerId: 'test-' + Date.now(),
        playerName: 'Test Player',
        realName: 'Test Person',
        archetype: 'monkey',
        archetypeLabel: 'Monkey',
        scores: { redPanda: 7, rats: 9, monkey: 14, hummingbird: 6 },
        tie: false,
        tiedWith: [],
        answers: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1],
        answerLabels: ['sample answer']
      })
    }
  });
  SpreadsheetApp.getActiveSpreadsheet().toast('Test row added.', 'Archetype quiz', 5);
}

/** Prints the archetype spread to the execution log. */
function logSummary() {
  var tally = {};
  getAllResults().forEach(function (r) {
    tally[r.playerArchetype] = (tally[r.playerArchetype] || 0) + 1;
  });
  Logger.log(tally);
}
