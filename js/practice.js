/* =============================================================
   practice.js — Quiz logic for ALKATYE
   
   WHY:  Separating behaviour from structure (HTML) and style
         (CSS) makes the codebase easier to read, debug and
         extend independently.
   HOW:  Loaded as type="module" in practice.html so ES module
         imports work correctly.
   WHAT: Handles filter state, question generation for all four
         quiz types, answer evaluation, screen transitions,
         score tracking and localStorage persistence.
   ============================================================= */


/* =============================================================
   WORD DATA
   - WHAT: The full lexicon of Arrernte words used across quizzes
   - HOW:  Plain JS array of objects — each word has: word,
           phonetic, pos, definition (array), example1, tags
   - WHY:  Single source of truth; kept here so practice.js can build
           questions without fetching from a server.
           Keep in sync with words.js when adding new entries.
   ============================================================= */
const WORDS = [
  {
    word: "Ye",
    phonetic: "Ya",
    pos: "noun",
    definition: [
      "Yes, Yeah",
      "May be an answer to a negative question"
    ],
    example1: "Re ikwere ilelheke, 'Ye, ayengearle mwarre anteme awelheme.'",
    tags: ["beginner"]
  },
  {
    word: "Mparntwe",
    phonetic: "m'barn-twa",
    pos: "noun",
    definition: ["The Alice Springs town area"],
    example1: "",
    tags: ["beginner", "country"]
  },
  {
    word: "Mwarre",
    phonetic: "mwa-rra",
    pos: "adjective",
    definition: [
      "Good, right, proper",
      "Nice, pleasant, enjoyable",
      "In working order, OK",
      "As wanted, as expected",
      "Healthy, well, better, uninjured",
      "Easy, convenient",
      "Well, properly",
      "Peacefully, contentedly, happily",
      "Safe"
    ],
    example1: "Mwarre anthurre, unte arratye ingkirre mpwarerne. Very good, you've done it all correctly.",
    tags: ["beginner"]
  },
  {
    word: "Kwatye",
    phonetic: "Kwa-dja",
    pos: "noun",
    definition: [
      "Water",
      "Rain",
      "A general term for water in various forms",
      "Ice, vapour, rain, rain clouds",
      "Weather related to rain"
    ],
    example1: "Thipe nyingkele apele kwatye imerntye akngerre unte apeke aparlpe-arle-irreke kwatye arrangkwe.",
    tags: ["weather", "beginner"]
  },
  {
    word: "Werte",
    phonetic: "wer-da",
    pos: "interjection",
    definition: [
      "Greeting",
      "Whats up? Hello!"
    ],
    example1: "Werte? Inwenheke-ame unte atyenge antangkelhene. Whats up? Why did you send for me?",
    tags: ["interaction", "beginner"]
  },
  {
    word: "Apmere",
    phonetic: "Ap-mara",
    pos: "noun",
    definition: [
      "Country, land, region",
      "Place, location, site, spot",
      "Camp, home, house",
      "An area of land and the things on it",
      "Goes before words of which one of the meanings refers to a (type of) place or area"
    ],
    example1: "",
    tags: ["country", "beginner"]
  },
  {
    word: "Urreke",
    phonetic: "oo-ree-ga",
    pos: "interjection",
    definition: ["Goodbye", "Farewell"],
    example1: "Urreke! Nhenhe apetyeke. Goodbye! See you later.",
    tags: ["interaction", "beginner"]
  },
  {
    word: "Arrangkwe",
    phonetic: "a-rang-kwa",
    pos: "interjection",
    definition: ["No", "A negative response", "Not"],
    example1: "Arrangkwe, ayenge arratye-apetyeke. No, I'm not coming back.",
    tags: ["beginner"]
  },
  {
    word: "Inwenhe",
    phonetic: "in-wan-ya",
    pos: "noun",
    definition: ["What", "What is it? Used to ask about something"],
    example1: "Inwenhe nhenhe? What is this?",
    tags: ["beginner"]
  },
  {
    word: "Angwenhe",
    phonetic: "ang-wan-ya",
    pos: "noun",
    definition: ["Who", "Which person?"],
    example1: "Angwenhe unte? Who are you?",
    tags: ["beginner"]
  }
];


/* =============================================================
   UTILITY FUNCTIONS
   - WHAT: Small pure helpers reused across the quiz engine
   - HOW:  Arrow functions; no side effects
   - WHY:  Keeps the main logic blocks cleaner and testable
   ============================================================= */

/*
 * $ — quick getElementById shorthand
 * - WHAT: Gets a DOM element by id
 * - HOW:  Wraps document.getElementById
 * - WHY:  Saves repetition across dozens of DOM lookups
 */
const $ = id => document.getElementById(id);

/*
 * shuffle — Fisher-Yates in-place shuffle (returns new array)
 * - WHAT: Randomly reorders an array without mutating the original
 * - HOW:  Copies array, walks backwards swapping random pairs
 * - WHY:  Needed to randomise word order and answer option order
 *         every quiz so the same sequence never repeats
 */
const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/*
 * firstDef — picks a definition from a word, cycling through all senses
 * - WHAT: Returns one definition string from the word's definition array.
 *         Cycles through all senses across calls so repeated quizzes on
 *         the same word expose different definitions each time.
 * - HOW:  Module-level Map (defIndex) tracks the next index per word.
 *         Increments after each call, wraps back to 0 at the end.
 * - WHY:  Words like Mwarre have 9 definitions — always using [0]
 *         wastes those senses. Cycling means users gradually learn
 *         all meanings of a word, not just the primary one.
 */
const defIndex = new Map(); // { wordString → nextIndex }

const firstDef = w => {
  const defs = Array.isArray(w.definition) ? w.definition : [w.definition];
  if (defs.length === 1) return defs[0];
  const i = defIndex.get(w.word) || 0;
  defIndex.set(w.word, (i + 1) % defs.length);
  return defs[i];
};

/*
 * showToast — briefly displays a confirmation message
 * - WHAT: Shows the #toast element with a message for 1.8s
 * - HOW:  Sets textContent, adds .show class, removes after timeout
 * - WHY:  Non-blocking feedback (e.g. "log cleared") that doesn't
 *         interrupt quiz flow with a modal
 */
function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}


/* =============================================================
   LOCALSTORAGE — READ & WRITE
   - WHAT: Functions to read the seen-words map and quiz log,
           and to save a new quiz result after finishing
   - HOW:  JSON.parse/stringify with fallback empty defaults
   - WHY:  Persists progress across sessions without a server;
           the quiz log is read by history.js on history.html
   ============================================================= */

/*
 * getSeenCounts — reads the word-seen map written by words.js
 * - Returns: { "Word": { count: N, lastSeen: ISO } }
 */
const getSeenCounts = () => JSON.parse(localStorage.getItem('lexicon_seen') || '{}');

/*
 * getQuizLog — reads the array of past quiz results
 * - Returns: [{ mode, score, total, pct, time, date, iso }, …]
 */
const getQuizLog = () => JSON.parse(localStorage.getItem('lexicon_quiz_log') || '[]');

/*
 * saveQuizResult — appends a new result to the quiz log
 * - WHAT: Records mode name, score, total, percentage and
 *         human-readable date/time for history.html to display
 * - HOW:  Prepends to array (newest first), caps at 50 entries
 * - WHY:  History page reads this key to show quiz activity log
 */
function saveQuizResult(mode, score, total) {
  const log = getQuizLog();
  const now = new Date();
  log.unshift({
    mode,
    score,
    total,
    pct: Math.round(score / total * 100),
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: now.toLocaleDateString([], { day: 'numeric', month: 'short' }),
    iso: now.toISOString()
  });
  localStorage.setItem('lexicon_quiz_log', JSON.stringify(log.slice(0, 50)));
}


/* =============================================================
   RECENT QUIZ LOG RENDERER (mode screen)
   - WHAT: Renders the last 6 quiz results into #quizLogContainer
   - HOW:  Reads lexicon_quiz_log, maps to HTML rows, injects
   - WHY:  Motivates users by showing recent activity without
           needing to navigate to history.html
   ============================================================= */
function renderQuizLog() {
  const log = getQuizLog();
  const c = $('quizLogContainer');
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
   - WHAT: Tracks the user's current tag, POS, seen/unseen
           selections; used to narrow the word pool before a quiz
   - HOW:  Module-level variables updated by chip click handlers
   - WHY:  Persisted in memory for the session so filters survive
           moving between home → quiz → score → home
   ============================================================= */
let selTag     = 'all';
let selPos     = 'all';
let seenOnly   = false;
let unseenOnly = false;

/*
 * getFiltered — returns WORDS filtered by current selections
 * - WHAT: Intersects tag, POS, and seen/unseen filters
 * - HOW:  Array.filter with four independent boolean tests
 * - WHY:  Called at quiz start to determine the actual word pool
 */
function getFiltered() {
  const seen = getSeenCounts();
  return WORDS.filter(w => {
    const tagOk    = selTag === 'all'  || (w.tags && w.tags.includes(selTag));
    const posOk    = selPos === 'all'  || w.pos === selPos;
    const seenOk   = !seenOnly        || !!seen[w.word];
    const unseenOk = !unseenOnly      || !seen[w.word];
    return tagOk && posOk && seenOk && unseenOk;
  });
}

/*
 * Chip click handlers — tag, POS, seen/unseen
 * - WHAT: Wire the filter chip buttons on the mode screen
 * - HOW:  Remove .on from siblings, add .on to clicked chip,
 *         update the relevant filter variable
 * - WHY:  Single-select per group; seen/unseen are mutually
 *         exclusive toggles so selecting one clears the other
 */
document.querySelectorAll('#tagChips .chip').forEach(c => c.addEventListener('click', () => {
  document.querySelectorAll('#tagChips .chip').forEach(x => x.classList.remove('on'));
  c.classList.add('on');
  selTag = c.dataset.tag;
}));

document.querySelectorAll('#posChips .chip').forEach(c => c.addEventListener('click', () => {
  document.querySelectorAll('#posChips .chip').forEach(x => x.classList.remove('on'));
  c.classList.add('on');
  selPos = c.dataset.pos;
}));

$('seenOnlyChip').addEventListener('click', () => {
  seenOnly = !seenOnly;
  if (seenOnly) unseenOnly = false;
  $('seenOnlyChip').classList.toggle('on', seenOnly);
  $('unseenOnlyChip').classList.remove('on');
});

$('unseenOnlyChip').addEventListener('click', () => {
  unseenOnly = !unseenOnly;
  if (unseenOnly) seenOnly = false;
  $('unseenOnlyChip').classList.toggle('on', unseenOnly);
  $('seenOnlyChip').classList.remove('on');
});


/* =============================================================
   QUIZ ENGINE — STATE
   - WHAT: Module-level variables tracking active quiz progress
   - HOW:  Reset at the start of each new quiz in startQuiz()
   - WHY:  Must persist across renderQuestion() calls within a
           single quiz session
   ============================================================= */
const MODE_NAMES = {
  guess:   'Guess the Word',
  meaning: 'Meaning Match',
  gap:     'Fill the Gap',
  match:   'Match Synonym',
  shuffle: 'Game Shuffle'
};

let quizMode   = '';   // current mode key
let questions  = [];   // array of built question objects
let currentIdx = 0;    // which question is showing
let score      = 0;    // running correct-answer count
let matchState = null; // active state for match-synonym round


/* =============================================================
   SCREEN MANAGEMENT
   - WHAT: Shows one of three screens (mode / quiz / score)
   - HOW:  Removes .active from all .screen elements, adds it
           to the requested one
   - WHY:  Simple SPA-style navigation without a router or reload
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
   - WHAT: Pure functions that return a structured question object
   - HOW:  Each builder returns { type, word, instruction, main,
           sub, correct, options? / pairs? }
   - WHY:  Separating construction from rendering keeps each
           concern small and testable in isolation
   ============================================================= */

/*
 * buildMC — multiple-choice question (Guess the Word OR Meaning Match)
 * - WHAT: Picks 3 distractor words from the pool, builds 4 options
 * - HOW:  type='guess' → show English, pick Arrernte
 *         type='meaning' → show Arrernte, pick English definition
 *         firstDef() cycles through all definitions across quiz sessions
 * - WHY:  Reuses one builder for two modes; cycling definitions means
 *         users encounter all senses of a word over time
 */
function buildMC(word, type, pool) {
  const distractors = shuffle(pool.filter(w => w.word !== word.word)).slice(0, 3);
  if (type === 'meaning') {
    const correct = firstDef(word);
    const wrongs  = distractors.map(w => firstDef(w));
    return {
      type: 'meaning', word,
      instruction: 'What does this word mean?',
      main: word.word,
      sub: word.phonetic ? `/${word.phonetic}/` : '',
      correct,
      options: shuffle([correct, ...wrongs])
    };
  } else {
    // type === 'guess'
    const correct = word.word;
    const wrongs  = distractors.map(w => w.word);
    return {
      type: 'guess', word,
      instruction: 'Which Arrernte word means…',
      main: `"${firstDef(word)}"`,
      sub: '',
      correct,
      options: shuffle([correct, ...wrongs])
    };
  }
}

/*
 * buildGap — fill-in-the-gap question (Fill the Gap)
 * - WHAT: Takes a word's example sentence and blanks out the target word;
 *         falls back to a definition-based sentence if no example exists
 * - HOW:  RegExp replace of the word with '______';
 *         firstDef() cycles so the fallback sentence also rotates
 * - WHY:  Contextual sentences reinforce word-in-use recall
 */
function buildGap(word) {
  let sentence = word.example1 || '';
  const re = new RegExp(word.word, 'gi');
  if (sentence && re.test(sentence)) {
    sentence = sentence.replace(re, '______');
  } else {
    sentence = `The word ______ means: ${firstDef(word)}.`;
  }
  return {
    type: 'gap', word,
    instruction: 'Fill in the missing Arrernte word.',
    main: sentence,
    sub: word.phonetic ? `Hint: /${word.phonetic}/` : '',
    correct: word.word
  };
}

/*
 * buildMatchBlock — one round of the Match Synonym game
 * - WHAT: Takes a batch of 2–4 words and creates a pairing round
 * - HOW:  Maps words to { word, def } pairs using firstDef()
 *         so definitions cycle across sessions
 * - WHY:  Grouping into rounds keeps each screen manageable on mobile
 */
function buildMatchBlock(batch) {
  return {
    type: 'match',
    pairs: batch.map(w => ({ word: w.word, def: firstDef(w) }))
  };
}

/*
 * buildQuestions — assembles the full question list for a quiz
 * - WHAT: Shuffles the filtered word pool and creates up to 10
 *         questions (or up to 3 match rounds for match mode)
 * - HOW:  For 'match' → groups words into batches of 4
 *         For 'shuffle' → cycles through all four types
 *         For single modes → calls the matching builder per word
 * - WHY:  Centralises all question assembly so startQuiz() only
 *         needs to call one function
 */
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
    return t === 'gap' ? buildGap(w) : buildMC(w, t, pool);
  });
}


/* =============================================================
   START QUIZ
   - WHAT: Entry point called when a mode card is clicked
   - HOW:  Filters words, builds questions, resets state,
           switches to quiz screen and renders first question
   - WHY:  All setup in one place so mode cards only need
           data-mode attributes — no inline JS
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
   - WHAT: Draws the current question onto the quiz screen
   - HOW:  Resets all answer containers, updates progress bar,
           sets type pill, then routes to the correct renderer
   - WHY:  Single entry point keeps the Next button handler simple
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

  const labels = {
    guess:   'guess the word',
    meaning: 'meaning match',
    gap:     'fill the gap',
    match:   'match synonym'
  };
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

  matchState = {
    pairs:    q.pairs,
    selLeft:  null,
    selRight: null,
    matched:  new Set()
  };

  const lefts  = shuffle(q.pairs.map(p => p.word));
  const rights = shuffle(q.pairs.map(p => p.def));

  $('matchLeft').innerHTML  = '';
  $('matchRight').innerHTML = '';

  lefts.forEach(word => {
    const el = document.createElement('div');
    el.className    = 'match-item';
    el.textContent  = word;
    el.dataset.word = word;
    el.dataset.side = 'left';
    el.addEventListener('click', () => handleMatch(el));
    $('matchLeft').appendChild(el);
  });

  rights.forEach(def => {
    const el = document.createElement('div');
    el.className    = 'match-item';
    el.textContent  = def;
    el.dataset.def  = def;
    el.dataset.side = 'right';
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
  if (correct) {
    setFeedback('Correct! Mwarre!', 'ok');
    score++;
  } else {
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
  if (ok) {
    setFeedback('Correct! Mwarre!', 'ok');
    score++;
  } else {
    setFeedback(`The answer is "${q.correct}"`, 'bad');
  }
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

    matchState.selLeft  = null;
    matchState.selRight = null;

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
   NEXT BUTTON HANDLER
   ============================================================= */
function handleNext() {
  currentIdx++;
  if (currentIdx < questions.length) {
    renderQuestion();
  } else {
    $('progFill').style.width = '100%';
    finishQuiz();
  }
}


/* =============================================================
   FINISH QUIZ
   ============================================================= */
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
   INITIALISATION
   ============================================================= */
renderQuizLog();