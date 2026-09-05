# Setup and everything else

Editing the questions is in **[README.md](README.md)**. This file covers the
Google Sheet, the Apps Script backend, GitHub, the QR code, and what to expect
on the night.

Live site: https://orianakash.github.io/Archetype_Quiz/
Repo: https://github.com/OrianAkash/Archetype_Quiz

---

## How it works

**There is no server to run and nothing to pay for.** A static site, a Google
Apps Script web app, and a Sheet do the whole job.

```
  Phone browser              Google Apps Script            Google Sheet
  ┌──────────────┐   POST    ┌──────────────────┐         ┌────────────┐
  │  index.html  │ ────────► │   doPost()       │ ──────► │  Responses │
  │  (GitHub     │           │   doGet()        │ ◄────── │            │
  │   Pages)     │ ◄──────── │                  │  GET    └────────────┘
  └──────────────┘   JSON    └──────────────────┘
```

## Files

| File | What it is |
|---|---|
| `index.html` | The quiz — all five screens + the mascot SVGs |
| `qr-code.html` | QR code maker + printable table sign |
| `css/style.css` | Every style |
| `js/config.js` | **Your endpoint URL goes here** |
| `js/quiz-data.js` | **Your questions go here** — see README.md |
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

## Connecting the Sheet — about 15 minutes

**Until this is done the quiz runs in demo mode: it works end to end but
nothing is recorded anywhere.**

### 1. Make the Sheet

1. Go to [sheets.new](https://sheets.new) and name it something like
   *Mixer Quiz Responses*.
2. **Extensions → Apps Script**.
3. Delete the placeholder `myFunction` code and paste in everything from
   `apps-script/Code.gs`.
4. Change `ADMIN_KEY` to a random string of your own — **in the Apps Script
   editor only**, see the security note below.
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

Leave it as `''` to stay in demo mode.

Commit and push, then take the quiz yourself and check a row lands in the
Sheet.

> **Redeploying:** after you edit `Code.gs`, use **Deploy → Manage
> deployments → pencil icon → Version: New version**. Creating a *new*
> deployment gives you a different URL and you would have to update
> `config.js` again.

---

## Security — read this before your friend touches `Code.gs`

The repo is **public**, because GitHub Pages only serves from a private repo
on a paid plan. Public means anyone on the internet can read every file here.

- **Never commit the real `ADMIN_KEY`.** It stays as the placeholder in
  `apps-script/Code.gs`. The real one is typed into the Apps Script editor,
  which is private to the Google account that owns the Sheet. That key is the
  only thing standing between a stranger and a list of everyone's real names.
- If it gets committed by accident: change it in Apps Script and redeploy.
  Deleting the commit is *not* enough — it stays in the history.
- The endpoint URL in `js/config.js` is necessarily public; the browser has to
  call it. Worst case someone posts junk rows, which you delete from the
  Sheet.
- Nothing else here is sensitive. The questions and scoring being visible is
  fine — anyone determined enough to read `quiz-data.js` to game a party quiz
  has earned their archetype.

## Working together

1. **Fetch and pull before you start editing.** Every time. Most merge pain
   comes from skipping this.
2. **Split the files.** Agree who owns the questions and who owns the look.
3. **Commit in small, described chunks.** "Rewrote questions 4–7" beats
   "update".
4. If you do collide, GitHub Desktop shows both versions. It is plain text;
   pick the lines you want and commit the result.

Committing straight to `main` is fine for two people on something this size.
Branches and pull requests are worth it once you are afraid of breaking
something — not before.

To add a collaborator: repo → **Settings → Collaborators → Add people**.

---

## The QR code

Double-click **`qr-code.html`**. Paste your published quiz address and you get
a scannable code plus an A4 table sign with the four mascots on it, ready to
print.

It runs entirely inside that one page — no website, no account, no internet.
The QR encoder is written into `js/qr.js` rather than loaded from anywhere, so
it still works if you end up making the sign in a hall with no wifi.

- **Error correction** defaults to High: up to 30% of the code can be
  obscured — a crease, a thumb, a coffee ring — and it still scans. Leave it
  on High for anything printed.
- **Print size** is shown in the panel. A code scans from about ten times its
  own width, so a sign read across a table wants roughly 5–6 cm of QR. Bigger
  is always safer.
- **Download as SVG** if you are placing the code into a poster in Canva or
  Illustrator — it stays sharp at any size. PNG is fine for printing directly.

**Test it before you print fifty copies.** Scan the on-screen preview with
your own phone and check it opens the quiz. A QR code that encodes the wrong
URL looks exactly like one that encodes the right URL.

> These codes were verified by rendering them and decoding them back with a
> real scanner library, at every error-correction level and across a range of
> URL lengths — `node test/qr.verify.js && python3 test/qr_decode.py` to
> re-run it.

---

## On phones

Phones are the primary target, since that is how everyone will take it.

- Fits without scrolling on everything from a 320px folded phone up
- Tap targets are all at least 44px tall
- Text inputs are 17px, so iOS doesn't zoom in when someone taps the name field
- Uses `dvh` units, so the shrinking Safari address bar doesn't crop the page
- No sticky hover states, no double-tap zoom, no rubber-band overscroll
- **If a phone reloads mid-quiz** — backgrounded tab, accidental swipe — the
  answers come back and the player carries on where they left off. That resume
  is per browser tab, so a shared phone starts clean for the next person.
- Landscape works but scrolls; portrait is the intended orientation.

`node test/mobile.audit.js` re-runs those checks across six device sizes.

---

## Reading the results

The Sheet answers most questions — sort or filter the `PlayerArchetype`
column and you have your reveal list.

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

**Patchy wifi.** If a submission fails it is saved in that phone's browser and
retried the next time the page is opened, and the player sees an honest "saved
on this device" note rather than a false confirmation.

**Someone submits twice.** Rows are keyed on `playerId`, so a retry overwrites
rather than duplicating. A player who fully reloads the page gets a *new* id
and will appear twice — dedupe on `RealName` if that happens.

**A guest finds the Sheet URL.** They can't: the Sheet is private to your
Google account. The web app runs as *you*, which is how it writes without the
player needing to log in. Only the `playerId` lookup is public, and it needs
an id you would have to already know.

**Nothing is arriving.** Check, in order: `config.js` has the `/exec` URL; the
deployment's access is set to **Anyone**; and you made a *new version* after
your last `Code.gs` edit. The browser console on the quiz page shows the
actual error.

---

## Customising the look

- **Colours** — the `:root` block at the top of `css/style.css`. `--brand` is
  the main button; `--ans-a` through `--ans-d` are the four answer colours
  (fixed by position, so they can never leak the scoring).
- **Mascots** — the four `<symbol>` blocks at the top of `index.html`. Flat
  vector, one `<symbol>` each; swap the `fill` values or drop in your own SVG.
  They are duplicated in `qr-code.html` so that file works standalone — change
  both if you redraw them.
- **Fonts** — Baloo 2 and Nunito, loaded from Google Fonts in `index.html`.

Keyboard shortcuts are wired up: **1–4** or **A–D** to answer, **Enter** to
advance. Handy if you ever run it off a laptop on the big screen.
