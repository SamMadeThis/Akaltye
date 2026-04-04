// ═══════════════════════════════════════════════════
//  words.js — Word card browser for ALKATYE
//
//  WHAT: Displays Arrernte word cards one at a time.
//        Users can mark words as seen or favourite them.
//  HOW:  Reads ?tag= and ?pos= from the URL to filter words.
//        Special case: ?tag=favourite filters by localStorage.
//        All state stored in localStorage.
// ═══════════════════════════════════════════════════


// ═══════════════════════════════════════════════════
//  WORD DATA
//  Keep in sync with practice.js when adding new words.
// ═══════════════════════════════════════════════════
const WORDS = [
  {
    word: "Ye",
    phonetic: "Ya",
    pos: "noun",
    definition: ["Yes, Yeah", "May be an answer to a negative question"],
    example1: "Re ikwere ilelheke, 'Ye, ayengearle mwarre anteme awelheme'; She told her, 'Yes' I'm better now.",
    example2: "",
    tags: ["beginner"]
  },
  {
    word: "Mparntwe",
    phonetic: "m'barn-twa",
    pos: "noun",
    definition: ["The Alice Springs town area"],
    example1: "",
    example2: "",
    tags: ["beginner", "country"]
  },
  {
    word: "Mwerre",
    phonetic: "mwa-rra",
    pos: "noun",
    definition: [
      "Good, right, proper",
      "Nice, pleasant, welcome, enjoyable",
      "Useable, (working) well, useful, in working order, OK"
    ],
    example1: "Unte mwerre? (You good?)",
    example2: "Ye, ayenge mwerre (Yes, I am good)",
    tags: ["beginner"]
  },
  {
    word: "Kwatye",
    phonetic: "Kwa-dja",
    pos: "noun",
    definition: [
      "Water",
      "Rain",
      "General term for water and things consisting of it, eg ice, vapour, rain, rain clouds",
      "A general term fo water in the form it is found in varous places",
      "Weather related to rain"
    ],
    example1: "Thipe nyingkele apele kwatye imerntye akngerre unte apeke aparlpe-arle-irreke kwatye arrangkwe. The zebra finch can show you where there is water, if you get lost and don't have any.",
    example2: "",
    tags: ["weather", "beginner"]
  },
  {
    word: "Werte",
    phonetic: "wer-da",
    pos: "interjection",
    definition: ["Greeting", "Whats up?, Whats happening? Whats going on? Hello'"],
    example1: "Werte? Inwenheke-ame unte atyenge antangkelhene; Whats up? why did you send a message to me for me to come?",
    example2: "",
    tags: ["interaction", "beginner"]
  },
  {
    word: "Apmere",
    phonetic: "Ap-mara",
    pos: "noun",
    definition: [
      "Country, land, region",
      "An area of land and the things on it",
      "Place, location, site, spot",
      "Direction, place",
      "Camp, home, house",
      "A general word for places and areas which can go before the name of a place or a type of place",
      "Goes before words of which one of the meanings refer to a (type of) place or area and makes it clear that it is this place of meaning rather than another meaning of the word"
    ],
    example1: "",
    example2: "",
    tags: ["country", "beginner"]
  },
  {
    word: "Inwenhe",
    phonetic: "In-wen-ha",
    pos: "noun",
    definition: [
      "what",
         ],
    example1: "Inwenhe arlte lyete? (what is the day today?)",
    example2: "Inwenhe arritnye ngkwenhe? (what is your name?)",
    tags: ["beginner"]
  },
  {
    word: "Arritnye",
    phonetic: "??",
    pos: "??",
    definition: [
      "Name"
         ],
    example1: "Inwenhe arritnye ngkwenhe? (what is your name?)",
    example2: "Arritnye atyenhe ...... (My name is .....)",
    tags: ["beginner"]
  },
    {
    word: "Angwehnhe",
    phonetic: "Ang-wen-ha",
    pos: "??",
    definition: [
      "Who"
         ],
    example1: "Angwenhe atyewe ngkwenhe? (Who is your friend?)",
    example2: "",
    tags: ["beginner"]
  },
  {
    word: "Atyewe",
    phonetic: "??",
    pos: "??",
    definition: [ "Friend" ],
    example1: "Angwenhe atyewe ngkwenhe? (Who is your friend?)",
    example2: "",
    tags: ["beginner"]
  },
  {
    word: "Atyenhe",
    phonetic: "??",
    pos: "??",
    definition: [ "My" ],
    example1: "Angwenhe atyewe ngkwenhe? (Who is your friend?)",
    example2: "",
    tags: ["beginner"]
  },
    {
    word: "Arelhe",
    phonetic: "??",
    pos: "??",
    definition: [ "Woman" ],
    example1: "",
    example2: "",
    tags: ["beginner"]
  },
    {
    word: "Artwe",
    phonetic: "??",
    pos: "??",
    definition: [ "Man" ],
    example1: "",
    example2: "",
    tags: ["beginner"]
  },
        {
    word: "Ampe",
    phonetic: "??",
    pos: "??",
    definition: [ "Child" ],
    example1: "",
    example2: "",
    tags: ["beginner"]
  },
  {
    word: "Yanhe",
    phonetic: "??",
    pos: "??",
    definition: [ "That there" ],
    example1: "",
    example2: "",
    tags: ["beginner"]
  },
  {
    word: "Nhenhe",
    phonetic: "??",
    pos: "??",
    definition: [ "Here" ],
    example1: "",
    example2: "",
    tags: ["beginner"]
  },
  {
    word: "Nhakwe",
    phonetic: "??",
    pos: "??",
    definition: [ "Over there" ],
    example1: "",
    example2: "",
    tags: ["beginner"]
  },
  {
    word: "Arlenge",
    phonetic: "??",
    pos: "??",
    definition: [ "A long way away" ],
    example1: "",
    example2: "",
    tags: ["beginner"]
  },
    {
    word: "Aneme",
    phonetic: "??",
    pos: "??",
    definition: [ "Sit" ],
    example1: "",
    example2: "",
    tags: ["beginner"]
  },
    {
    word: "Tneme",
    phonetic: "??",
    pos: "??",
    definition: [ "Stand" ],
    example1: "",
    example2: "",
    tags: ["beginner"]
  },
    {
    word: "Inteme",
    phonetic: "??",
    pos: "??",
    definition: [ "laydown" ],
    example1: "",
    example2: "",
    tags: ["beginner"]
  },
    {
    word: "Arne",
    phonetic: "??",
    pos: "??",
    definition: [ "Wood, log" ],
    example1: "",
    example2: "",
    tags: ["beginner"]
  },
    {
    word: "Antyeme",
    phonetic: "??",
    pos: "??",
    definition: [ "Bed" ],
    example1: "",
    example2: "",
    tags: ["beginner"]
  },
    {
    word: "Ahelhe",
    phonetic: "??",
    pos: "??",
    definition: [ "Ground" ],
    example1: "",
    example2: "",
    tags: ["beginner"]
  },
     {
    word: "Alkweme-le",
    phonetic: "??",
    pos: "transitive",
    definition: [ "Eat" ],
    example1: "",
    example2: "",
    tags: ["beginner","verb"]
  },
          {
    word: "Iteme",
    phonetic: "??",
    pos: "transitive",
    definition: [ "Cook" ],
    example1: "",
    example2: "",
    tags: ["beginner","verb"]
  },
  {
    word: "Antyweme",
    phonetic: "??",
    pos: "transitive",
    definition: [ "Drink" ],
    example1: "",
    example2: "",
    tags: ["beginner","verb"]
  },
  {
    word: "Ayekaye!",
    phonetic: "??",
    pos: "??",
    definition: [ "Surprise" ],
    example1: "",
    example2: "",
    tags: ["beginner","emotion"]
  },
    {
    word: "Yekwe",
    phonetic: "??",
    pos: "??",
    definition: [ "I dont know" ],
    example1: "",
    example2: "",
    tags: ["beginner","emotion"]
  }
];


// ═══════════════════════════════════════════════════
//  Firebase
// ═══════════════════════════════════════════════════
import { auth }                        from './firebase-config.js';
import { onAuthStateChanged }           from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { pullFromFirestore, syncSeen, syncFavourites, syncBookmarks } from './sync.js';

// Track the signed-in uid — null if not signed in
let currentUid = null;

// Listen for auth state once; pull Firestore data if new device
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
let seenCounts = JSON.parse(localStorage.getItem('lexicon_seen') || '{}');
let viewLog    = JSON.parse(localStorage.getItem('lexicon_log')  || '[]');

/*
 * favourites — Set of word strings e.g. { "Kwatye", "Werte" }
 * WHY: Set prevents duplicates automatically.
 *      Stored as a JSON array in localStorage, loaded as a Set.
 */
let favourites = new Set(JSON.parse(localStorage.getItem('lexicon_favourites') || '[]'));

/*
 * bookmarks — Set of word strings saved for later reference
 * Stored separately from favourites so users can maintain two
 * independent lists with different intent.
 */
let bookmarks = new Set(JSON.parse(localStorage.getItem('lexicon_bookmarks') || '[]'));


// ═══════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════

function renderCard(animate = false) {
  const card = document.getElementById('wordCard');
  const w = words[current];
  if (animate) {
    card.classList.add('fade-out');
    setTimeout(() => { applyWord(w); card.classList.remove('fade-out'); }, 200);
  } else {
    applyWord(w);
  }
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

  document.getElementById('example1').textContent = w.example1 || '';
  document.getElementById('example2').textContent = w.example2 || '';

  // Tags
  const tags = document.getElementById('tagsContainer');
  tags.innerHTML = (w.tags || []).map(t => `<span class="tag">${t}</span>`).join('');

  // Seen badge + button
  const seenData  = seenCounts[w.word];
  const seenBadge = document.getElementById('seenBadge');
  const seenBtn   = document.getElementById('seenBtn');

  if (seenData) {
    seenBadge.style.display = 'block';
    seenBadge.textContent   = `seen ${seenData.count}×`;
    seenBtn.classList.add('already');
    seenBtn.textContent = 'seen again ✓';
  } else {
    seenBadge.style.display = 'none';
    seenBtn.classList.remove('already');
    seenBtn.textContent = 'mark as seen';
  }

  // Favourite button state
  // WHY: Always reflects the current favourite status so the
  //      button is accurate after navigating between cards.
  const favBtn = document.getElementById('favBtn');
  if (favourites.has(w.word)) {
    favBtn.textContent = '♥ favourited';
    favBtn.classList.add('active');
  } else {
    favBtn.textContent = '♡ favourite';
    favBtn.classList.remove('active');
  }

  // Bookmark button state
  const bookmarkBtn = document.getElementById('bookmarkBtn');
  if (bookmarkBtn) {
    if (bookmarks.has(w.word)) {
      bookmarkBtn.textContent = '🔖 bookmarked';
      bookmarkBtn.classList.add('active');
    } else {
      bookmarkBtn.textContent = '🔖 bookmark';
      bookmarkBtn.classList.remove('active');
    }
  }

  // Prev / Next
  document.getElementById('prevBtn').disabled = current === 0;
  document.getElementById('nextBtn').disabled = current === words.length - 1;

  // Progress bar
  const pct = ((current + 1) / words.length * 100).toFixed(0);
  document.getElementById('progressFill').style.width = pct + '%';
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
  current = Math.max(0, Math.min(words.length - 1, current + dir));
  renderCard(true);
}

async function markSeen() {
  const w       = words[current];
  const now     = new Date();
  const isoNow  = now.toISOString();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (!seenCounts[w.word]) seenCounts[w.word] = { count: 0, lastSeen: null };
  seenCounts[w.word].count++;
  seenCounts[w.word].lastSeen = isoNow;
  viewLog.unshift({ word: w.word, time: timeStr, iso: isoNow });

  syncSeen(currentUid, seenCounts, viewLog);

  renderCard();
  showToast('logged ✓');
}

/*
 * toggleFavourite — adds or removes the current word from favourites
 * WHAT: Toggles membership in the favourites Set, saves to localStorage
 * HOW:  Set.has() checks; add/delete toggles; Array.from converts
 *       Set → array for JSON serialisation
 * WHY:  Set prevents duplicate entries automatically.
 *       localStorage persists the list across pages and sessions.
 */
function toggleFavourite() {
  const w = words[current];
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });

  let favLog = JSON.parse(localStorage.getItem('lexicon_favourite_log') || '[]');

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


/*
 * toggleBookmark — saves or removes the current word from bookmarks
 * WHAT: Toggles membership in the bookmarks Set, saves to localStorage,
 *       and records a timestamped entry in lexicon_bookmark_log so the
 *       saved.html page can show when each word was bookmarked.
 * HOW:  Mirrors toggleFavourite but writes to a separate key so the two
 *       lists stay independent.
 * WHY:  Users may want to favourite words they love AND bookmark words
 *       they want to review — two distinct intents.
 */
function toggleBookmark() {
  const w = words[current];
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });

  let bmLog = JSON.parse(localStorage.getItem('lexicon_bookmark_log') || '[]');

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
//  Reads ?tag= and ?pos= from the URL.
//  Special case: tag=favourite filters by localStorage.
// ═══════════════════════════════════════════════════

/*
 * applyFilter — filters WORDS by tag and/or pos
 * WHAT: Handles normal tags AND the special 'favourite' tag
 * HOW:  For 'favourite', checks the favourites Set rather than
 *       the word's own .tags array — no word data changes needed
 * WHY:  Favourites are user-specific and dynamic; baking them
 *       into word data would require rewriting the array on each change
 */
function applyFilter(tag, pos) {
  const filtered = WORDS.filter(w => {
    let tagMatch;
    if (!tag || tag === 'all') {
      tagMatch = true;
    } else if (tag === 'favourite') {
      tagMatch = favourites.has(w.word);
    } else if (tag === 'bookmark') {
      tagMatch = bookmarks.has(w.word);
    } else {
      tagMatch = w.tags && w.tags.includes(tag);
    }
    const posMatch = !pos || w.pos === pos;
    return tagMatch && posMatch;
  });

  words   = shuffle(filtered);
  current = 0;
  renderCard();
}


// ═══════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════
document.getElementById('prevBtn').addEventListener('click', () => navigate(-1));
document.getElementById('nextBtn').addEventListener('click', () => navigate(1));
document.getElementById('seenBtn').addEventListener('click', markSeen);
document.getElementById('favBtn').addEventListener('click', toggleFavourite);
document.getElementById('bookmarkBtn')?.addEventListener('click', toggleBookmark);

const params    = new URLSearchParams(window.location.search);
const startTag  = params.get('tag')  || 'all';
const startPos  = params.get('pos')  || null;
const startWord = params.get('word') || null;

applyFilter(startTag, startPos);

/*
 * If a specific word was requested via ?word=Kwatye, jump to that
 * card after the filter has been applied. Falls back gracefully if
 * the word isn't in the current filtered set.
 */
if (startWord) {
  const idx = words.findIndex(w => w.word === startWord);
  if (idx !== -1) {
    current = idx;
    renderCard();
  }
}