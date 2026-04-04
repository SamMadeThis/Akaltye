/* =============================================================
   history.js — History page logic for ALKATYE

   WHY:  Separating JS from HTML keeps behaviour independent
         of structure; the HTML file only describes layout.
   HOW:  Loaded as a plain <script> in history.html (no modules
         needed — reads localStorage only, no Firebase imports).
   WHAT: Renders the word view log and quiz results log from
         localStorage; handles clear actions for each section.
   ============================================================= */


/* =============================================================
   DATA — read from localStorage
   - WHAT: Loads the two log arrays and the seen-count map
           written by words.js and quiz.js
   - HOW:  JSON.parse with empty fallbacks so the page works
           even on a first visit with no stored data
   - WHY:  localStorage is the shared data layer between pages;
           no server or Firebase read needed on this page
   ============================================================= */
let seenCounts = JSON.parse(localStorage.getItem('lexicon_seen')     || '{}');
let viewLog    = JSON.parse(localStorage.getItem('lexicon_log')       || '[]');
let quizLog    = JSON.parse(localStorage.getItem('lexicon_quiz_log')  || '[]');


/* =============================================================
   WORD VIEW LOG RENDERER
   - WHAT: Builds and injects the list of studied words into
           #wordLogContainer
   - HOW:  De-duplicates entries (shows each word once, most
           recent first) with total seen count from seenCounts;
           falls back to an empty-state message if log is empty
   - WHY:  Deduplication prevents repetitive rows when a word
           has been marked seen multiple times; total count from
           seenCounts is always accurate regardless of how many
           log entries exist
   ============================================================= */
function renderWordLog() {
  const container = document.getElementById('wordLogContainer');
  if (!container) return;

  if (!viewLog.length) {
    container.innerHTML = '<div class="log-empty">no words logged yet — go study some words first!</div>';
    return;
  }

  /* De-dupe: build a Set of seen words as we map; skip duplicates */
  const seen  = {};
  const items = viewLog.map(e => {
    if (seen[e.word]) return null;
    seen[e.word] = true;
    const count = seenCounts[e.word]?.count || 1;
    return `
      <div class="log-item">
        <span class="log-word">${e.word}</span>
        <span class="log-count">${count}×</span>
        <span class="log-time">${e.time}</span>
      </div>`;
  }).filter(Boolean).join('');

  container.innerHTML = `<div class="log-list">${items}</div>`;
}


/* =============================================================
   QUIZ LOG RENDERER
   - WHAT: Builds and injects the list of completed quizzes into
           #quizLogContainer
   - HOW:  Maps each quiz entry to a row with a colour-coded
           score bar (green ≥80%, amber ≥50%, red <50%);
           bar width is set via inline style (JS-controlled)
   - WHY:  The bar gives instant visual performance feedback
           without needing to read numbers; colour coding matches
           the app's success/warning/danger semantic palette
   ============================================================= */
function renderQuizLog() {
  const container = document.getElementById('quizLogContainer');
  if (!container) return;

  if (!quizLog.length) {
    container.innerHTML = '<div class="log-empty">no quizzes yet — go to Practice to start one!</div>';
    return;
  }

  /*
   * Colour the score bar based on performance:
   *   ≥ 80% → success green
   *   ≥ 50% → warning amber
   *   < 50% → danger red
   * Using CSS custom properties keeps colours consistent with
   * the global palette defined in styles.css
   */
  const barColour = pct =>
    pct >= 80 ? 'var(--clr-success-a0)'
    : pct >= 50 ? 'var(--clr-warning-a0)'
    : 'var(--clr-danger-a0)';

  const items = quizLog.map(e => {
    const pct = Math.round(e.score / e.total * 100);
    return `
      <div class="quiz-log-item">

        <div class="quiz-log-top">
          <span class="quiz-log-mode">${e.mode}</span>
          <span class="quiz-log-date">${e.date} ${e.time}</span>
        </div>

        <div class="quiz-log-bottom">
          <div class="quiz-log-bar-track">
            <div class="quiz-log-bar-fill"
                 style="width:${pct}%; background:${barColour(pct)};">
            </div>
          </div>
          <span class="quiz-log-score">${e.score}/${e.total}</span>
        </div>

      </div>`;
  }).join('');

  container.innerHTML = `<div class="log-list">${items}</div>`;
}


/* =============================================================
   CLEAR ACTIONS
   - WHAT: Wipe one or both logs from localStorage and re-render
   - HOW:  confirm() dialog prevents accidental deletion;
           removes the relevant localStorage key(s) and resets
           the in-memory array before calling the renderer
   - WHY:  Separate clear buttons per section so quiz history
           can be kept while word log is cleared (and vice versa)
   ============================================================= */

/*
 * clearWordLog — removes word view log and seen-count map
 * - WHAT: Clears lexicon_log + lexicon_seen from localStorage
 * - WHY:  Both must be cleared together; seen counts are only
 *         meaningful alongside the log that generated them
 */
function clearWordLog() {
  if (!viewLog.length) return;
  if (!confirm('Clear your word view log?')) return;
  viewLog    = [];
  seenCounts = {};
  localStorage.removeItem('lexicon_seen');
  localStorage.removeItem('lexicon_log');
  renderWordLog();
  showToast('word log cleared');
}

/*
 * clearQuizLog — removes quiz history from localStorage
 * - WHAT: Clears lexicon_quiz_log only
 * - WHY:  Quiz history is independent of word study history;
 *         separate clear keeps user control granular
 */
function clearQuizLog() {
  if (!quizLog.length) return;
  if (!confirm('Clear your quiz history?')) return;
  quizLog = [];
  localStorage.removeItem('lexicon_quiz_log');
  renderQuizLog();
  showToast('quiz history cleared');
}


/* =============================================================
   TOAST NOTIFICATION
   - WHAT: Briefly shows a small confirmation message at the
           bottom of the screen (e.g. "word log cleared")
   - HOW:  Adds .show class for 1.8s; CSS handles the fade
           and transform animation
   - WHY:  Non-blocking feedback so the user knows the action
           succeeded without a modal interruption
   ============================================================= */
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}


/* =============================================================
   EVENT WIRING
   - WHAT: Attaches clear button listeners using optional chaining
           so missing elements don't throw errors
   - HOW:  ?. operator — if the button doesn't exist, addEventListener
           is simply not called
   - WHY:  Defensive wiring allows history.js to be included on
           pages that may only show one of the two sections
   ============================================================= */
document.getElementById('clearWordBtn')?.addEventListener('click', clearWordLog);
document.getElementById('clearQuizBtn')?.addEventListener('click', clearQuizLog);


/* =============================================================
   INITIALISATION — render both logs on page load
   ============================================================= */
renderWordLog();
renderQuizLog();