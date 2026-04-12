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
//    - Slide-and-replace on next/prev (two card slots, lateral slide)
//    - Heart particle burst on favourite (JS-spawned CSS particles)
//    - Milestone celebration at 10 / 25 / 50 / 100 words seen
//
//  RECENT CHANGES:
//    [1] syncViewportHeight() — makes the card viewport resize to
//        fit each card's content so nothing gets clipped. Called
//        after initial load and after each slide completes.
//    [2] Clickable tags — tag chips link to words.html?tag=X
//    [3] Clickable POS badge — links to words.html?pos=X
//    [4] 105% inStart gap — small visual gap between cards as they slide
// ═══════════════════════════════════════════════════

import { getWords }                                        from './words-service.js';
import { auth }                                            from './firebase-config.js';
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

/* WORDS is populated by the async init below */
let WORDS = [];
let words      = [];
let current    = 0;
let seenCounts = JSON.parse(localStorage.getItem('lexicon_seen')  || '{}');
let viewLog    = JSON.parse(localStorage.getItem('lexicon_log')   || '[]');
let autoSeenTimer = null;
let favourites = new Set(JSON.parse(localStorage.getItem('lexicon_favourites') || '[]'));
let bookmarks  = new Set(JSON.parse(localStorage.getItem('lexicon_bookmarks')  || '[]'));


// ═══════════════════════════════════════════════════
//  SLIDE-AND-REPLACE SETUP
//  Two card elements sit in a clipped viewport wrapper.
//  The active card is always at left:0. On navigate,
//  the incoming card enters from off-screen and both
//  slide together using a CSS left transition.
//  Content is swapped onto the inactive card before
//  the slide begins so it's never visible mid-render.
// ═══════════════════════════════════════════════════

const SLIDE_DURATION = 220; // ms
let sliding    = false;
let activeSlot = 'A'; // tracks which card element is currently on-screen

function slotEl(id) {
  return document.getElementById('wordCard' + id);
}

function inactiveSlot() {
  return activeSlot === 'A' ? 'B' : 'A';
}

// ─────────────────────────────────────────────────
//  [CHANGE 1] syncViewportHeight
//  The card-viewport wrapper is position:relative with
//  overflow:hidden, which means it won't automatically
//  grow to fit the active card's content (since the
//  cards are position:absolute inside it).
//  This function measures the active card's full rendered
//  height and sets the viewport to match, so long words
//  with many definitions/examples are never clipped.
//  Called after initial render and after each slide ends.
//  The height transition in styles.css makes it animate
//  smoothly rather than jumping.
// ─────────────────────────────────────────────────
function syncViewportHeight() {
  const activeEl = slotEl(activeSlot);
  const viewport = document.querySelector('.card-viewport');
  viewport.style.height = activeEl.scrollHeight + 'px';
}


// ═══════════════════════════════════════════════════
//  MILESTONE CELEBRATION
// ═══════════════════════════════════════════════════

const MILESTONES = [
  { count: 10,  emoji: '🌱', message: "You've started something special.",           sub: '10 words learned'  },
  { count: 25,  emoji: '✨', message: 'A quarter-century of words — keep going.',    sub: '25 words learned'  },
  { count: 50,  emoji: '🔥', message: "Fifty words. You're building real knowledge.", sub: '50 words learned' },
  { count: 100, emoji: '🌟', message: 'One hundred words. Truly remarkable.',         sub: '100 words learned' },
];

// Milestones that have already fired — persisted so they never repeat
let shownMilestones = new Set(
  JSON.parse(localStorage.getItem('lexicon_milestones_shown') || '[]')
);

function checkMilestone(totalSeen) {
  const milestone = MILESTONES.find(
    m => totalSeen >= m.count && !shownMilestones.has(m.count)
  );
  if (!milestone) return;
  shownMilestones.add(milestone.count);
  localStorage.setItem('lexicon_milestones_shown', JSON.stringify([...shownMilestones]));
  showMilestone(milestone);
}

function showMilestone({ count, emoji, message, sub }) {
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

  function dismiss() {
    overlay.classList.add('hiding');
    overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
  }
  overlay.addEventListener('click', dismiss);
  setTimeout(dismiss, 4500); // auto-dismiss after 4.5s
}


// ═══════════════════════════════════════════════════
//  AUTO-SEEN
//  Marks a word as seen after 1.5s of staying on the card.
//  Cancelled if the user navigates away before the timer fires.
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
    applyWord(slotEl(activeSlot), words[current]);
  }, 1500);
}


// ═══════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════

/*
 * renderCard
 * dir: 'next' | 'prev' | null
 *   null       → instant update, no animation (initial load / filter change)
 *   'next'     → slide left (outgoing exits left, incoming enters from right)
 *   'prev'     → slide right (outgoing exits right, incoming enters from left)
 */
function renderCard(dir = null) {
  const w = words[current];

  if (!dir) {
    // No animation — paint active card directly and resize viewport
    applyWord(slotEl(activeSlot), w);
    scheduleAutoSeen(w);
    // [CHANGE 1] Sync height immediately on initial/filter load
    syncViewportHeight();
    return;
  }

  if (sliding) return;
  sliding = true;

  const outId = activeSlot;
  const inId  = inactiveSlot();
  const outEl = slotEl(outId);
  const inEl  = slotEl(inId);

  // Paint the incoming card while it's still off-screen so the
  // content is ready before the slide begins
  applyWord(inEl, w);

  // [CHANGE 4] inStart is 105% (not 100%) to create a small visible
  // gap between the two cards as they slide past each other.
  // Increase this number for a wider gap (e.g. 108, 110).
  const inStart = dir === 'next' ?  105 : -105;
  const outEnd  = dir === 'next' ? -100 :  100;
  const ease    = 'cubic-bezier(0.35, 0, 0.25, 1)';

  // Set starting positions without any transition so there's no flash
  outEl.style.transition = 'none';
  inEl.style.transition  = 'none';
  outEl.style.left = '0%';
  inEl.style.left  = inStart + '%';

  // Force a reflow — without this the browser may batch the position
  // change and the transition start together, skipping the animation
  void inEl.offsetWidth;

  // Apply transitions and slide both cards simultaneously
  outEl.style.transition = `left ${SLIDE_DURATION}ms ${ease}`;
  inEl.style.transition  = `left ${SLIDE_DURATION}ms ${ease}`;
  outEl.style.left = outEnd + '%';
  inEl.style.left  = '0%';

  setTimeout(() => {
    activeSlot = inId;
    sliding    = false;
    // [CHANGE 1] Resize viewport to the incoming card's content height
    // after the slide completes. The CSS transition on .card-viewport
    // height makes this animate smoothly instead of jumping.
    syncViewportHeight();
    scheduleAutoSeen(w);
  }, SLIDE_DURATION + 20);
}

function applyWord(el, w) {
  // Numbered definition list
  const defs = Array.isArray(w.definition) ? w.definition : [w.definition];
  const defHtml = defs
    .map((d, i) => `<span class="def-line"><span class="def-num">${i + 1}.</span> ${d}</span>`)
    .join('');

  // Examples — hidden if none
  const exs = Array.isArray(w.examples) ? w.examples.filter(Boolean) : [];
  const exHtml = exs.length
    ? `<div class="examples">${exs.map(e => `<p class="example">${e}</p>`).join('')}</div>`
    : '';

  // Notes — hidden if none
  const notesHtml = w.notes
    ? `<div class="notes">${w.notes}</div>`
    : '';

  // [CHANGE 2] Tags are now <a> links → words.html?tag=X
  // Clicking a tag reloads the word browser filtered to that tag.
  // CSS in styles.css removes the default link underline/colour.
  const tagsHtml = (w.tags || [])
    .map(t => `<a href="words.html?tag=${encodeURIComponent(t)}" class="tag">${t}</a>`)
    .join('');

  // Seen badge
  const seenData = seenCounts[w.word];
  const seenHtml = seenData
    ? `<span class="seen-badge" style="display:block">seen ${seenData.count}×</span>`
    : `<span class="seen-badge" style="display:none"></span>`;

  // Fav + bookmark button state — classes synced from current sets
  const isFav = favourites.has(w.word);
  const isBm  = bookmarks.has(w.word);
  const favCls = isFav ? 'btn btn-fav btn-icon active' : 'btn btn-fav btn-icon';
  const bmCls  = isBm  ? 'btn btn-bookmark btn-icon active' : 'btn btn-bookmark btn-icon';

  el.innerHTML = `
    <div class="card-top">
      <!-- [CHANGE 3] POS badge is now an <a> link → words.html?pos=X
           Clicking it reloads the word browser filtered to that part of speech. -->
      <a href="words.html?pos=${encodeURIComponent(w.pos || '')}" class="pos-badge">${w.pos || ''}</a>
      ${seenHtml}
    </div>
    <div>
      <div class="word">${w.word}</div>
      <div class="phonetic">${w.phonetic || ''}</div>
    </div>
    <div class="definition">${defHtml}</div>
    ${exHtml}
    ${notesHtml}
    <div class="tags">${tagsHtml}</div>
  `;

  // Progress bar — lives outside the card so updated here directly
  const pct = ((current + 1) / words.length * 100).toFixed(0);
  document.getElementById('progressFill').style.width  = pct + '%';
  document.getElementById('progressLabel').textContent = `${current + 1} / ${words.length}`;

  // Header meta
  const totalSeen = Object.keys(seenCounts).length;
  document.getElementById('headerMeta').textContent =
    `${totalSeen} word${totalSeen !== 1 ? 's' : ''} studied`;

  // Prev / Next button state
  document.getElementById('prevBtn').disabled = current === 0;
  document.getElementById('nextBtn').disabled = !_unitId && current === words.length - 1;

  // Fav button — lives outside the card, sync manually
  const favBtn  = document.getElementById('favBtn');
  const favIcon = favBtn.querySelector('i');
  favIcon.className = isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
  favBtn.className  = favCls;

  // Bookmark button — lives outside the card, sync manually
  const bookmarkBtn = document.getElementById('bookmarkBtn');
  if (bookmarkBtn) bookmarkBtn.className = bmCls;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}


// ═══════════════════════════════════════════════════
//  HEART PARTICLE BURST
//  Spawns coloured dot particles radiating from the fav
//  button when a word is added to favourites.
//  Particles are fixed-position so they work at any scroll
//  position, and remove themselves from the DOM after 900ms.
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
    el.style.cssText = `
      width:${size}px; height:${size}px;
      background:${PARTICLE_COLOURS[Math.floor(Math.random() * PARTICLE_COLOURS.length)]};
      --tx:${Math.cos(rad) * distance}px; --ty:${Math.sin(rad) * distance}px;
      animation-delay:${Math.random() * 0.08}s;
      position:fixed; left:${originX - size / 2}px; top:${originY - size / 2}px; z-index:9999;
    `;
    document.body.appendChild(el);
    fragments.push(el);
  }

  // Pulse ring radiates outward from the button centre
  const ring = document.createElement('span');
  ring.className = 'fav-ring';
  ring.style.cssText = `position:fixed; left:${originX - 22}px; top:${originY - 22}px; z-index:9999;`;
  document.body.appendChild(ring);
  fragments.push(ring);

  // Spring pop on the heart icon itself
  btn.classList.remove('heart-pop');
  void btn.offsetWidth; // force reflow so animation re-triggers
  btn.classList.add('heart-pop');
  btn.addEventListener('animationend', () => btn.classList.remove('heart-pop'), { once: true });

  // Clean up all particle elements after animation finishes
  setTimeout(() => fragments.forEach(el => el.remove()), 900);
}


// ═══════════════════════════════════════════════════
//  ACTIONS
// ═══════════════════════════════════════════════════

/* Unit ID — set in init if ?unit= param present, used by navigate() */
let _unitId   = null;
let _unitName = '';

function showUnitCompletePrompt() {
  /* Remove any existing prompt */
  document.getElementById('unitCompletePrompt')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'unitCompletePrompt';
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(12,10,10,0.88);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; padding: 1.5rem;
    animation: fadeIn 0.3s ease;
  `;

  overlay.innerHTML = `
    <div style="
      background: #1e1b1b;
      border: 0.5px solid #312e2e;
      border-radius: 18px;
      padding: 2rem 1.75rem;
      max-width: 360px; width: 100%;
      text-align: center;
      display: flex; flex-direction: column; gap: 1rem;
    ">
      <div style="font-family:'Lora',serif;font-size:2.4rem;font-weight:600;color:#c9afc2;letter-spacing:-1px;line-height:1;">
        ✦
      </div>
      <div style="font-family:'Lora',serif;font-size:1.25rem;font-weight:500;color:#fff;">
        Words complete
      </div>
      <div style="font-family:'Roboto Mono',monospace;font-size:11px;color:#474444;line-height:1.7;">
        You've been through all ${words.length} words in <em style="color:#c9afc2;">${_unitName}</em>.<br>
        Ready to test yourself?
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:0.5rem;">
        <button onclick="goToReviewTest()" style="
          background:#B87333; border:none; border-radius:10px;
          padding:14px; width:100%; cursor:pointer;
          font-family:'Vollkorn',serif; font-size:1rem; color:#1a0a00;
          transition:background 0.15s ease;
        ">Take the review test →</button>
        <button onclick="document.getElementById('unitCompletePrompt').remove()" style="
          background:none; border:0.5px solid #312e2e; border-radius:10px;
          padding:12px; width:100%; cursor:pointer;
          font-family:'Roboto Mono',monospace; font-size:11px; color:#474444;
        ">Go back to words</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

window.goToReviewTest = function() {
  window.location.href = `quiz-test.html?mode=shuffle&unit=${_unitId}&unitName=${encodeURIComponent(_unitName)}&review=1`;
};

function navigate(dir) {
  if (autoSeenTimer) clearTimeout(autoSeenTimer);

  /* ── Unit completion: forward past last card ── */
  if (dir > 0 && current === words.length - 1 && _unitId) {
    showUnitCompletePrompt();
    return;
  }

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
    // Particle burst only fires when adding, not removing
    burstParticles(document.getElementById('favBtn'));
  }

  syncFavourites(currentUid, Array.from(favourites), favLog);

  // Update button state without re-rendering or triggering a slide
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

  // Update button state without re-rendering
  const bookmarkBtn = document.getElementById('bookmarkBtn');
  if (bookmarkBtn) {
    bookmarks.has(w.word)
      ? bookmarkBtn.classList.add('active')
      : bookmarkBtn.classList.remove('active');
  }
}

/*
 * applyFilter — filters WORDS by group, tag, and/or pos from URL params.
 *
 * ?group=people  → w.groups includes 'people'
 * ?tag=beginner  → w.tags includes 'beginner'   (or 'favourite'/'bookmark' special cases)
 * ?pos=noun      → w.pos === 'noun'
 *
 * Falls back to all WORDS if the filter produces no results.
 */
function applyFilter(group, tag, pos) {
  const filtered = WORDS.filter(w => {
    const groupMatch = (!group || group === 'all')
      ? true
      : Array.isArray(w.groups) && w.groups.includes(group);

    let tagMatch;
    if (!tag || tag === 'all')    tagMatch = true;
    else if (tag === 'favourite') tagMatch = favourites.has(w.word);
    else if (tag === 'bookmark')  tagMatch = bookmarks.has(w.word);
    else                          tagMatch = Array.isArray(w.tags) && w.tags.includes(tag);

    const posMatch = !pos || w.pos === pos;
    return groupMatch && tagMatch && posMatch;
  });

  words   = shuffle(filtered.length ? filtered : WORDS);
  current = 0;

  // Update the page heading to reflect the active filter
  const headingEl = document.querySelector('h2');
  if (headingEl) {
    if (group && group !== 'all')  headingEl.textContent = group.charAt(0).toUpperCase() + group.slice(1);
    else if (tag && tag !== 'all') headingEl.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
    else if (pos)                  headingEl.textContent = pos.charAt(0).toUpperCase() + pos.slice(1) + 's';
    else                           headingEl.textContent = 'Lexicon';
  }

  renderCard(null);
}


// ═══════════════════════════════════════════════════
//  INIT — async wrapper so we can await getWords()
// ═══════════════════════════════════════════════════

(async () => {
  /* Load words from Firestore (cached after first load) */
  const allWords = await getWords();
  if (!allWords.length) {
    console.error('words.js: no words loaded — check Firestore connection');
    return;
  }

  // Read URL params
  const params     = new URLSearchParams(window.location.search);
  const startGroup = params.get('group') || null;
  const startTag   = params.get('tag')   || null;
  const startPos   = params.get('pos')   || null;
  const startWord  = params.get('word')  || null;
  const unitId     = params.get('unit')  || null;

  /* ── If ?unit= is present, filter to unit words only ── */
  if (unitId) {
    /* Read unit data stored in sessionStorage by learn.html */
    let unitWordIds = null;
    let unitDisplayName = params.get('unitName') ? decodeURIComponent(params.get('unitName')) : 'Unit';
    try {
      const stored = sessionStorage.getItem('akaltye_active_unit');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.id === unitId) {
          unitWordIds     = parsed.wordIds;
          unitDisplayName = parsed.name || unitDisplayName;
        }
      }
    } catch(e) {}

    /* Filter allWords to this unit's wordIds */
    const wordIdSet  = new Set(unitWordIds || []);
    const unitWords  = unitWordIds
      ? allWords.filter(w => wordIdSet.has(w.id))
      : allWords.filter(w => w.unitId === unitId); /* fallback if sessionStorage not set */

    if (unitWords.length) {
      WORDS     = unitWords;
      _unitId   = unitId;
      _unitName = unitDisplayName;
      const headingEl = document.querySelector('h2');
      if (headingEl) headingEl.textContent = unitDisplayName;
      words   = WORDS;
      current = 0;
      renderCard(null);
    } else {
      WORDS = allWords;
      applyFilter(startGroup, startTag, startPos);
    }
  } else {
    WORDS = allWords;
    applyFilter(startGroup, startTag, startPos);
  }

  document.getElementById('prevBtn').addEventListener('click', () => navigate(-1));
  document.getElementById('nextBtn').addEventListener('click', () => navigate(1));
  document.getElementById('favBtn').addEventListener('click', toggleFavourite);
  document.getElementById('bookmarkBtn')?.addEventListener('click', toggleBookmark);

  // Keyboard navigation — left/right arrow keys
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') navigate(1);
    if (e.key === 'ArrowLeft')  navigate(-1);
  });

  // If a specific word was requested via ?word=Kwatye, jump to it
  if (startWord) {
    const idx = words.findIndex(w => w.word === startWord);
    if (idx !== -1) { current = idx; renderCard(null); }
  }
})();