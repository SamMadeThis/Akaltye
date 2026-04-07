/* =============================================================
   home.js — Logic for index.html (home page)

   WHAT: Word of the day, scroll reveal, progress stats,
         sign-in prompt visibility, number scramble hover.
         Auth is handled by nav.js — no duplication here.
   ============================================================= */

import { auth }             from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { pullFromFirestore }  from './sync.js';

/* ── Word of the day ────────────────────────────────────────── */
const WORDS = [
  { word: 'Werte',    phonetic: 'wer-da',     definition: "Greeting — Hello, what's up?",        example: 'Werte? Inwenheke-ame unte atyenge antangkelhene.' },
  { word: 'Mwerre',   phonetic: 'mwa-rra',    definition: 'Good, right, proper. Healthy, well.',  example: 'Unte mwerre? — Are you good?' },
  { word: 'Kwatye',   phonetic: 'kwa-dja',    definition: 'Water, rain.',                          example: 'Kwatye arrangkwe — there is no water.' },
  { word: 'Apmere',   phonetic: 'ap-mara',    definition: 'Country, land, home, place.',           example: 'Apmere — the land that holds everything.' },
  { word: 'Mparntwe', phonetic: "m'barn-twa", definition: 'Alice Springs — the town area.',        example: 'Mparntwe is Arrernte Country.' },
  { word: 'Urreke',   phonetic: 'oo-ree-ga',  definition: 'Goodbye, farewell.',                    example: 'Urreke! Nhenhe apetyeke — Goodbye! See you later.' },
  { word: 'Inwenhe',  phonetic: 'in-wan-ya',  definition: 'What — used to ask about something.',   example: 'Inwenhe nhenhe? — What is this?' },
  { word: 'Ye',       phonetic: 'ya',          definition: 'Yes, yeah.',                            example: 'Ye, ayenge mwerre — Yes, I am good.' },
];

const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
const wotd = WORDS[dayOfYear % WORDS.length];

document.getElementById('wotdWord').textContent     = wotd.word;
document.getElementById('wotdPhonetic').textContent = wotd.phonetic ? `/${wotd.phonetic}/` : '';
document.getElementById('wotdDef').textContent      = wotd.definition;
document.getElementById('wotdExample').textContent  = wotd.example || '';
if (!wotd.example) document.getElementById('wotdExample').style.display = 'none';


/* ── Scroll reveal on WOTD card ─────────────────────────────── */
const card = document.getElementById('wotdCard');
const observer = new IntersectionObserver(
  (entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setTimeout(() => card.classList.add('is-visible'), 180);
        obs.disconnect();
      }
    });
  },
  { threshold: 0.15 }
);
observer.observe(card);


/* ── Progress stats ─────────────────────────────────────────── */
function renderProgress() {
  const seen    = JSON.parse(localStorage.getItem('lexicon_seen')       || '{}');
  const quizzes = JSON.parse(localStorage.getItem('lexicon_quiz_log')   || '[]');
  const favs    = JSON.parse(localStorage.getItem('lexicon_favourites') || '[]');
  const seenCount = Object.keys(seen).length;

  if (seenCount === 0) return;

  const seenVal = String(seenCount);
  const quizVal = String(quizzes.length);
  const favVal  = String(Array.isArray(favs) ? favs.length : 0);

  const seenEl = document.getElementById('progressSeen');
  const quizEl = document.getElementById('progressQuizzes');
  const favEl  = document.getElementById('progressFavs');

  seenEl.textContent = seenVal; seenEl.dataset.real = seenVal;
  quizEl.textContent = quizVal; quizEl.dataset.real = quizVal;
  favEl.textContent  = favVal;  favEl.dataset.real  = favVal;

  document.getElementById('homeProgress').classList.add('visible');

  // Inject corner bracket spans — CSS ::before/::after only covers two corners
  const statsEl = document.querySelector('.home-progress-stats');
  if (statsEl && !statsEl.querySelector('.corner-tr')) {
    const tr = document.createElement('span'); tr.className = 'corner-tr';
    const bl = document.createElement('span'); bl.className = 'corner-bl';
    statsEl.appendChild(tr);
    statsEl.appendChild(bl);
  }
}

renderProgress();


/* ── Auth state ─────────────────────────────────────────────────
   Signed out → show pulsing save card, hide stats.
   Signed in  → hide save card, show stats with real data.
   nav.js handles #navAuth — no duplication here.
── */
const signinPrompt = document.getElementById('homeSigninPrompt');
const homeProgress = document.getElementById('homeProgress');

onAuthStateChanged(auth, user => {
  if (user) {
    signinPrompt.style.display = 'none';
    pullFromFirestore(user.uid).then(renderProgress);
    renderProgress();
  } else {
    signinPrompt.style.display = 'flex';
    homeProgress.classList.remove('visible');
  }
});


/* ── Number scramble hover ───────────────────────────────────── */
function scrambleNumber(stat) {
  const numEl   = stat.querySelector('.home-progress-stat-num');
  const realVal = numEl.dataset.real;
  if (!realVal || numEl._scrambling) return;

  numEl._scrambling = true;
  numEl.classList.add('scrambling');
  numEl.classList.remove('settled');

  const digits = '0123456789';
  const frames = 14;
  const delay  = 35;
  let   count  = 0;

  const tick = setInterval(() => {
    numEl.textContent = Array.from(
      { length: realVal.length },
      () => digits[Math.floor(Math.random() * 10)]
    ).join('');

    count++;
    if (count >= frames) {
      clearInterval(tick);
      numEl.textContent = realVal;
      numEl.classList.remove('scrambling');
      numEl.classList.add('settled');
      numEl._scrambling = false;
    }
  }, delay);
}

function resetNumber(stat) {
  const numEl = stat.querySelector('.home-progress-stat-num');
  if (numEl) numEl.classList.remove('scrambling', 'settled');
}

document.querySelectorAll('.home-progress-stat').forEach(stat => {
  stat.addEventListener('mouseenter', () => scrambleNumber(stat));
  stat.addEventListener('mouseleave', () => resetNumber(stat));
});