// ═══════════════════════════════════════════════════
//  words.js — Word card browser for ALKATYE
//
//  WHAT: Displays Arrernte word cards one at a time.
//        Users can mark words as seen or favourite them.
//  HOW:  Reads ?tag=, ?pos=, and ?group= from the URL to filter words.
//        Special case: ?tag=favourite filters by localStorage.
//        All state stored in localStorage.
// ═══════════════════════════════════════════════════

import { WORDS }                                          from './words-data.js';
import { auth }                                           from './firebase-config.js';
import { onAuthStateChanged }                             from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { pullFromFirestore, syncSeen, syncFavourites, syncBookmarks } from './sync.js';

// Track the signed-in uid — null if not signed in
let currentUid = null;

onAuthStateChanged(auth, user => {
  currentUid = user ? user.uid : null;
  if (currentUid) pullFromFirestore(currentUid);
});


// ═══════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let words      = shuffle(WORDS);
let current    = 0;
let seenCounts = JSON.parse(localStorage.getItem('lexicon_seen')  || '{}');
let viewLog    = JSON.parse(localStorage.getItem('lexicon_log')   || '[]');

// Auto-seen timer — cancelled if the user navigates before 1.5s
let autoSeenTimer = null;

let favourites = new Set(JSON.parse(localStorage.getItem('lexicon_favourites') || '[]'));
let bookmarks  = new Set(JSON.parse(localStorage.getItem('lexicon_bookmarks')  || '[]'));


// ═══════════════════════════════════════════════════
//  AUTO-SEEN
//  Marks a word as seen after 1.5s of staying on the card.
// ═══════════════════════════════════════════════════

function scheduleAutoSeen(w) {
  if (autoSeenTimer) clearTimeout(autoSeenTimer);

  autoSeenTimer = setTimeout(() => {
    const now     = new Date();
    const isoNow  = now.toISOString();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (!seenCounts[w.word]) seenCounts[w.word] = { count: 0, lastSeen: null };
    seenCounts[w.word].count++;
    seenCounts[w.word].lastSeen = isoNow;
    viewLog.unshift({ word: w.word, time: timeStr, iso: isoNow });

    syncSeen(currentUid, seenCounts, viewLog);
    applyWord(w);
  }, 1500);
}


// ═══════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════

function renderCard(animate = false) {
  const card = document.getElementById('wordCard');
  const w    = words[current];
  if (animate) {
    card.classList.add('fade-out');
    setTimeout(() => { applyWord(w); card.classList.remove('fade-out'); }, 200);
  } else {
    applyWord(w);
  }
  scheduleAutoSeen(w);
}

function applyWord(w) {
  document.getElementById('wordText').textContent = w.word;
  document.getElementById('phonetic').textContent = w.phonetic || '';
  document.getElementById('posbadge').textContent = w.pos      || '';

  // Numbered definition list
  const defEl = document.getElementById('definition');
  const defs  = Array.isArray(w.definition) ? w.definition : [w.definition];
  defEl.innerHTML = defs
    .map((d, i) => `<span class="def-line"><span class="def-num">${i + 1}.</span> ${d}</span>`)
    .join('');

  // Examples — render each item in the array, hide container if none
  const examplesEl = document.getElementById('examples');
  if (examplesEl) {
    const exs = Array.isArray(w.examples) ? w.examples.filter(Boolean) : [];
    if (exs.length) {
      examplesEl.innerHTML = exs
        .map(e => `<p class="example">${e}</p>`)
        .join('');
      examplesEl.style.display = '';
    } else {
      examplesEl.innerHTML     = '';
      examplesEl.style.display = 'none';
    }
  }

  // Notes (optional field)
  const notesEl = document.getElementById('notes');
  if (notesEl) {
    if (w.notes) {
      notesEl.textContent  = w.notes;
      notesEl.style.display = '';
    } else {
      notesEl.textContent   = '';
      notesEl.style.display = 'none';
    }
  }

  // Tags
  const tags = document.getElementById('tagsContainer');
  tags.innerHTML = (w.tags || []).map(t => `<span class="tag">${t}</span>`).join('');

  // Seen badge
  const seenData  = seenCounts[w.word];
  const seenBadge = document.getElementById('seenBadge');
  if (seenData) {
    seenBadge.style.display = 'block';
    seenBadge.textContent   = `seen ${seenData.count}×`;
  } else {
    seenBadge.style.display = 'none';
  }

  // Favourite button
  const favBtn  = document.getElementById('favBtn');
  const favIcon = favBtn.querySelector('i');
  if (favourites.has(w.word)) {
    favIcon.className = 'fa-solid fa-heart';
    favBtn.classList.add('active');
  } else {
    favIcon.className = 'fa-regular fa-heart';
    favBtn.classList.remove('active');
  }

  // Bookmark button
  const bookmarkBtn = document.getElementById('bookmarkBtn');
  if (bookmarkBtn) {
    bookmarks.has(w.word)
      ? bookmarkBtn.classList.add('active')
      : bookmarkBtn.classList.remove('active');
  }

  // Prev / Next buttons
  document.getElementById('prevBtn').disabled = current === 0;
  document.getElementById('nextBtn').disabled = current === words.length - 1;

  // Progress bar
  const pct = ((current + 1) / words.length * 100).toFixed(0);
  document.getElementById('progressFill').style.width  = pct + '%';
  document.getElementById('progressLabel').textContent = `${current + 1} / ${words.length}`;

  // Header meta
  const totalSeen = Object.keys(seenCounts).length;
  document.getElementById('headerMeta').textContent =
    `${totalSeen} word${totalSeen !== 1 ? 's' : ''} studied`;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}


// ═══════════════════════════════════════════════════
//  ACTIONS
// ═══════════════════════════════════════════════════

function navigate(dir) {
  if (autoSeenTimer) clearTimeout(autoSeenTimer);
  current = Math.max(0, Math.min(words.length - 1, current + dir));
  renderCard(true);
}

function toggleFavourite() {
  const w       = words[current];
  const now     = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  let favLog    = JSON.parse(localStorage.getItem('lexicon_favourite_log') || '[]');

  if (favourites.has(w.word)) {
    favourites.delete(w.word);
    favLog = favLog.filter(e => e.word !== w.word);
    showToast('removed from favourites');
  } else {
    favourites.add(w.word);
    favLog.unshift({ word: w.word, time: timeStr, date: dateStr, iso: now.toISOString() });
    showToast('♥ added to favourites');
  }

  syncFavourites(currentUid, Array.from(favourites), favLog);
  renderCard();
}

function toggleBookmark() {
  const w       = words[current];
  const now     = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  let bmLog     = JSON.parse(localStorage.getItem('lexicon_bookmark_log') || '[]');

  if (bookmarks.has(w.word)) {
    bookmarks.delete(w.word);
    bmLog = bmLog.filter(e => e.word !== w.word);
    showToast('bookmark removed');
  } else {
    bookmarks.add(w.word);
    bmLog.unshift({ word: w.word, time: timeStr, date: dateStr, iso: now.toISOString() });
    showToast('🔖 bookmarked');
  }

  syncBookmarks(currentUid, Array.from(bookmarks), bmLog);
  renderCard();
}

/*
 * applyFilter — filters WORDS by group, tag, and/or pos from URL params.
 *
 * ?group=people  → matches words where w.groups includes 'people'
 * ?tag=beginner  → matches words where w.tags includes 'beginner'
 * ?pos=noun      → matches words where w.pos === 'noun'
 *
 * Special tag values:
 *   tag=favourite → filter by favourites set in localStorage
 *   tag=bookmark  → filter by bookmarks set in localStorage
 *   tag=all       → no tag filter (show everything)
 */
function applyFilter(group, tag, pos) {
  const filtered = WORDS.filter(w => {
    // ── Group filter (from Lexicon tiles in explore.html) ──────────────
    let groupMatch;
    if (!group || group === 'all') {
      groupMatch = true;
    } else {
      // w.groups is an array like ["people", "level"] — check if it includes the group
      groupMatch = Array.isArray(w.groups) && w.groups.includes(group);
    }

    // ── Tag filter (from Level tiles, or special favourite/bookmark) ───
    let tagMatch;
    if (!tag || tag === 'all') {
      tagMatch = true;
    } else if (tag === 'favourite') {
      tagMatch = favourites.has(w.word);
    } else if (tag === 'bookmark') {
      tagMatch = bookmarks.has(w.word);
    } else {
      tagMatch = Array.isArray(w.tags) && w.tags.includes(tag);
    }

    // ── Part-of-speech filter ──────────────────────────────────────────
    const posMatch = !pos || w.pos === pos;

    return groupMatch && tagMatch && posMatch;
  });

  words   = shuffle(filtered.length ? filtered : WORDS); // fallback to all if nothing matched
  current = 0;

  // Update the page heading to reflect the active filter
  const headingEl = document.querySelector('h2');
  if (headingEl) {
    if (group && group !== 'all') {
      headingEl.textContent = group.charAt(0).toUpperCase() + group.slice(1);
    } else if (tag && tag !== 'all') {
      headingEl.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
    } else if (pos) {
      headingEl.textContent = pos.charAt(0).toUpperCase() + pos.slice(1) + 's';
    } else {
      headingEl.textContent = 'Lexicon';
    }
  }

  renderCard();
}


// ═══════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════

document.getElementById('prevBtn').addEventListener('click', () => navigate(-1));
document.getElementById('nextBtn').addEventListener('click', () => navigate(1));
document.getElementById('favBtn').addEventListener('click', toggleFavourite);
document.getElementById('bookmarkBtn')?.addEventListener('click', toggleBookmark);

const params    = new URLSearchParams(window.location.search);
const startGroup = params.get('group') || null;   // ← NEW: read ?group=
const startTag   = params.get('tag')   || null;
const startPos   = params.get('pos')   || null;
const startWord  = params.get('word')  || null;

applyFilter(startGroup, startTag, startPos);

// If a specific word was requested via ?word=Kwatye, jump to it
if (startWord) {
  const idx = words.findIndex(w => w.word === startWord);
  if (idx !== -1) { current = idx; renderCard(); }
}