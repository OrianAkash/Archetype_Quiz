/* ============================================================
   CONFIG  —  edit this after you deploy the Apps Script.
   ============================================================ */

const CONFIG = {

  /* Paste the Apps Script Web App URL here. It looks like:
     https://script.google.com/macros/s/AKfycb.....X/exec

     Leave it as an empty string to run in DEMO MODE: the quiz
     works end to end but nothing is sent anywhere, and the
     scores get logged to the browser console instead. Handy
     for testing the questions before you wire up the Sheet. */
  endpoint: '',

  /* Ask for the player's real name as well as a display name.
     Set to false if you only want one name field. */
  askRealName: true,

  /* Show a "Question 3 of 10" counter and progress bar. */
  showProgress: true,

  /* Let players go back and change an earlier answer. */
  allowBack: true,

  /* If the network drops mid-event, unsent submissions are kept
     in the browser and retried. Set false to disable. */
  retryFailedSubmissions: true
};
