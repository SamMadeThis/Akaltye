// ═══════════════════════════════════════════════════
//  WORD DATA — edit this array to add your words
//
//  Each entry can have:
//    word       (string)  required
//    phonetic   (string)  optional
//    pos        (string)  part of speech e.g. "noun"
//    definition (string)  required
//    example    (string)  optional
//    tags       (array)   optional labels e.g. ["formal", "rare"]
// ═══════════════════════════════════════════════════
const WORDS = [
  {
    word: "Ephemeral",
    phonetic: "/ɪˈfem.ər.əl/",
    pos: "adjective",
    definition: "Lasting for a very short time; transitory in nature.",
    example: "The ephemeral beauty of cherry blossoms draws crowds every spring.",
    tags: ["formal", "literary"]
  },
  {
    word: "Sonder",
    phonetic: "/ˈsɒn.dər/",
    pos: "noun",
    definition: "The realisation that each passerby has a life as vivid and complex as one's own.",
    example: "A wave of sonder washed over her as she watched the busy street.",
    tags: ["neologism", "introspective"]
  },
  {
    word: "Lucid",
    phonetic: "/ˈluː.sɪd/",
    pos: "adjective",
    definition: "Expressed clearly; easy to understand. Also: showing clarity of thought.",
    example: "Her lucid explanation made the complex topic accessible to everyone.",
    tags: ["common", "formal"]
  },
  {
    word: "Petrichor",
    phonetic: "/ˈpet.rɪ.kɔːr/",
    pos: "noun",
    definition: "A pleasant smell that frequently accompanies rain falling on dry earth.",
    example: "After weeks of drought, the petrichor was intoxicating.",
    tags: ["sensory", "rare"]
  },
  {
    word: "Mellifluous",
    phonetic: "/məˈlɪf.lu.əs/",
    pos: "adjective",
    definition: "Sweet or musical; pleasant to hear. Often used to describe voices or sounds.",
    example: "The mellifluous tones of the cello filled the concert hall.",
    tags: ["formal", "literary", "sensory"]
  }
];

// ═══════════════════════════════════════════════════
//  Firebase setup
// ═══════════════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCvEdCqAuwgtJ-02R9xs7nbeBlfn55lYUk",
  authDomain: "lexicon-69642.firebaseapp.com",
  projectId: "lexicon-69642",
  storageBucket: "lexicon-69642.firebasestorage.app",
  messagingSenderId: "40542416693",
  appId: "1:40542416693:web:ce930dbe96c7d5b3ebe67c",
  measurementId: "G-17ZB632V40"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ═══════════════════════════════════════════════════
//  State
// ═══════════════════════════════════════════════════

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let words = shuffle(WORDS);
let current = 0;

// Loaded from localStorage, written to Firestore on mark
// Structure: { "Word": { count: N, lastSeen: ISO string } }
let seenCounts = JSON.parse(localStorage.getItem('lexicon_seen') || '{}');
let viewLog    = JSON.parse(localStorage.getItem('lexicon_log')  || '[]');

// ═══════════════════════════════════════════════════
//  Render
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
  document.getElementById('wordText').textContent    = w.word;
  document.getElementById('phonetic').textContent    = w.phonetic   || '';
  document.getElementById('posbadge').textContent    = w.pos        || '';
  document.getElementById('definition').textContent  = w.definition || '';
  document.getElementById('example').textContent     = w.example    || '';

  const tags = document.getElementById('tagsContainer');
  tags.innerHTML = (w.tags || []).map(t => `<span class="tag">${t}</span>`).join('');

  // seen badge
  const seenBadge = document.getElementById('seenBadge');
  const seenData  = seenCounts[w.word];
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

  document.getElementById('prevBtn').disabled = current === 0;
  document.getElementById('nextBtn').disabled = current === words.length - 1;

  const pct = ((current + 1) / words.length * 100).toFixed(0);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressLabel').textContent = `${current + 1} / ${words.length}`;

  const total = Object.keys(seenCounts).length;
  document.getElementById('headerMeta').textContent = `${total} word${total !== 1 ? 's' : ''} studied`;
}

function renderLog() {
  const container = document.getElementById('logContainer');

  if (!viewLog.length) {
    container.innerHTML = '<div class="log-empty">no words logged yet — mark a word as seen to record it</div>';
    return;
  }

  // De-dupe: show each word once (most recent entry), with total count
  const seen = {};
  const items = viewLog.map(e => {
    if (seen[e.word]) return null;
    seen[e.word] = true;
    const c = seenCounts[e.word]?.count || 1;
    return `<div class="log-item">
      <span class="log-word">${e.word}</span>
      <span class="log-count">${c}×</span>
      <span class="log-time">${e.time}</span>
    </div>`;
  }).filter(Boolean).join('');

  container.innerHTML = `<div class="log-list">${items}</div>`;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

// ═══════════════════════════════════════════════════
//  Actions
// ═══════════════════════════════════════════════════

function navigate(dir) {
  current = Math.max(0, Math.min(words.length - 1, current + dir));
  renderCard(true);
}

async function markSeen() {
  const w = words[current];
  const now = new Date();
  const isoNow  = now.toISOString();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Update local state
  if (!seenCounts[w.word]) seenCounts[w.word] = { count: 0, lastSeen: null };
  seenCounts[w.word].count++;
  seenCounts[w.word].lastSeen = isoNow;
  viewLog.unshift({ word: w.word, time: timeStr, iso: isoNow });

  // Persist to localStorage immediately (fast, works offline)
  localStorage.setItem('lexicon_seen', JSON.stringify(seenCounts));
  localStorage.setItem('lexicon_log',  JSON.stringify(viewLog));

  // Update UI
  renderCard();
  renderLog();
  showToast('logged ✓');

  // Write to Firestore in the background (non-blocking)
  try {
    await addDoc(collection(db, 'viewLog'), {
      word:   w.word,
      pos:    w.pos || '',
      seenAt: serverTimestamp(),
      count:  seenCounts[w.word].count
    });
  } catch (e) {
    console.warn('Firebase write failed — entry saved locally:', e);
  }
}

function clearLog() {
  if (!viewLog.length) return;
  if (!confirm('Clear your local view log? (Firebase history is kept)')) return;
  viewLog    = [];
  seenCounts = {};
  localStorage.removeItem('lexicon_seen');
  localStorage.removeItem('lexicon_log');
  renderCard();
  renderLog();
  showToast('log cleared');
}

// ═══════════════════════════════════════════════════
//  Init — wire up buttons and render
// ═══════════════════════════════════════════════════
document.getElementById('prevBtn').addEventListener('click', () => navigate(-1));
document.getElementById('nextBtn').addEventListener('click', () => navigate(1));
document.getElementById('seenBtn').addEventListener('click', markSeen);
document.getElementById('clearBtn').addEventListener('click', clearLog);

renderCard();
renderLog();
