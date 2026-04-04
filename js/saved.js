/* =============================================================
   saved.js — Favourites & Bookmarks page logic for ALKATYE

   WHAT: Renders the favourited and bookmarked word lists from
         localStorage, matching the Word Log style on history.html.
   HOW:  Plain script (no modules). Reads lexicon_favourite_log
         and lexicon_bookmark_log written by words.js.
         Each log entry: { word, date, time, iso }
   WHY:  localStorage is the shared data layer; no server needed.
   ============================================================= */


/* =============================================================
   DATA
   ============================================================= */
let favLog      = JSON.parse(localStorage.getItem('lexicon_favourite_log')  || '[]');
let bookmarkLog = JSON.parse(localStorage.getItem('lexicon_bookmark_log')   || '[]');

// The raw Sets — used to clear both the log AND the Set key together
let favSet      = JSON.parse(localStorage.getItem('lexicon_favourites')     || '[]');
let bookmarkSet = JSON.parse(localStorage.getItem('lexicon_bookmarks')      || '[]');


/* =============================================================
   RENDERER — shared log-list builder
   - WHAT: Takes a log array and a container id; renders word rows
           in the same style as the Word Log on history.html
   - HOW:  Each entry shows: word name | date | time
           Empty state shown when the log has no entries.
   ============================================================= */
function renderSavedLog(log, containerId, emptyMsg) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!log.length) {
    container.innerHTML = `<div class="log-empty">${emptyMsg}</div>`;
    return;
  }

  const items = log.map(e => `
    <a class="log-item log-item--link" href="words.html?tag=all&word=${encodeURIComponent(e.word)}">
      <span class="log-word">${e.word}</span>
      <span class="log-count">${e.date || ''}</span>
      <span class="log-time">${e.time || ''}</span>
    </a>`
  ).join('');

  container.innerHTML = `<div class="log-list">${items}</div>`;
}


/* =============================================================
   CLEAR — favourites
   - WHAT: Wipes lexicon_favourite_log AND lexicon_favourites
   - WHY:  Both must go together — the Set and the log are linked
   ============================================================= */
function clearFavourites() {
  if (!favLog.length) return;
  if (!confirm('Clear all favourites?')) return;
  favLog  = [];
  favSet  = [];
  localStorage.removeItem('lexicon_favourite_log');
  localStorage.removeItem('lexicon_favourites');
  renderSavedLog(favLog, 'favLogContainer', 'no favourites yet — heart a word to save it here');
  showToast('favourites cleared');
}


/* =============================================================
   CLEAR — bookmarks
   - WHAT: Wipes lexicon_bookmark_log AND lexicon_bookmarks
   ============================================================= */
function clearBookmarks() {
  if (!bookmarkLog.length) return;
  if (!confirm('Clear all bookmarks?')) return;
  bookmarkLog = [];
  bookmarkSet = [];
  localStorage.removeItem('lexicon_bookmark_log');
  localStorage.removeItem('lexicon_bookmarks');
  renderSavedLog(bookmarkLog, 'bookmarkLogContainer', 'no bookmarks yet — bookmark a word to save it here');
  showToast('bookmarks cleared');
}


/* =============================================================
   TOAST
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
   ============================================================= */
document.getElementById('clearFavBtn')?.addEventListener('click', clearFavourites);
document.getElementById('clearBookmarkBtn')?.addEventListener('click', clearBookmarks);


/* =============================================================
   INIT
   ============================================================= */
renderSavedLog(favLog,      'favLogContainer',      'no favourites yet — heart a word to save it here');
renderSavedLog(bookmarkLog, 'bookmarkLogContainer', 'no bookmarks yet — bookmark a word to save it here');