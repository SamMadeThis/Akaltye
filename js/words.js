// ═══════════════════════════════════════════════════
//  words.js — Word card browser for AKALTYE
//
//  WHAT: Displays Arrernte word cards one at a time.
//        Users can mark words as seen or favourite them.
//  HOW:  Reads ?tag=, ?pos=, and ?group= from the URL to filter.
//        Special case: ?tag=favourite filters by localStorage.
//        All state stored in localStorage.
//
//  ANIMATIONS:
//    - Card flip on next/prev (CSS keyframes, content swaps mid-flip)
//    - Heart particle burst on favourite (JS-spawned CSS particles)
//    - Milestone celebration at 10 / 25 / 50 / 100 words seen
// ═══════════════════════════════════════════════════

import { WORDS }                                          from './words-data.js';
import { auth }                                           from './firebase-config.js';
import { onAuthStateChanged }                             from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { pullFromFirestore, syncSeen, syncFavourites, syncBookmarks } from './sync.js';

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
let autoSeenTimer = null;
let favourites = new Set(JSON.parse(localStorage.getItem('lexicon_favourites') || '[]'));
let bookmarks  = new Set(JSON.parse(localStorage.getItem('lexicon_bookmarks')  || '[]'));


// ═══════════════════════════════════════════════════
//  MILESTONE CELEBRATION
//  Shows a full-screen overlay at 10, 25, 50, 100 unique words seen.
//  Each milestone only ever fires once (tracked in localStorage).
// ═══════════════════════════════════════════════════

const MILESTONES = [
  {
    count: 10,
    emoji: '🌱',
    message: 'You\'ve started something special.',
    sub: '10 words learned'
  },
  {
    count: 25,
    emoji: '✨',
    message: 'A quarter-century of words — keep going.',
    sub: '25 words learned'
  },
  {
    count: 50,
    emoji: '🔥',
    message: 'Fifty words. You\'re building real knowledge.',
    sub: '50 words learned'
  },
  {
    count: 100,
    emoji: '🌟',
    message: 'One hundred words. Truly remarkable.',
    sub: '100 words learned'
  },
];

// Milestones already shown — persisted so they never repeat
let shownMilestones = new Set(
  JSON.parse(localStorage.getItem('lexicon_milestones_shown') || '[]')
);

function checkMilestone(totalSeen) {
  const milestone = MILESTONES.find(
    m => totalSeen >= m.count && !shownMilestones.has(m.count)
  );
  if (!milestone) return;

  // Mark as shown immediately so rapid re-renders don't double-fire
  shownMilestones.add(milestone.count);
  localStorage.setItem(
    'lexicon_milestones_shown',
    JSON.stringify([...shownMilestones])
  );

  showMilestone(milestone);
}

function showMilestone({ count, emoji, message, sub }) {
  // Build overlay
  const overlay = document.createElement('div');
  overlay.className = 'milestone-overlay';
  overlay.innerHTML = `
    <div class="milestone-card">
      <span class="milestone-ring"></span>
      <span class="milestone-ring"></span>
      <div class="milestone-emoji">${emoji}</div>
      <div class="milestone-count">${count}</div>
      <div class="milestone-label">words studied</div>
      <div class="milestone-message">${message}</div>
      <div class="milestone-sub">tap anywhere to continue</div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Dismiss on tap/click — fade out then remove
  function dismiss() {
    overlay.classList.add('hiding');
    overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
  }

  overlay.addEventListener('click', dismiss);

  // Auto-dismiss after 4.5s if user doesn't tap
  setTimeout(dismiss, 4500);
}


// ═══════════════════════════════════════════════════
//  AUTO-SEEN
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

    const totalSeen = Object.keys(seenCounts).length;
    checkMilestone(totalSeen);

    applyWord(w);
  }, 1500);
}


// ═══════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════

let isFlipping = false;

/*
 * renderCard
 * dir: 'next' | 'prev' | null
 *   null  → no animation (initial load, filter change, fav toggle)
 *   'next'/'prev' → 3D flip, content swaps at the mid-point (90°)
 */
function renderCard(dir = null) {
  const card = document.getElementById('wordCard');
  const w    = words[current];

  if (!dir) {
    applyWord(w);
    scheduleAutoSeen(w);
    return;
  }

  if (isFlipping) return;
  isFlipping = true;

  const flipClass = dir === 'next' ? 'flip-next' : 'flip-prev';
  card.classList.add(flipClass);

  // Swap content at the exact mid-point of the flip (half of 420ms)
  setTimeout(() => applyWord(w), 210);

  card.addEventListener('animationend', () => {
    card.classList.remove(flipClass);
    isFlipping = false;
    scheduleAutoSeen(w);
  }, { once: true });
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

  // Examples
  const examplesEl = document.getElementById('examples');
  if (examplesEl) {
    const exs = Array.isArray(w.examples) ? w.examples.filter(Boolean) : [];
    if (exs.length) {
      examplesEl.innerHTML = exs.map(e => `<p class="example">${e}</p>`).join('');
      examplesEl.style.display = '';
    } else {
      examplesEl.innerHTML     = '';
      examplesEl.style.display = 'none';
    }
  }

  // Notes
  const notesEl = document.getElementById('notes');
  if (notesEl) {
    if (w.notes) {
      notesEl.textContent   = w.notes;
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

  // Favourite button state
  const favBtn  = document.getElementById('favBtn');
  const favIcon = favBtn.querySelector('i');
  if (favourites.has(w.word)) {
    favIcon.className = 'fa-solid fa-heart';
    favBtn.classList.add('active');
  } else {
    favIcon.className = 'fa-regular fa-heart';
    favBtn.classList.remove('active');
  }

  // Bookmark button state
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
//  HEART PARTICLE BURST
// ═══════════════════════════════════════════════════

const PARTICLE_COLOURS = [
  '#B87333', // ochre
  '#c9afc2', // primary mauve
  '#8B2500', // earth red
  '#e8a44a', // warm gold
  '#d5c0cf', // light mauve
  '#e06030', // burnt orange
];

function burstParticles(btn) {
  const rect    = btn.getBoundingClientRect();
  const originX = rect.left + rect.width  / 2;
  const originY = rect.top  + rect.height / 2;
  const fragments = [];

  for (let i = 0; i < 14; i++) {
    const el       = document.createElement('span');
    el.className   = 'fav-particle';
    const angle    = (i / 14) * 360 + (Math.random() - 0.5) * 25;
    const distance = 28 + Math.random() * 38;
    const rad      = (angle * Math.PI) / 180;
    const size     = 5 + Math.random() * 6;

    el.style.width      = size + 'px';
    el.style.height     = size + 'px';
    el.style.background = PARTICLE_COLOURS[Math.floor(Math.random() * PARTICLE_COLOURS.length)];
    el.style.setProperty('--tx', Math.cos(rad) * distance + 'px');
    el.style.setProperty('--ty', Math.sin(rad) * distance + 'px');
    el.style.animationDelay = Math.random() * 0.08 + 's';
    el.style.position   = 'fixed';
    el.style.left       = (originX - size / 2) + 'px';
    el.style.top        = (originY - size / 2) + 'px';
    el.style.zIndex     = '9999';

    document.body.appendChild(el);
    fragments.push(el);
  }

  // Pulse ring
  const ring         = document.createElement('span');
  ring.className     = 'fav-ring';
  ring.style.position = 'fixed';
  ring.style.left     = (originX - 22) + 'px';
  ring.style.top      = (originY - 22) + 'px';
  ring.style.zIndex   = '9999';
  document.body.appendChild(ring);
  fragments.push(ring);

  // Spring pop on the heart icon
  btn.classList.remove('heart-pop');
  void btn.offsetWidth;
  btn.classList.add('heart-pop');
  btn.addEventListener('animationend', () => btn.classList.remove('heart-pop'), { once: true });

  setTimeout(() => fragments.forEach(el => el.remove()), 900);
}


// ═══════════════════════════════════════════════════
//  ACTIONS
// ═══════════════════════════════════════════════════

function navigate(dir) {
  if (autoSeenTimer) clearTimeout(autoSeenTimer);
  current = Math.max(0, Math.min(words.length - 1, current + dir));
  renderCard(dir > 0 ? 'next' : 'prev');
}

function toggleFavourite() {
  const w       = words[current];
  const now     = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  let favLog    = JSON.parse(localStorage.getItem('lexicon_favourite_log') || '[]');

  const isAdding = !favourites.has(w.word);

  if (!isAdding) {
    favourites.delete(w.word);
    favLog = favLog.filter(e => e.word !== w.word);
    showToast('removed from favourites');
  } else {
    favourites.add(w.word);
    favLog.unshift({ word: w.word, time: timeStr, date: dateStr, iso: now.toISOString() });
    showToast('♥ added to favourites');
    burstParticles(document.getElementById('favBtn'));
  }

  syncFavourites(currentUid, Array.from(favourites), favLog);

  // Update button state without re-rendering the whole card
  const favBtn  = document.getElementById('favBtn');
  const favIcon = favBtn.querySelector('i');
  if (favourites.has(w.word)) {
    favIcon.className = 'fa-solid fa-heart';
    favBtn.classList.add('active');
  } else {
    favIcon.className = 'fa-regular fa-heart';
    favBtn.classList.remove('active');
  }
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

  const bookmarkBtn = document.getElementById('bookmarkBtn');
  if (bookmarkBtn) {
    bookmarks.has(w.word)
      ? bookmarkBtn.classList.add('active')
      : bookmarkBtn.classList.remove('active');
  }
}

function applyFilter(group, tag, pos) {
  const filtered = WORDS.filter(w => {
    let groupMatch;
    if (!group || group === 'all') {
      groupMatch = true;
    } else {
      groupMatch = Array.isArray(w.groups) && w.groups.includes(group);
    }

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

    const posMatch = !pos || w.pos === pos;
    return groupMatch && tagMatch && posMatch;
  });

  words   = shuffle(filtered.length ? filtered : WORDS);
  current = 0;

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

  renderCard(null);
}


// ═══════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════

document.getElementById('prevBtn').addEventListener('click', () => navigate(-1));
document.getElementById('nextBtn').addEventListener('click', () => navigate(1));
document.getElementById('favBtn').addEventListener('click', toggleFavourite);
document.getElementById('bookmarkBtn')?.addEventListener('click', toggleBookmark);

// Keyboard navigation
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') navigate(1);
  if (e.key === 'ArrowLeft')  navigate(-1);
});

const params     = new URLSearchParams(window.location.search);
const startGroup = params.get('group') || null;
const startTag   = params.get('tag')   || null;
const startPos   = params.get('pos')   || null;
const startWord  = params.get('word')  || null;

applyFilter(startGroup, startTag, startPos);

if (startWord) {
  const idx = words.findIndex(w => w.word === startWord);
  if (idx !== -1) { current = idx; renderCard(null); }
}