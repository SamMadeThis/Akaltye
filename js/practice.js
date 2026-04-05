/* =============================================================
   practice.js — Quiz logic for ALKATYE

   HOW:  Loaded as type="module" in practice.html.
   WHAT: Handles filter state (group → sub-tag → level → pos →
         seen/unseen), question generation for all four quiz
         types, answer evaluation, screen transitions, score
         tracking and Firestore/localStorage persistence.
   ============================================================= */

import { auth }                           from './firebase-config.js';
import { onAuthStateChanged }             from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { pullFromFirestore, syncQuizLog } from './sync.js';
import { WORDS }                          from './words-data.js';

let currentUid = null;
onAuthStateChanged(auth, user => {
  currentUid = user ? user.uid : null;
  if (currentUid) pullFromFirestore(currentUid);
});


/* =============================================================
   UTILITY
   ============================================================= */

const $ = id => document.getElementById(id);

const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const defIndex = new Map();
const firstDef = w => {
  const defs = Array.isArray(w.definition) ? w.definition : [w.definition];
  if (defs.length === 1) return defs[0];
  const i = defIndex.get(w.word) || 0;
  defIndex.set(w.word, (i + 1) % defs.length);
  return defs[i];
};

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}


/* =============================================================
   LOCALSTORAGE
   ============================================================= */

const getSeenCounts = () => JSON.parse(localStorage.getItem('lexicon_seen')     || '{}');
const getQuizLog    = () => JSON.parse(localStorage.getItem('lexicon_quiz_log') || '[]');

function saveQuizResult(mode, score, total) {
  const log = getQuizLog();
  const now = new Date();
  log.unshift({
    mode, score, total,
    pct:  Math.round(score / total * 100),
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: now.toLocaleDateString([], { day: 'numeric', month: 'short' }),
    iso:  now.toISOString()
  });
  syncQuizLog(currentUid, log.slice(0, 50));
}


/* =============================================================
   QUIZ LOG RENDERER
   ============================================================= */

function renderQuizLog() {
  const log = getQuizLog();
  const c   = $('quizLogContainer');
  if (!log.length) {
    c.innerHTML = '<div class="quiz-log-empty">no quizzes yet — pick a mode above to start</div>';
    return;
  }
  c.innerHTML = log.slice(0, 6).map(e =>
    `<div class="quiz-log-item">
       <span class="qli-mode">${e.mode}</span>
       <span class="qli-score">${e.score}/${e.total} · ${e.pct}%</span>
       <span class="qli-time">${e.date} ${e.time}</span>
     </div>`
  ).join('');
}


/* =============================================================
   FILTER STATE
   - selGroup   : top-level lexicon group ('all' or e.g. 'people')
   - selTag     : sub-tag within the group ('all-sub' or e.g. 'family')
   - selLevel   : difficulty level ('all', 'beginner', etc.)
   - selPos     : part of speech ('all', 'noun', etc.)
   - seenOnly / unseenOnly : localStorage-based study set filters
   ============================================================= */

let selGroup   = 'all';
let selTag     = 'all-sub';
let selLevel   = 'all';
let selPos     = 'all';
let seenOnly   = false;
let unseenOnly = false;

function getFiltered() {
  const seen = getSeenCounts();
  return WORDS.filter(w => {
    // Group filter — uses the groups[] array on each word
    const groupOk = selGroup === 'all' || (w.groups && w.groups.includes(selGroup));

    // Sub-tag filter — uses the tags[] array
    const tagOk = selTag === 'all-sub' || (w.tags && w.tags.includes(selTag));

    // Level filter — beginner/intermediate/advanced are tags
    const levelOk = selLevel === 'all' || (w.tags && w.tags.includes(selLevel));

    // Part of speech filter
    const posOk = selPos === 'all' || w.pos === selPos;

    // Seen / unseen
    const seenOk   = !seenOnly   || !!seen[w.word];
    const unseenOk = !unseenOnly || !seen[w.word];

    return groupOk && tagOk && levelOk && posOk && seenOk && unseenOk;
  });
}

function updateFilterCount() {
  const count = getFiltered().length;
  const el    = $('filterCount');
  if (el) el.textContent = `· ${count} word${count !== 1 ? 's' : ''}`;
}


/* =============================================================
   FILTER CHIP WIRING
   ============================================================= */

// Group chips
document.querySelectorAll('#groupChips .chip').forEach(c => c.addEventListener('click', () => {
  selGroup = c.dataset.group;
  selTag   = 'all-sub'; // reset sub-tag when group changes
  updateFilterCount();
}));

// Sub-tag chips (rendered by inline script in practice.html)
document.getElementById('subtagChips').addEventListener('click', e => {
  const chip = e.target.closest('.chip--sub');
  if (!chip) return;
  selTag = chip.id === 'allSubChip' ? 'all-sub' : (chip.dataset.tag || 'all-sub');
  updateFilterCount();
});

// Level chips
document.querySelectorAll('#levelChips .chip').forEach(c => c.addEventListener('click', () => {
  document.querySelectorAll('#levelChips .chip').forEach(x => x.classList.remove('on'));
  c.classList.add('on');
  selLevel = c.dataset.level;
  updateFilterCount();
}));

// POS chips
document.querySelectorAll('#posChips .chip').forEach(c => c.addEventListener('click', () => {
  document.querySelectorAll('#posChips .chip').forEach(x => x.classList.remove('on'));
  c.classList.add('on');
  selPos = c.dataset.pos;
  updateFilterCount();
}));

// Seen / unseen
$('seenOnlyChip').addEventListener('click', () => {
  seenOnly = !seenOnly;
  if (seenOnly) unseenOnly = false;
  $('seenOnlyChip').classList.toggle('on', seenOnly);
  $('unseenOnlyChip').classList.remove('on');
  updateFilterCount();
});

$('unseenOnlyChip').addEventListener('click', () => {
  unseenOnly = !unseenOnly;
  if (unseenOnly) seenOnly = false;
  $('unseenOnlyChip').classList.toggle('on', unseenOnly);
  $('seenOnlyChip').classList.remove('on');
  updateFilterCount();
});


/* =============================================================
   QUIZ ENGINE STATE
   ============================================================= */

const MODE_NAMES = {
  guess:   'Guess the Word',
  meaning: 'Meaning Match',
  gap:     'Fill the Gap',
  match:   'Match Synonym',
  shuffle: 'Game Shuffle'
};

let quizMode   = '';
let questions  = [];
let currentIdx = 0;
let score      = 0;
let matchState = null;


/* =============================================================
   SCREEN MANAGEMENT
   ============================================================= */

function showScreen(id) {
  ['modeScreen', 'quizScreen', 'scoreScreen'].forEach(s => $(s).classList.remove('active'));
  $(id).classList.add('active');
}

function goHome() {
  showScreen('modeScreen');
  renderQuizLog();
}


/* =============================================================
   QUESTION BUILDERS
   ============================================================= */

function buildMC(word, type, pool) {
  const distractors = shuffle(pool.filter(w => w.word !== word.word)).slice(0, 3);
  if (type === 'meaning') {
    const correct = firstDef(word);
    const wrongs  = distractors.map(w => firstDef(w));
    return {
      type: 'meaning', word,
      instruction: 'What does this word mean?',
      main:    word.word,
      sub:     word.phonetic ? `/${word.phonetic}/` : '',
      correct,
      options: shuffle([correct, ...wrongs])
    };
  } else {
    const correct = word.word;
    const wrongs  = distractors.map(w => w.word);
    return {
      type: 'guess', word,
      instruction: 'Which Arrernte word means…',
      main:    `"${firstDef(word)}"`,
      sub:     '',
      correct,
      options: shuffle([correct, ...wrongs])
    };
  }
}

function buildGap(word, pool) {
  const sentence = word.examples && word.examples[0];
  if (sentence) {
    const re      = new RegExp(word.word, 'gi');
    const blanked = re.test(sentence)
      ? sentence.replace(re, '______')
      : sentence + ' (' + '______' + ')';
    return {
      type: 'gap', word,
      instruction: 'Fill in the missing Arrernte word.',
      main:    blanked,
      sub:     word.phonetic ? `Hint: /${word.phonetic}/` : '',
      correct: word.word
    };
  }
  // No example sentence — fall back to meaning MC
  return buildMC(word, 'meaning', pool);
}

function buildMatchBlock(batch) {
  return {
    type:  'match',
    pairs: batch.map(w => ({ word: w.word, def: firstDef(w) }))
  };
}

function buildQuestions(pool, mode) {
  const words = shuffle(pool);

  if (mode === 'match') {
    const rounds = [];
    for (let i = 0; i < words.length; i += 4) {
      const batch = words.slice(i, i + 4);
      if (batch.length >= 2) rounds.push(buildMatchBlock(batch));
    }
    return rounds.slice(0, 3);
  }

  const useWords = words.slice(0, 10);
  return useWords.map((w, i) => {
    let t = mode;
    if (mode === 'shuffle') {
      const cycle = ['guess', 'meaning', 'gap', 'meaning', 'guess'];
      t = cycle[i % cycle.length];
    }
    return t === 'gap' ? buildGap(w, pool) : buildMC(w, t, pool);
  });
}


/* =============================================================
   START QUIZ
   ============================================================= */

function startQuiz(mode) {
  const pool = getFiltered();
  if (pool.length < 2) {
    showToast('Need at least 2 words — adjust filters');
    return;
  }
  quizMode   = mode;
  questions  = buildQuestions(pool, mode);
  currentIdx = 0;
  score      = 0;
  $('quizModeLbl').textContent = MODE_NAMES[mode] || mode;
  showScreen('quizScreen');
  renderQuestion();
}


/* =============================================================
   RENDER QUESTION
   ============================================================= */

function renderQuestion() {
  const q     = questions[currentIdx];
  const total = questions.length;

  $('progFill').style.width = (currentIdx / total * 100) + '%';
  $('progLbl').textContent  = `${currentIdx + 1} / ${total}`;

  $('feedback').textContent = '';
  $('feedback').className   = 'feedback';
  $('nextBtn').classList.remove('show');

  $('ansGrid').innerHTML       = '';
  $('ansGrid').style.display   = 'none';
  $('gapWrap').style.display   = 'none';
  $('matchWrap').style.display = 'none';

  const labels = { guess: 'guess the word', meaning: 'meaning match', gap: 'fill the gap', match: 'match synonym' };
  $('qTypePill').textContent = labels[q.type] || q.type;

  if      (q.type === 'match') renderMatch(q);
  else if (q.type === 'gap')   renderGap(q);
  else                         renderMC(q);
}


/* =============================================================
   RENDERERS
   ============================================================= */

function renderMC(q) {
  $('qInstruction').textContent = q.instruction;
  $('qMain').textContent        = q.main;
  $('qSub').textContent         = q.sub || '';
  $('ansGrid').style.display    = 'grid';
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className   = 'ans-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleMC(btn, opt, q));
    $('ansGrid').appendChild(btn);
  });
}

function renderGap(q) {
  $('qInstruction').textContent = q.instruction;
  $('qMain').textContent        = q.main;
  $('qSub').textContent         = q.sub || '';
  $('gapWrap').style.display    = 'flex';
  $('gapInput').value           = '';
  $('gapInput').className       = 'gap-input';
  $('gapInput').disabled        = false;
  $('gapSubmit').disabled       = false;
  setTimeout(() => $('gapInput').focus(), 50);
}

function renderMatch(q) {
  $('qInstruction').textContent = 'Match each word to its meaning.';
  $('qMain').textContent        = '';
  $('qSub').textContent         = '';
  $('matchWrap').style.display  = 'block';

  matchState = { pairs: q.pairs, selLeft: null, selRight: null, matched: new Set() };

  const lefts  = shuffle(q.pairs.map(p => p.word));
  const rights = shuffle(q.pairs.map(p => p.def));

  $('matchLeft').innerHTML  = '';
  $('matchRight').innerHTML = '';

  lefts.forEach(word => {
    const el = document.createElement('div');
    el.className = 'match-item'; el.textContent = word;
    el.dataset.word = word; el.dataset.side = 'left';
    el.addEventListener('click', () => handleMatch(el));
    $('matchLeft').appendChild(el);
  });
  rights.forEach(def => {
    const el = document.createElement('div');
    el.className = 'match-item'; el.textContent = def;
    el.dataset.def = def; el.dataset.side = 'right';
    el.addEventListener('click', () => handleMatch(el));
    $('matchRight').appendChild(el);
  });
}


/* =============================================================
   ANSWER HANDLERS
   ============================================================= */

function handleMC(btn, chosen, q) {
  const correct = chosen === q.correct;
  btn.classList.add(correct ? 'correct' : 'incorrect');
  if (correct) { setFeedback('Correct! Mwarre!', 'ok'); score++; }
  else {
    setFeedback(`Not quite — "${q.correct}"`, 'bad');
    document.querySelectorAll('.ans-btn').forEach(b => {
      if (b.textContent === q.correct) b.classList.add('correct');
    });
  }
  document.querySelectorAll('.ans-btn').forEach(b => b.disabled = true);
  $('nextBtn').classList.add('show');
}

function handleGapSubmit() {
  const q   = questions[currentIdx];
  const val = $('gapInput').value.trim();
  const ok  = val.toLowerCase() === q.correct.toLowerCase();
  $('gapInput').className = `gap-input ${ok ? 'correct' : 'incorrect'}`;
  $('gapInput').disabled  = true;
  $('gapSubmit').disabled = true;
  if (ok) { setFeedback('Correct! Mwarre!', 'ok'); score++; }
  else      setFeedback(`The answer is "${q.correct}"`, 'bad');
  $('nextBtn').classList.add('show');
}

function handleMatch(el) {
  if (el.classList.contains('matched') || el.classList.contains('disabled')) return;
  const side = el.dataset.side;

  if (side === 'left') {
    document.querySelectorAll('.match-item[data-side="left"]').forEach(x => {
      if (!x.classList.contains('matched')) x.classList.remove('selected');
    });
    el.classList.add('selected');
    matchState.selLeft = el;
  } else {
    document.querySelectorAll('.match-item[data-side="right"]').forEach(x => {
      if (!x.classList.contains('matched')) x.classList.remove('selected');
    });
    el.classList.add('selected');
    matchState.selRight = el;
  }

  if (matchState.selLeft && matchState.selRight) {
    const word = matchState.selLeft.dataset.word;
    const def  = matchState.selRight.dataset.def;
    const pair = matchState.pairs.find(p => p.word === word);
    const ok   = pair && pair.def === def;

    if (ok) {
      matchState.selLeft.classList.replace('selected',  'matched');
      matchState.selRight.classList.replace('selected', 'matched');
      matchState.matched.add(word);
      score++;
      setFeedback('Matched! ✓', 'ok');
    } else {
      [matchState.selLeft, matchState.selRight].forEach(x => {
        x.classList.remove('selected');
        x.classList.add('wrong-flash');
        setTimeout(() => x.classList.remove('wrong-flash'), 500);
      });
      setFeedback('Try again!', 'bad');
    }

    matchState.selLeft = matchState.selRight = null;

    if (matchState.matched.size === matchState.pairs.length) {
      setTimeout(() => {
        setFeedback('All matched! Well done!', 'ok');
        $('nextBtn').classList.add('show');
      }, 300);
    }
  }
}

function setFeedback(msg, cls) {
  $('feedback').textContent = msg;
  $('feedback').className   = `feedback ${cls}`;
}


/* =============================================================
   NEXT / FINISH
   ============================================================= */

function handleNext() {
  currentIdx++;
  if (currentIdx < questions.length) renderQuestion();
  else { $('progFill').style.width = '100%'; finishQuiz(); }
}

function finishQuiz() {
  const total  = questions.length;
  const capped = Math.min(score, total);
  const pct    = Math.round(capped / total * 100);

  saveQuizResult(MODE_NAMES[quizMode], capped, total);

  $('scoreBig').innerHTML       = `${capped} <span>/ ${total}</span>`;
  $('scoreBarFill').style.width = '0%';
  setTimeout(() => { $('scoreBarFill').style.width = pct + '%'; }, 50);

  const quips = [
    [100, 'Perfect! Mwarre anthurre! 🎉'],
    [80,  "Really solid — you're getting it!"],
    [60,  'Good effort, keep practising.'],
    [40,  "A few more sessions and you'll nail it."],
    [0,   'Just getting started — keep going!']
  ];
  $('scoreQuip').textContent = (quips.find(([t]) => pct >= t) || quips.at(-1))[1];
  showScreen('scoreScreen');
}


/* =============================================================
   EVENT WIRING
   ============================================================= */

document.querySelectorAll('.mode-card').forEach(c =>
  c.addEventListener('click', () => startQuiz(c.dataset.mode))
);

$('exitBtn').addEventListener('click', goHome);
$('nextBtn').addEventListener('click', handleNext);
$('gapSubmit').addEventListener('click', handleGapSubmit);
$('gapInput').addEventListener('keydown', e => { if (e.key === 'Enter') handleGapSubmit(); });
$('playAgainBtn').addEventListener('click',  () => startQuiz(quizMode));
$('backToModeBtn').addEventListener('click', goHome);


/* =============================================================
   INIT
   ============================================================= */

renderQuizLog();
updateFilterCount();