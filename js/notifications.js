/* =============================================================
   notifications.js — Notification system for AKALTYE

   WHAT: Manages two types of notifications:
     1. ANNOUNCEMENTS — manually authored, shown to all users.
        Add new ones to the ANNOUNCEMENTS array below.
     2. MILESTONES — auto-generated from user progress data.
        Fire once per threshold, visible until manually cleared.

   HOW:  Read notification IDs are stored in localStorage under
         'akaltye_read_notifications'. Notifications stay visible
         in the panel after being read — they just lose their
         unread status. The badge count only shows unread ones.
         Clearing removes them from the panel permanently.

   ADMIN: To post a new announcement, add an entry to the
         ANNOUNCEMENTS array with a unique id, title, body
         and date. That's it — it will appear for all users
         as unread until they open the panel.
   ============================================================= */


/* =============================================================
   ANNOUNCEMENTS
   Add new entries here to notify all users.
   Each needs a unique id — use announce_XXX format.
   ============================================================= */

const ANNOUNCEMENTS = [
  {
    id:    'announce_001',
    type:  'announcement',
    icon:  'fa-solid fa-bullhorn',
    title: 'Welcome to Akaltye',
    body:  'Start with beginner words to build your foundation. Werte!',
    date:  '2026-04-07',
  },
  // ── Add new announcements below this line ──────────────────
  // {
  //   id:    'announce_002',
  //   type:  'announcement',
  //   icon:  'fa-solid fa-bullhorn',
  //   title: 'New words added',
  //   body:  '150 new words from Chapter 6 are now in the lexicon.',
  //   date:  '2026-04-08',
  // },
];


/* =============================================================
   MILESTONE DEFINITIONS
   Thresholds that generate a notification when reached.
   id must be unique and stable.
   ============================================================= */

const MILESTONE_NOTIFICATIONS = [
  { id: 'milestone_words_10',    icon: 'fa-solid fa-seedling',       title: '10 words studied',     body: 'You\'ve started something special. Keep going!',          check: (s, q, str) => s >= 10   },
  { id: 'milestone_words_25',    icon: 'fa-solid fa-star',           title: '25 words studied',     body: 'A quarter-century of words. You\'re building momentum.',  check: (s, q, str) => s >= 25   },
  { id: 'milestone_words_50',    icon: 'fa-solid fa-fire',           title: '50 words studied',     body: 'Fifty words — real knowledge is forming.',                 check: (s, q, str) => s >= 50   },
  { id: 'milestone_words_100',   icon: 'fa-solid fa-trophy',         title: '100 words studied',    body: 'One hundred words. Truly remarkable work.',                check: (s, q, str) => s >= 100  },
  { id: 'milestone_words_250',   icon: 'fa-solid fa-star-of-david',  title: '250 words studied',    body: 'You\'ve studied over half the lexicon. Outstanding.',      check: (s, q, str) => s >= 250  },
  { id: 'milestone_streak_3',    icon: 'fa-solid fa-bolt',           title: '3 day streak',         body: 'Three days in a row. A habit is forming.',                check: (s, q, str) => str >= 3  },
  { id: 'milestone_streak_7',    icon: 'fa-solid fa-bolt',           title: '7 day streak',         body: 'A full week of learning. Mwerre anthurre!',               check: (s, q, str) => str >= 7  },
  { id: 'milestone_streak_30',   icon: 'fa-solid fa-calendar-check', title: '30 day streak',        body: 'Thirty days — you\'re building something real here.',     check: (s, q, str) => str >= 30 },
  { id: 'milestone_quiz_1',      icon: 'fa-solid fa-check',          title: 'First quiz completed', body: 'Quiz done! Practice makes the words stick.',              check: (s, q, str) => q >= 1   },
  { id: 'milestone_quiz_10',     icon: 'fa-solid fa-graduation-cap', title: '10 quizzes done',      body: 'Ten quizzes completed. You\'re putting in the work.',     check: (s, q, str) => q >= 10  },
];


/* =============================================================
   STORAGE KEYS
   READ  — notifications the user has opened/seen
   CLEARED — notifications permanently removed from the panel
   ============================================================= */

const READ_KEY    = 'akaltye_read_notifications';
const CLEARED_KEY = 'akaltye_cleared_notifications';

function getRead() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY)    || '[]')); } catch { return new Set(); }
}

function getCleared() {
  try { return new Set(JSON.parse(localStorage.getItem(CLEARED_KEY) || '[]')); } catch { return new Set(); }
}

function markRead(id) {
  const read = getRead();
  read.add(id);
  localStorage.setItem(READ_KEY, JSON.stringify([...read]));
}

function markCleared(id) {
  const cleared = getCleared();
  cleared.add(id);
  localStorage.setItem(CLEARED_KEY, JSON.stringify([...cleared]));
}


/* =============================================================
   GET ALL NOTIFICATIONS
   Returns all eligible notifications (threshold met, not cleared),
   each with a `read` boolean.
   Unread milestones first, then unread announcements,
   then read items (oldest achievements last).
   ============================================================= */

export function getAllNotifications() {
  const read    = getRead();
  const cleared = getCleared();

  /* Read user progress */
  const seen      = JSON.parse(localStorage.getItem('lexicon_seen')     || '{}');
  const quizLog   = JSON.parse(localStorage.getItem('lexicon_quiz_log') || '[]');
  const streak    = JSON.parse(localStorage.getItem('lexicon_streak')   || '{}');
  const seenCount = Object.keys(seen).length;
  const quizCount = quizLog.length;
  const streakCount = streak.current || 0;

  /* Milestones — include if threshold met and not cleared */
  const milestones = MILESTONE_NOTIFICATIONS
    .filter(m => !cleared.has(m.id) && m.check(seenCount, quizCount, streakCount))
    .map(m => ({ ...m, type: 'milestone', read: read.has(m.id) }));

  /* Announcements — include if not cleared */
  const announcements = ANNOUNCEMENTS
    .filter(a => !cleared.has(a.id))
    .map(a => ({ ...a, read: read.has(a.id) }));

  const all = [...milestones, ...announcements];

  /* Sort: unread first, read after */
  return all.sort((a, b) => {
    if (a.read === b.read) return 0;
    return a.read ? 1 : -1;
  });
}


/* =============================================================
   MARK ALL VISIBLE AS READ
   Called when the panel is opened.
   ============================================================= */

export function markAllRead() {
  getAllNotifications().forEach(n => markRead(n.id));
}


/* =============================================================
   CLEAR A SINGLE NOTIFICATION
   Permanently removes it from the panel.
   ============================================================= */

export function clearNotification(id) {
  markCleared(id);
}


/* =============================================================
   CLEAR ALL NOTIFICATIONS
   ============================================================= */

export function clearAllNotifications() {
  getAllNotifications().forEach(n => markCleared(n.id));
}


/* =============================================================
   UNREAD COUNT — for the badge
   ============================================================= */

export function getUnreadCount() {
  return getAllNotifications().filter(n => !n.read).length;
}