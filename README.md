# Editing the quiz questions

Everything about the questions lives in one file:

```
Archetype_Quiz\js\quiz-data.js
```

That is the only file you need to open to change what the quiz asks.

> **Edit inside `Archetype_Quiz`.** If there is still an older
> `Personality Website` folder on the computer, it is a leftover copy that is
> not connected to GitHub. Edits made there will never reach the live site.

Open it in Visual Studio, VS Code, or even Notepad. It is a plain text file.

Everything else — Google Sheet, Apps Script, GitHub, the QR code — is in
**[SETUP.md](SETUP.md)**.

---

## What a question looks like

```js
{
  text: "It's a free Saturday morning. What actually happens?",
  options: [
    { text: 'Out the door early — there are three places to be',
      scores: { hummingbird: 2, monkey: 1 } },
    { text: 'Slow coffee, blanket, nowhere to be',
      scores: { turtle: 2, cat: 1 } },
    { text: 'Finally fixing the thing that has been annoying me',
      scores: { cat: 2, turtle: 1 } },
    { text: 'Texting everyone to see who wants to do something',
      scores: { monkey: 2, hummingbird: 1 } }
  ]
},
```

Three parts:

| Part | What it does |
|---|---|
| `text:` on the question | The question shown at the top of the screen |
| `text:` on an option | The wording on one of the coloured buttons |
| `scores:` | How many points that answer gives to each archetype |

---

## Changing the wording

Change what is between the quote marks. Nothing else.

```js
text: 'Slow coffee, blanket, nowhere to be',
```
becomes
```js
text: 'A slow morning with a good book',
```

**If your text contains an apostrophe**, wrap it in double quotes instead so
the apostrophe doesn't end the text early:

```js
text: "I'd rather be outside",     // double quotes — correct
text: 'I'd rather be outside',     // single quotes — BREAKS
```

That single mistake is the most common way to break the file.

---

## Adding a question

1. Find any existing question block — everything from `{` down to `},`
2. Copy the whole block, including the closing `},`
3. Paste it directly after another question
4. Rewrite the text and adjust the scores

Add as many as you like. **You do not need to update a count anywhere.** The
"Question 3 of 10" label, the progress bar and the scoring all read the list
and adjust themselves.

**The one comma that matters is the one between two questions.** The last
question in the file has no comma after it, so if you paste a new question
below it, the one that used to be last now needs its comma back:

```js
  {
    text: 'Used to be the last question',
    options: [ ... ]
  },                                  ← this comma is now required
  {
    text: 'The new last question',
    options: [ ... ]
  }
]
```

Leaving a comma on the very last one is harmless — browsers accept it. Missing
one *between* two questions is what breaks the file.

## Deleting a question

Delete the whole block from `{` down to its closing `},`.

## Reordering

Cut and paste whole blocks. Order in the file is the order players see.

---

## How the scoring works

The four archetypes, spelled exactly like this:

```
turtle        cat       monkey      hummingbird
```

All lower case, one word. These are case-sensitive — `Turtle` or `cats`
will not work, and the page will tell you so.

Every option hands out points:

```js
scores: { turtle: 2, cat: 1 }
```

That answer gives Turtle 2 points and Cat 1. At the end, whoever has the
most points wins, and that is the player's archetype.

### The 2-and-1 convention

Every option in the placeholder set gives **2 points to its main archetype and
1 to a close cousin**. Keep doing that.

The obvious alternative — 2 points to one archetype and nothing to anyone
else — sounds cleaner but produces far more exact ties, which means more
coin-flips when you are reading out results. Spreading a single point around
separates people much better.

You can give points to three archetypes, or give 3 points instead of 2, if a
particular answer really is that strong. Nothing breaks.

### The one rule that matters

**Option A is always the red button. B is blue, C is yellow, D is green.**

So if Turtle were always option A, people would notice by question four
and just pick the animal they want. Shuffle which archetype sits in which
position as you write.

Scan down the file and check you have not fallen into a pattern. There is a
script that checks this for you — see below.

---

## Changing the words on the welcome and finish screens

Also in `quiz-data.js`, near the top, in the `meta` block:

```js
meta: {
  title: 'Which One Are You?',
  subtitle: 'Ten quick questions. No wrong answers. ...',
  startLabel: 'Start the quiz',
  finishHeading: "You're done!",
  finishBody: "You've completed the quiz! Your results have been recorded. ..."
},
```

## Renaming an archetype

The `label` is what people see. The `id` is what the scoring uses.

```js
{
  id: 'turtle',              ← leave this alone
  label: 'Turtle',           ← change this freely
  sprite: 'sprite-turtle',   ← which drawing to use
  blurb: 'Comfort, warmth and good company...'
},
```

Changing a `label` is safe — it's only what players and the Sheet display.
Changing an `id` means updating every `scores` block that mentions it *and*
the `ARCHETYPE_IDS` and `HEADERS` lists in `apps-script/Code.gs`, so it is
rarely worth doing on your own.

---

## Checking your work

### The page tells you when something is wrong

Save the file, then open `index.html` by double-clicking it and refresh. If
something is broken you get a plain message naming the problem:

> **The questions need a fix**
> - Question 7, option B scores "turtel", which is not one of: turtle,
>   cat, monkey, hummingbird

It catches missing commas and quotes, misspelled archetype names, blank
options, and options that score nothing. If the quiz starts normally, the file
is fine.

You do not need to push to GitHub to test. Opening `index.html` from your own
disk runs the real quiz — it just won't record anything anywhere.

### Checking the balance

Once your real questions are written, if you have Node installed:

```bash
node test/scoring.test.js
```

This plays **every possible combination of answers** — over a million of
them — and reports how often each archetype comes out on top:

```
turtle      26.6%
cat          22.3%
monkey        27.6%
hummingbird   23.5%
```

Roughly **15–35% each** is healthy.

| What you see | What it means |
|---|---|
| One archetype at 60% | Too many answers point the same way — everyone will be a Monkey |
| One archetype at 2% | Nobody will ever get it — give it more strong answers |
| A "glued to one position" failure | One archetype keeps landing in the same lettered slot |

Worth running before the event. A quiz where nobody comes out a Hummingbird is
not obvious from reading the questions, but it is obvious from this.

---

## Putting your changes live

1. Save the file
2. Open **GitHub Desktop** — your edits appear in the left panel
3. Write a summary, e.g. *"Rewrote questions 4–7"*
4. **Commit to main**, then **Push origin**
5. Wait about a minute, then hard-refresh
   (**Ctrl+Shift+R**) at
   https://orianakash.github.io/Archetype_Quiz/

Browsers cache aggressively — if you don't see your change, hard-refresh
before assuming something went wrong.

### If two of you are editing

**Fetch and pull before you start.** Every time. Two people editing
`quiz-data.js` at the same time is the one collision that will actually
happen — agree who owns the questions and who owns the styling, or take
turns.

---

## Quick reference

| I want to… | Do this |
|---|---|
| Change a question | Edit the `text:` between the quotes |
| Add a question | Copy a whole `{ ... },` block, paste, rewrite |
| Remove a question | Delete the block including its comma |
| Reorder | Cut and paste whole blocks |
| Change which archetype an answer favours | Edit its `scores:` line |
| Rename an archetype | Change its `label`, not its `id` |
| Change the welcome or finish text | The `meta` block near the top |
| Use an apostrophe in text | Wrap the text in "double quotes" |
| Test it | Open `index.html` and refresh |
| Check the balance | `node test/scoring.test.js` |
| Publish | Commit and push in GitHub Desktop |
