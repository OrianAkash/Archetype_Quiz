# Archetype Quiz

A Kahoot-styled personality quiz. Players answer one question per screen,
every answer adds points to four animal archetypes, and the result is saved
quietly to a Google Sheet so you can reveal it later during the program.

**There is no server to run and nothing to pay for.** A static site plus a
Google Apps Script web app plus a Sheet does the whole job.

```
  Phone browser              Google Apps Script            Google Sheet
  ┌──────────────┐   POST    ┌──────────────────┐         ┌────────────┐
  │  index.html  │ ────────► │   doPost()       │ ──────► │  Responses │
  │  (GitHub     │           │   doGet()        │ ◄────── │            │
  │   Pages)     │ ◄──────── │                  │  GET    └────────────┘
  └──────────────┘   JSON    └──────────────────┘
```

---

## Files

| File | What it is |
|---|---|
| `index.html` | The quiz — all five screens + the mascot SVGs |
| `qr-code.html` | **QR code maker + printable table sign** |
| `css/style.css` | Every style |
| `js/config.js` | **Your endpoint URL goes here** |
| `js/quiz-data.js` | **Your questions go here** |
| `js/scoring.js` | Pure scoring function |
| `js/app.js` | Screen flow, submission, retry queue |
| `js/qr.js` | QR encoder (offline, no dependencies) |
| `apps-script/Code.gs` | The API + database logic |
| `test/scoring.test.js` | Balance audit — run before the event |
| `test/mobile.audit.js` | Checks six phone sizes for overflow + tap targets |
| `test/ui.screens.js` | Clicks through the quiz and screenshots it |
| `test/qr.verify.js` + `qr_decode.py` | Proves the QR codes actually scan |
| `dist/quiz-standalone.html` | The whole quiz as one file, if you ever want it |

---

## Setup — about 15 minutes

### 1. Make the Sheet

1. Go to [sheets.new](https://sheets.new) and name it something like
   *Mixer Quiz Responses*.
2. **Extensions → Apps Script**.
3. Delete the placeholder `myFunction` code and paste in everything from
   `apps-script/Code.gs`.
4. Near the top, change `ADMIN_KEY` to a random string of your own. This is
   what stops a guest who finds the URL from downloading everyone's results
   mid-event.
5. Click **Save**, then pick `setup` from the function dropdown and **Run**.
   Approve the permission prompt (it will warn that the script is
   unverified — that is normal for your own scripts; choose *Advanced →
   Go to project*). A `Responses` tab with headers appears in the Sheet.

### 2. Deploy it as an API

1. **Deploy → New deployment**.
2. Gear icon → **Web app**.
3. Set:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**  ← must be "Anyone", not "Anyone with a
     Google account", or guests will hit a login wall
4. **Deploy**, then copy the Web app URL. It ends in `/exec`.

### 3. Point the site at it

Open `js/config.js` and paste the URL:

```js
endpoint: 'https://script.google.com/macros/s/AKfycb..../exec',
```

Leave it as `''` to run in demo mode — the quiz works but nothing is sent.

### 4. Put the site online

Any static host works. GitHub Pages, same as the Le Pet Shop reference:

1. New repo → upload every file, keeping the folder structure.
2. **Settings → Pages → Source: Deploy from a branch → main / (root)**.
3. Your quiz is at `https://<username>.github.io/<repo>/` in a minute or two.
4. Make the QR code — see below.

> **Redeploying:** after you edit `Code.gs`, use **Deploy → Manage
> deployments → pencil icon → Version: New version**. Creating a *new*
> deployment instead gives you a different URL and you would have to update
> `config.js` again.

---

## Working on this together

The repo has to be **public** — GitHub Pages only serves from private repos on
a paid plan. Public means anyone can read every file, so:

- **Never commit the real `ADMIN_KEY`.** It stays as the placeholder in
  `apps-script/Code.gs`; the real one is typed into the Apps Script editor,
  which is private to the Google account that owns the Sheet. That key is the
  only thing standing between a stranger and a list of everyone's real names.
- The endpoint URL in `js/config.js` is necessarily public — the browser has to
  call it. Worst case someone posts junk rows, which you can delete from the
  Sheet. Don't lose sleep over it.
- Nothing else here is sensitive. The questions and scoring being visible is
  fine; anyone determined enough to read `quiz-data.js` to game a party quiz
  has earned their archetype.

**Day-to-day, with two of you:**

1. **Fetch and pull before you start editing.** Every time. Most merge pain
   comes from skipping this.
2. **Split the files.** Two people editing `js/quiz-data.js` at once is the
   one collision that will actually happen — agree who owns the questions and
   who owns the look, or take turns.
3. **Commit in small, described chunks.** "Rewrote questions 4-7" beats
   "update".
4. If you do collide, GitHub Desktop will say so and show both versions. The
   file is plain text; pick the lines you want and commit the result.

Committing straight to `main` is fine for two people on something this size.
Branches and pull requests are worth it once you're afraid of breaking
something — not before.

---

## The QR code

Double-click **`qr-code.html`**. Paste your published quiz address, and you get
a scannable code plus an A4 table sign with the four mascots on it, ready to
print.

It runs entirely inside that one page — no website, no account, no internet.
The QR encoder is written into `js/qr.js` rather than loaded from anywhere, so
it still works if you end up making the sign in a hall with no wifi.

- **Error correction** defaults to High. That means up to 30% of the code can
  be obscured — a crease, a thumb, a coffee ring — and it still scans. Leave it
  on High for anything printed.
- **Print size** is shown in the panel. The rule of thumb is a code scans from
  about ten times its own width, so a sign read across a table wants roughly
  5–6 cm of QR. Bigger is always safer.
- **Download as SVG** if you're placing the code into a poster in Canva or
  Illustrator — it stays sharp at any size. PNG is fine for printing directly.

**Test it before you print fifty copies.** Scan the on-screen preview with your
own phone and check it opens the quiz. A QR code that encodes the wrong URL
looks exactly like one that encodes the right URL.

> The codes this produces were verified by rendering them and decoding them
> back with a real scanner library, at every error-correction level and across
> a range of URL lengths — `node test/qr.verify.js && python3 test/qr_decode.py`
> if you ever want to re-run that.

---

## On phones

The quiz is built for phones first, since that is how everyone will take it.

- Fits without scrolling on everything from a 320px folded phone up
- Tap targets are all at least 44px tall
- Text inputs are 17px, so iOS doesn't zoom in when someone taps the name field
- Uses `dvh` units, so the shrinking Safari address bar doesn't crop the page
- No sticky hover states, no double-tap zoom, no rubber-band overscroll
- **If a phone reloads mid-quiz** — backgrounded tab, accidental swipe — the
  answers come back and the player carries on where they left off. That resume
  is per browser tab, so a shared phone starts clean for the next person.
- Landscape works but scrolls; portrait is the intended orientation.

`node test/mobile.audit.js` re-runs those checks across six device sizes and
writes screenshots to `shots/mobile/`.

---

## Writing your real questions

Everything lives in `js/quiz-data.js`. Each option carries a `scores` object:

```js
{
  text: 'Slow coffee, blanket, nowhere to be',
  scores: { redPanda: 2, rats: 1 }
}
```

The placeholder set gives **2 points to the main archetype and 1 to a close
cousin**. That is deliberate: pure 2/0/0/0 scoring produces a lot of exact
ties. Add or delete questions freely — the progress bar, page count and
scoring all adapt on their own.

**One rule worth keeping:** option A is always the red button, B blue,
C yellow, D green. If Red Panda were always option A, people would crack the
pattern by question four. Shuffle which archetype sits in which slot, and
run the audit below to confirm you did.

### Check your questions before the event

```bash
node test/scoring.test.js
```

It walks **every possible combination of answers** and reports which
archetype each one produces. The current placeholder set:

```
redPanda      26.6%
rats          22.3%
monkey        27.6%
hummingbird   23.5%
```

Anything in roughly the 15–35% band is healthy. If one archetype is at 60%
you have accidentally written a quiz where everyone is a Monkey; if one is at
2% nobody will ever get it. The script also fails if an archetype is glued to
one answer position.

To see it in a browser with screenshots of each screen:

```bash
npm install playwright && node test/ui.screens.js
```

---

## Reading the results

The Sheet is the answer to most questions — sort or filter the
`PlayerArchetype` column and you have your reveal list.

The API is there when you want it. Replace `<url>` with your `/exec` URL:

| Request | Returns |
|---|---|
| `<url>?playerId=abc123` | One participant's full result |
| `<url>?key=YOURKEY&all=1` | Every result as JSON |
| `<url>?key=YOURKEY&summary=1` | Counts per archetype |
| `<url>` | Health check |

### Sheet columns

`Timestamp · PlayerId · PlayerName · RealName · RedPandaScore · RatsScore ·
MonkeyScore · HummingBirdScore · PlayerArchetype · Tie · TiedWith ·
Answers · AnswerLabels`

`Answers` keeps the raw option indexes, so if you ever change the scoring
weights you can recompute every past result rather than losing them.

---

## Things that will come up on the night

**Ties.** Two archetypes can finish level. The tiebreak is *whoever scored
across more questions* — a broad fit beats one lucky spike. It is
deterministic, so it never flip-flops. Any genuine tie is marked `YES` in the
**Tie** column with the contenders in **TiedWith**, so you can hand-pick
during the reveal instead of letting the code decide.

**Patchy wifi.** If a submission fails it is saved in that phone's browser
and retried the next time the page is opened, and the player sees an honest
"saved on this device" note rather than a false confirmation.

**Someone submits twice.** Rows are keyed on `playerId`, so a retry
overwrites rather than duplicating. Note that a player who fully reloads the
page gets a *new* id and will appear twice — dedupe on `RealName` if that
happens.

**A guest finds the Sheet URL.** They can't: the Sheet itself is private to
your Google account. The web app runs as *you*, which is how it writes
without the player needing to log in. Only the `playerId` lookup is public,
and it needs an id you'd have to already know.

**Nothing is arriving.** Check, in order: `config.js` has the `/exec` URL;
the deployment's access is set to **Anyone**; and you made a *new version*
after your last `Code.gs` edit. The browser console on the quiz page will
show the actual error.

---

## Customising the look

- **Colours** — the `:root` block at the top of `css/style.css`. `--brand`
  is the main button; `--ans-a` through `--ans-d` are the four answer
  colours (fixed by position, so they can never leak the scoring).
- **Mascots** — the four `<symbol>` blocks at the top of `index.html`.
  Flat vector, one `<symbol>` each; swap the `fill` values or drop in your
  own SVG.
- **Fonts** — Baloo 2 and Nunito, loaded from Google Fonts in `index.html`.
- **Copy** — the `meta` block in `js/quiz-data.js` holds the welcome and
  completion text.

Keyboard shortcuts are already wired up: **1–4** or **A–D** to answer,
**Enter** to advance. Handy if you ever run it off a laptop on the big
screen.
