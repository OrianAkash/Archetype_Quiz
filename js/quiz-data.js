/* ============================================================
   QUIZ CONTENT  —  this is the ONLY file you need to edit
   to swap in your real questions.
   ============================================================

   HOW SCORING WORKS
   -----------------
   Every option carries a `scores` object. When a player picks
   that option, those points are added to each archetype.
   At the end, the archetype with the most points wins.

   You can give an option points for more than one archetype.
   The placeholder set below uses "2 points to the main
   archetype, 1 point to a close cousin" — that spreads the
   scores out and makes exact ties much less likely.

   IMPORTANT — DON'T LEAK THE ANSWER
   ---------------------------------
   Option A is always the red button, B blue, C yellow, D green.
   If Red Panda were always option A, players would spot the
   pattern immediately. So the placeholder questions below
   deliberately shuffle which archetype sits in which slot.
   Keep doing that when you write the real ones.

   ADDING / REMOVING QUESTIONS
   ---------------------------
   Just add or delete objects in the `questions` array. The
   progress bar, page count and scoring all adapt on their own.
   Options per question can vary too (2, 3, 4 or 5 all work).
   ============================================================ */

const QUIZ_DATA = {

  /* ---- The four archetypes -------------------------------- */
  /* `id` is used in the scores objects and as the Sheet column
     order. Change `label` freely; changing `id` means updating
     every scores object below.                                */
  archetypes: [
    {
      id: 'redPanda',
      label: 'Red Panda',
      sprite: 'sprite-redpanda',
      blurb: 'Warm, watchful and unhurried. Happiest in a small circle with good snacks.'
    },
    {
      id: 'rats',
      label: 'Rats',
      sprite: 'sprite-rat',
      blurb: 'Resourceful and quietly everywhere. Fixes the problem before anyone notices it existed.'
    },
    {
      id: 'monkey',
      label: 'Monkey',
      sprite: 'sprite-monkey',
      blurb: 'Loud, funny and impossible to ignore. The reason the room is laughing.'
    },
    {
      id: 'hummingbird',
      label: 'Humming Bird',
      sprite: 'sprite-hummingbird',
      blurb: 'Bright, curious and always mid-flight. Three ideas ahead of the conversation.'
    }
  ],

  /* ---- Copy shown on the welcome + finish screens ---------- */
  meta: {
    title: 'Which One Are You?',
    subtitle: 'Ten quick questions. No wrong answers. Your archetype gets revealed later tonight.',
    startLabel: 'Start the quiz',
    finishHeading: "You're done!",
    finishBody: "You've completed the quiz! Your results have been recorded. Your archetype will be revealed during the program!"
  },

  /* ---- PLACEHOLDER QUESTIONS — swap these out -------------- */
  questions: [
    {
      text: "It's a free Saturday morning. What actually happens?",
      options: [
        { text: 'Out the door early — there are three places to be',
          scores: { hummingbird: 2, monkey: 1 } },
        { text: 'Slow coffee, blanket, nowhere to be',
          scores: { redPanda: 2, rats: 1 } },
        { text: 'Finally fixing the thing that has been annoying me',
          scores: { rats: 2, redPanda: 1 } },
        { text: 'Texting everyone to see who wants to do something',
          scores: { monkey: 2, hummingbird: 1 } }
      ]
    },
    {
      text: 'You walk into a room where you only know one person. You...',
      options: [
        { text: 'Find them, park next to them, stay a while',
          scores: { redPanda: 2, rats: 1 } },
        { text: 'Do a lap, say hi to everyone, land nowhere',
          scores: { hummingbird: 2, monkey: 1 } },
        { text: 'Start a bit with someone and let it escalate',
          scores: { monkey: 2, hummingbird: 1 } },
        { text: 'Clock the room first, then pick your moment',
          scores: { rats: 2, redPanda: 1 } }
      ]
    },
    {
      text: 'Group project. Which job do you end up with?',
      options: [
        { text: 'Presenting it — obviously',
          scores: { monkey: 2, hummingbird: 1 } },
        { text: 'The unglamorous half nobody else wanted',
          scores: { rats: 2, redPanda: 1 } },
        { text: 'Keeping everyone calm and fed',
          scores: { redPanda: 2, rats: 1 } },
        { text: 'Coming up with eleven ideas, six of them good',
          scores: { hummingbird: 2, monkey: 1 } }
      ]
    },
    {
      text: 'Long week. How do you recharge?',
      options: [
        { text: 'Somewhere new, even if it is just a different route home',
          scores: { hummingbird: 2, rats: 1 } },
        { text: 'People. Noise. A long dinner',
          scores: { monkey: 2, redPanda: 1 } },
        { text: 'A tidy room and an early night',
          scores: { rats: 2, hummingbird: 1 } },
        { text: 'One familiar film and zero obligations',
          scores: { redPanda: 2, monkey: 1 } }
      ]
    },
    {
      text: 'There is a snack table. Be honest.',
      options: [
        { text: 'I have already found the good stuff and told three people',
          scores: { rats: 2, monkey: 1 } },
        { text: 'One plate, one spot, no rush',
          scores: { redPanda: 2, hummingbird: 1 } },
        { text: 'Grazing. Constantly. Never a full plate',
          scores: { hummingbird: 2, rats: 1 } },
        { text: "I'm holding court next to it rather than eating",
          scores: { monkey: 2, redPanda: 1 } }
      ]
    },
    {
      text: 'Someone new joins your circle mid-conversation.',
      options: [
        { text: 'Immediately rope them into the joke',
          scores: { monkey: 2, hummingbird: 1 } },
        { text: 'Quietly shuffle over and make room',
          scores: { redPanda: 2, rats: 1 } },
        { text: 'Ask them four questions in ninety seconds',
          scores: { hummingbird: 2, monkey: 1 } },
        { text: 'Catch them up on what they missed',
          scores: { rats: 2, redPanda: 1 } }
      ]
    },
    {
      text: 'A trip is being planned. Your role?',
      options: [
        { text: 'The spreadsheet, the bookings, the backup plan',
          scores: { rats: 2, redPanda: 1 } },
        { text: 'I suggested it and I will suggest four more',
          scores: { hummingbird: 2, monkey: 1 } },
        { text: 'I show up when told and bring the snacks',
          scores: { redPanda: 2, rats: 1 } },
        { text: 'Morale. I am morale',
          scores: { monkey: 2, hummingbird: 1 } }
      ]
    },
    {
      text: 'Look around your room right now.',
      options: [
        { text: 'Cosy chaos, but I know where everything is',
          scores: { redPanda: 2, monkey: 1 } },
        { text: 'Genuinely a mess and I am rarely in it anyway',
          scores: { hummingbird: 2, monkey: 1 } },
        { text: 'Organised in a system only I understand',
          scores: { rats: 2, hummingbird: 1 } },
        { text: 'Whatever it looks like, people keep hanging out in it',
          scores: { monkey: 2, redPanda: 1 } }
      ]
    },
    {
      text: 'Surprise free hour. No plans, no phone.',
      options: [
        { text: 'Nap. Immediately. Unapologetically',
          scores: { redPanda: 2, rats: 1 } },
        { text: 'Go find out what is happening somewhere else',
          scores: { hummingbird: 2, monkey: 1 } },
        { text: 'Knock out three small things off the list',
          scores: { rats: 2, redPanda: 1 } },
        { text: 'Call someone and turn it into a whole thing',
          scores: { monkey: 2, hummingbird: 1 } }
      ]
    },
    {
      text: 'How would your friends describe you in one word?',
      options: [
        { text: 'Reliable',
          scores: { rats: 2, redPanda: 1 } },
        { text: 'Hilarious',
          scores: { monkey: 2, hummingbird: 1 } },
        { text: 'Calm',
          scores: { redPanda: 2, rats: 1 } },
        { text: 'Everywhere',
          scores: { hummingbird: 2, monkey: 1 } }
      ]
    }
  ]
};

/* Lets the test script require() this file under Node. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QUIZ_DATA;
}
