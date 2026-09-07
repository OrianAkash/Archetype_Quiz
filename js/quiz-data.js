/* ============================================================
   QUIZ CONTENT  —  this is the ONLY file you need to edit
   to change the questions. See README.md for a full guide.

   13 questions, written by Orian. Scoring is exactly as
   specified in the source document.

   NOTE ON OPTION ORDER
   --------------------
   The source document lists every option in the same order:
   Red Panda, Rats, Monkey, Humming Bird. Option A is always
   the red button, so that would have made the red button
   "Red Panda" on all thirteen questions — players spot that
   pattern fast and just pick the animal they want.

   The options below are the same options with the same
   scores, reordered so each archetype lands in each colour
   slot exactly twice across the 4-option questions. Nothing
   else changed.
   ============================================================ */

const QUIZ_DATA = {

  /* ---- The four archetypes -------------------------------- */
  archetypes: [
    {
      id: 'redPanda',
      label: 'Red Panda',
      sprite: 'sprite-redpanda',
      blurb: 'Comfort, warmth and good company. Treasures the simple moments and the people in them.'
    },
    {
      id: 'rats',
      label: 'Rats',
      sprite: 'sprite-rat',
      blurb: 'Driven and self-improving. Satisfied by progress, effort and getting visibly better at things.'
    },
    {
      id: 'monkey',
      label: 'Monkey',
      sprite: 'sprite-monkey',
      blurb: 'Fun, novelty and momentum. Chasing the next new thing and the story that comes out of it.'
    },
    {
      id: 'hummingbird',
      label: 'Humming Bird',
      sprite: 'sprite-hummingbird',
      blurb: 'Creative and deeply feeling. Drawn to beauty, expression and things that mean something.'
    }
  ],

  /* ---- Copy shown on the welcome + finish screens ---------- */
  meta: {
    title: 'Which One Are You?',
    subtitle: 'Thirteen quick questions. No wrong answers. Your archetype gets revealed during the program.',
    startLabel: 'Start the quiz',
    finishHeading: "You're done!",
    finishBody: "You've completed the quiz! Your results have been recorded. Your archetype will be revealed during the program!"
  },

  /* ---- Questions ------------------------------------------ */
  questions: [
    {
      // Q1
      text: "It's a Saturday morning, and you wake up earlier than expected. What's the first thing you think of doing?",
      options: [
        { text: 'Grab a yummy breakfast~',
          scores: { redPanda: 1 } },
        { text: 'Hit the gym bright and early!',
          scores: { rats: 1 } },
        { text: "Go to that new spot you've found and try something new…",
          scores: { monkey: 1 } },
        { text: 'Take it slow, put on a vinyl playlist',
          scores: { hummingbird: 1 } }
      ]
    },
    {
      // Q2
      text: "It's your first day in school, and you don't know anyone in your orientation group… What usually happens?",
      options: [
        { text: "You're the first one to start a conversation or a topic.",
          scores: { rats: 1 } },
        { text: "You quickly become part of the group's energy and start joking around.",
          scores: { monkey: 1 } },
        { text: "You don't necessarily talk first, but once something interests you, you become very engaged.",
          scores: { hummingbird: 1 } },
        { text: 'You naturally start chatting with someone nearby and find common ground.',
          scores: { redPanda: 1 } }
      ]
    },
    {
      // Q3
      text: 'Which feeling is the most satisfying?',
      options: [
        { text: '“That was so much fun, we should do that again”',
          scores: { monkey: 1 } },
        { text: "“I made something I'm genuinely proud of”",
          scores: { hummingbird: 1 } },
        { text: '“Today was such a nice day”',
          scores: { redPanda: 1 } },
        { text: "“I'm actually getting better at this”",
          scores: { rats: 1 } }
      ]
    },
    {
      // Q4
      text: "You can only choose ONE kind of satisfaction… What's your pick?",
      options: [
        { text: "I did my best and I'm so proud of myself for that",
          scores: { rats: 3, monkey: 1 } },
        { text: 'Everyone I care about is happy, and I got to share that with them',
          scores: { redPanda: 3, hummingbird: 1 } }
      ]
    },
    {
      // Q5
      text: 'What kind of memories do you treasure the most?',
      options: [
        { text: 'Simple moments that felt warm and meaningful',
          scores: { redPanda: 2, hummingbird: 2 } },
        { text: 'The crazy stories you still laugh about',
          scores: { monkey: 2, redPanda: 1 } },
        { text: 'Moments where you felt proud of yourself or someone else',
          scores: { rats: 2, hummingbird: 1 } }
      ]
    },
    {
      // Q6
      text: 'What usually makes you want to keep doing something?',
      options: [
        { text: 'I can see myself getting better',
          scores: { rats: 2, monkey: 1 } },
        { text: "I'm curious about what happens next",
          scores: { monkey: 2, hummingbird: 1 } },
        { text: "I'm enjoying myself and don't feel pressured",
          scores: { redPanda: 2, hummingbird: 1 } }
      ]
    },
    {
      // Q7
      text: "It's a family reunion! What do you enjoy most?",
      options: [
        { text: "Hearing everyone's stories and reminiscing on how things have changed",
          scores: { hummingbird: 1 } },
        { text: 'Having the best comfort food cooked by grandma',
          scores: { redPanda: 1 } },
        { text: 'Playing games and seeing who wins',
          scores: { rats: 2 } },
        { text: 'Recounting funny memories and laughing together',
          scores: { monkey: 1 } }
      ]
    },
    {
      // Q8
      text: 'What do you wish to have more of in our world today?',
      options: [
        { text: 'More art and ways to express myself',
          scores: { hummingbird: 3, redPanda: 1 } },
        { text: 'More fun things to do and discover',
          scores: { monkey: 3, rats: 1 } }
      ]
    },
    {
      // Q9
      text: 'You suddenly have a whole afternoon free. What would make you feel like you spent it well?',
      options: [
        { text: 'Finding a nice place to chill and treating myself to something good',
          scores: { redPanda: 1 } },
        { text: "Getting lost in a hobby, playlist, or something I've been inspired to make",
          scores: { hummingbird: 1 } },
        { text: "Finally getting around to something I've been meaning to improve at",
          scores: { rats: 1 } },
        { text: "Going somewhere I've never been and seeing where the day takes me",
          scores: { monkey: 1 } }
      ]
    },
    {
      // Q10
      text: 'Your friends are all free this weekend, but no one has made plans yet. What are you most likely to say?',
      options: [
        { text: 'Guys… shall we go on a hike?',
          scores: { monkey: 1 } },
        { text: 'Do yall wanna try this new cafe I found?',
          scores: { redPanda: 1 } },
        { text: "Let's watch a movie this weekend!",
          scores: { hummingbird: 1 } },
        { text: 'Guys… shall we go do something active this weekend?',
          scores: { rats: 1 } }
      ]
    },
    {
      // Q11
      text: 'Which would you rather have?',
      options: [
        { text: 'A life that feels comfortable, fulfilling, and surrounded by people I love',
          scores: { redPanda: 2, hummingbird: 2 } },
        { text: 'A life full of growth, new experiences, and things I can look back on proudly',
          scores: { monkey: 2, rats: 2 } }
      ]
    },
    {
      // Q12
      text: 'What type of song sticks to you the most?',
      options: [
        { text: 'One that reminds me of people I love',
          scores: { hummingbird: 1 } },
        { text: 'A song that gets me pumped for the rest of the day',
          scores: { rats: 1 } },
        { text: "Something that surprises me… Like a song that's completely different from what I usually listen to",
          scores: { monkey: 1 } },
        { text: 'Something I can really relate to',
          scores: { redPanda: 1 } }
      ]
    },
    {
      // Q13
      text: 'At the end of a really good day, what makes you think “that was worth it”?',
      options: [
        { text: 'I accomplished something and feel like I made progress.',
          scores: { rats: 2 } },
        { text: "I did something exciting that I'll remember for a long time.",
          scores: { monkey: 2 } },
        { text: 'I got to relax, enjoy myself, and spend time with people I love.',
          scores: { redPanda: 2 } },
        { text: 'I experienced something beautiful, creative, or emotionally meaningful.',
          scores: { hummingbird: 2 } }
      ]
    }
  ]
};

/* Lets the test script require() this file under Node. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QUIZ_DATA;
}
