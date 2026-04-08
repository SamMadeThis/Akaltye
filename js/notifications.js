/* =============================================================
   notifications.js — Notification system for AKALTYE

   WHAT: Manages two types of notifications:
     1. ANNOUNCEMENTS — fetched from the Firestore 'announcements'
        collection. Add new ones via the admin panel at /admin.html.
     2. MILESTONES — auto-generated from user progress in localStorage.

   HOW:  Read notification IDs are stored in localStorage under
         'akaltye_read_notifications'. Notifications stay visible
         in the panel after being read — they just lose their
         unread status. The badge count only shows unread ones.
         Clearing permanently removes them from the panel.
   ============================================================= */

import { db } from './firebase-config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';


/* =============================================================
   MILESTONE DEFINITIONS
   Thresholds that auto-generate a notification when reached.
   id must be unique and stable — used to track read/cleared state.
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
   ============================================================= */

const READ_KEY    = 'akaltye_read_notifications';
const CLEARED_KEY = 'akaltye_cleared_notifications';
const CACHE_KEY   = 'akaltye_announcements_cache';

function getRead()    { try { return new Set(JSON.parse(localStorage.getItem(READ_KEY)    || '[]')); } catch { return new Set(); } }
function getCleared() { try { return new Set(JSON.parse(localStorage.getItem(CLEARED_KEY) || '[]')); } catch { return new Set(); } }

function markRead(id) {
  const read = getRead(); read.add(id);
  localStorage.setItem(READ_KEY, JSON.stringify([...read]));
}

function markCleared(id) {
  const cleared = getCleared(); cleared.add(id);
  localStorage.setItem(CLEARED_KEY, JSON.stringify([...cleared]));
}


/* =============================================================
   FETCH ANNOUNCEMENTS FROM FIRESTORE
   Cached in sessionStorage for the session — new announcements
   appear after the user opens a fresh tab.
   ============================================================= */

let _announcementsCache = null;

async function fetchAnnouncements() {
  if (_announcementsCache) return _announcementsCache;

  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      _announcementsCache = JSON.parse(cached);
      return _announcementsCache;
    }
  } catch {}

  try {
    const snap = await getDocs(collection(db, 'announcements'));
    const announcements = snap.docs.map(d => ({
      id:   d.data().id || d.id,
      type: 'announcement',
      icon: d.data().icon  || 'fa-solid fa-bullhorn',
      title: d.data().title || '',
      body:  d.data().body  || '',
      date:  d.data().date  || '',
    }));
    _announcementsCache = announcements;
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(announcements)); } catch {}
    return announcements;
  } catch (e) {
    console.warn('notifications: could not fetch announcements', e);
    return [];
  }
}


/* =============================================================
   GET ALL NOTIFICATIONS — async
   Returns all eligible notifications each with a `read` boolean.
   Unread first, read after.
   ============================================================= */

export async function getAllNotifications() {
  const read    = getRead();
  const cleared = getCleared();

  /* User progress from localStorage */
  const seen        = JSON.parse(localStorage.getItem('lexicon_seen')     || '{}');
  const quizLog     = JSON.parse(localStorage.getItem('lexicon_quiz_log') || '[]');
  const streak      = JSON.parse(localStorage.getItem('lexicon_streak')   || '{}');
  const seenCount   = Object.keys(seen).length;
  const quizCount   = quizLog.length;
  const streakCount = streak.current || 0;

  /* Milestones */
  const milestones = MILESTONE_NOTIFICATIONS
    .filter(m => !cleared.has(m.id) && m.check(seenCount, quizCount, streakCount))
    .map(m => ({ ...m, type: 'milestone', read: read.has(m.id) }));

  /* Announcements from Firestore */
  const firestoreAnnouncements = await fetchAnnouncements();
  const announcements = firestoreAnnouncements
    .filter(a => !cleared.has(a.id))
    .map(a => ({ ...a, read: read.has(a.id) }));

  const all = [...milestones, ...announcements];

  /* Unread first, read after */
  return all.sort((a, b) => {
    if (a.read === b.read) return 0;
    return a.read ? 1 : -1;
  });
}


/* =============================================================
   MARK ALL VISIBLE AS READ — async
   ============================================================= */

export async function markAllRead() {
  const notifs = await getAllNotifications();
  notifs.forEach(n => markRead(n.id));
}


/* =============================================================
   CLEAR A SINGLE NOTIFICATION
   ============================================================= */

export function clearNotification(id) { markCleared(id); }


/* =============================================================
   CLEAR ALL NOTIFICATIONS — async
   ============================================================= */

export async function clearAllNotifications() {
  const notifs = await getAllNotifications();
  notifs.forEach(n => markCleared(n.id));
}


/* =============================================================
   UNREAD COUNT — async, for the badge
   ============================================================= */

export async function getUnreadCount() {
  const notifs = await getAllNotifications();
  return notifs.filter(n => !n.read).length;
}