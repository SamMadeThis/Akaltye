/* =============================================================
   badges.js — Badge definitions and evaluation for AKALTYE

   WHAT: Single source of truth for all badge definitions.
         Exports evaluateBadges() which reads localStorage and
         returns the full badge list with earned/locked status.
         Also exports updateStreak() which must be called once
         per page load to keep the streak current.

   HOW:  ES module. Import into profile.html.
         No dependencies other than localStorage.

   BADGE CATEGORIES:
     words    — words studied milestones
     streak   — consecutive days of activity
     quiz     — quiz participation and performance
     explore  — favourites, exploration
   ============================================================= */


/* =============================================================
   STREAK — track consecutive days of any activity
   Stored in localStorage as:
   {
     current: number,   // current streak count
     longest: number,   // all-time best streak
     lastDate: string,  // ISO date string of last active day (YYYY-MM-DD)
   }
   ============================================================= */

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "2026-04-06"
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/*
 * updateStreak — call once on any page where the user is active.
 * If the user was last active yesterday → extend streak.
 * If the user was last active today → no change (already counted).
 * If the user missed a day → reset streak to 1.
 * Returns the current streak object.
 */
export function updateStreak() {
  const raw    = localStorage.getItem('lexicon_streak');
  const streak = raw ? JSON.parse(raw) : { current: 0, longest: 0, lastDate: null };
  const today  = todayStr();
  const yesterday = yesterdayStr();

  if (streak.lastDate === today) {
    // Already counted today — no change
    return streak;
  }

  if (streak.lastDate === yesterday) {
    // Consecutive day — extend
    streak.current += 1;
  } else {
    // Gap or first ever use — reset to 1
    streak.current = 1;
  }

  streak.lastDate = today;
  streak.longest  = Math.max(streak.longest, streak.current);
  localStorage.setItem('lexicon_streak', JSON.stringify(streak));
  return streak;
}

export function getStreak() {
  const raw = localStorage.getItem('lexicon_streak');
  return raw ? JSON.parse(raw) : { current: 0, longest: 0, lastDate: null };
}


/* =============================================================
   BADGE DEFINITIONS
   Each badge has:
     id        — unique key (used for persistence)
     category  — 'words' | 'streak' | 'quiz' | 'explore'
     emoji     — displayed in the badge icon
     name      — short display name
     desc      — what earns it (shown under badge)
     check(data) — function that returns true if earned
   ============================================================= */

export const BADGE_DEFINITIONS = [

  // ── WORDS STUDIED ──────────────────────────────────────
  {
    id: 'words_10',
    category: 'words',
    emoji: '🌱',
    name: 'First steps',
    desc: '10 words studied',
    check: ({ seenCount }) => seenCount >= 10,
  },
  {
    id: 'words_25',
    category: 'words',
    emoji: '✨',
    name: 'Growing',
    desc: '25 words studied',
    check: ({ seenCount }) => seenCount >= 25,
  },
  {
    id: 'words_50',
    category: 'words',
    emoji: '🔥',
    name: 'On fire',
    desc: '50 words studied',
    check: ({ seenCount }) => seenCount >= 50,
  },
  {
    id: 'words_100',
    category: 'words',
    emoji: '🌟',
    name: 'Century',
    desc: '100 words studied',
    check: ({ seenCount }) => seenCount >= 100,
  },
  {
    id: 'words_250',
    category: 'words',
    emoji: '🏔️',
    name: 'Deep knowledge',
    desc: '250 words studied',
    check: ({ seenCount }) => seenCount >= 250,
  },

  // ── STREAK ─────────────────────────────────────────────
  {
    id: 'streak_3',
    category: 'streak',
    emoji: '⚡',
    name: '3-day streak',
    desc: '3 days in a row',
    check: ({ streak }) => streak.longest >= 3,
  },
  {
    id: 'streak_7',
    category: 'streak',
    emoji: '🗓️',
    name: 'Week strong',
    desc: '7 days in a row',
    check: ({ streak }) => streak.longest >= 7,
  },
  {
    id: 'streak_30',
    category: 'streak',
    emoji: '🌙',
    name: 'Month of learning',
    desc: '30 days in a row',
    check: ({ streak }) => streak.longest >= 30,
  },

  // ── QUIZ ───────────────────────────────────────────────
  {
    id: 'quiz_first',
    category: 'quiz',
    emoji: '🎯',
    name: 'First practice',
    desc: 'Completed a quiz',
    check: ({ quizCount }) => quizCount >= 1,
    // @Todo the total number on the badge shown on the profile 
    // is the total quiz count, its confusing I need to change 
    // this perhaps just make this a notification but part of a milestone badges 
  },
  {
    id: 'quiz_10',
    category: 'quiz',
    emoji: '📚',
    name: 'Dedicated',
    desc: '10 quizzes done',
    check: ({ quizCount }) => quizCount >= 10,
  },
  {
    id: 'quiz_score_80',
    category: 'quiz',
    emoji: '⭐',
    name: 'Sharp mind',
    desc: 'Scored 80%+ on a quiz',
    check: ({ bestScore }) => bestScore >= 80,
  },
  {
    id: 'quiz_perfect',
    category: 'quiz',
    emoji: '💎',
    name: 'Perfect',
    desc: 'Scored 100% on a quiz',
    check: ({ bestScore }) => bestScore >= 100,
  },

  // ── EXPLORE ────────────────────────────────────────────
  {
    id: 'explore_first_fav',
    category: 'explore',
    emoji: '♥',
    name: 'First favourite',
    desc: 'Favourited a word',
    check: ({ favCount }) => favCount >= 1,
  },
  {
    id: 'explore_fav_10',
    category: 'explore',
    emoji: '💌',
    name: 'Word collector',
    desc: '10 words favourited',
    check: ({ favCount }) => favCount >= 10,
  },
  {
    id: 'explore_first_word',
    category: 'explore',
    emoji: '👁️',
    name: 'Curious',
    desc: 'Studied your first word',
    check: ({ seenCount }) => seenCount >= 1,
  },
];


/* =============================================================
   EVALUATE BADGES
   Reads all relevant localStorage keys and runs each badge's
   check() function. Returns an array of badge objects with an
   `earned` boolean added.
   ============================================================= */

export function evaluateBadges() {
  // Gather all the data badges need to check against
  const seenCounts = JSON.parse(localStorage.getItem('lexicon_seen')      || '{}');
  const quizLog    = JSON.parse(localStorage.getItem('lexicon_quiz_log')  || '[]');
  const favourites = JSON.parse(localStorage.getItem('lexicon_favourites')|| '[]');
  const streak     = getStreak();

  const seenCount = Object.keys(seenCounts).length;
  const quizCount = quizLog.length;
  const favCount  = Array.isArray(favourites) ? favourites.length : 0;

  // Best quiz score ever achieved (as a percentage)
  const bestScore = quizLog.reduce((best, entry) => {
    const pct = entry.pct ?? (entry.total > 0
      ? Math.round((entry.score / entry.total) * 100)
      : 0);
    return Math.max(best, pct);
  }, 0);

  const data = { seenCount, quizCount, favCount, bestScore, streak };

  return BADGE_DEFINITIONS.map(badge => ({
    ...badge,
    earned: badge.check(data),
  }));
}


/* =============================================================
   NEXT BADGE PROGRESS
   Returns the next unearned badge the user is closest to,
   plus their current progress toward it (0–1).
   Used for the "next badge" progress bar on the profile.
   ============================================================= */

export function getNextBadgeProgress() {
  const seenCounts = JSON.parse(localStorage.getItem('lexicon_seen')      || '{}');
  const quizLog    = JSON.parse(localStorage.getItem('lexicon_quiz_log')  || '[]');
  const favourites = JSON.parse(localStorage.getItem('lexicon_favourites')|| '[]');
  const streak     = getStreak();

  const seenCount = Object.keys(seenCounts).length;
  const quizCount = quizLog.length;
  const favCount  = Array.isArray(favourites) ? favourites.length : 0;

  const badges = evaluateBadges();
  const unearned = badges.filter(b => !b.earned);
  if (!unearned.length) return null;

  // Build progress for each unearned badge based on its category/id
  // @Todo I need to go over what milestones should be displayed
  // Badges are small rewards to represent a single action or achievement
  // Milestones are significant high-level checkpoints to represent major progress or a collection of achievements

  //Progress Map should show Milestones only
  const progressMap = {
    words_10:        { current: seenCount, target: 10 },
    words_25:        { current: seenCount, target: 25 },
    words_50:        { current: seenCount, target: 50 },
    words_100:       { current: seenCount, target: 100 },
    words_250:       { current: seenCount, target: 250 },
    streak_3:        { current: streak.longest, target: 3 },
    streak_7:        { current: streak.longest, target: 7 },
    streak_30:       { current: streak.longest, target: 30 },
    quiz_first:      { current: quizCount, target: 1 },
    quiz_10:         { current: quizCount, target: 10 },
    quiz_score_80:   { current: 0, target: 1 },  // binary — either done or not
    quiz_perfect:    { current: 0, target: 1 },
    explore_first_fav:  { current: favCount, target: 1 },
    explore_fav_10:     { current: favCount, target: 10 },
    explore_first_word: { current: seenCount, target: 1 },
  };

  // Pick the unearned badge where the user is closest (highest ratio)
  let best = null;
  let bestRatio = -1;

  for (const badge of unearned) {
    const prog = progressMap[badge.id];
    if (!prog) continue;
    const ratio = prog.target > 0 ? prog.current / prog.target : 0;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = { badge, current: prog.current, target: prog.target, ratio };
    }
  }

  return best;
}