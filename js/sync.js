/* =============================================================
   sync.js — Firestore ↔ localStorage sync for AKALTYE

   WHAT: Write-through cache layer. Every user action writes to
         localStorage immediately (fast, works offline) and then
         writes to Firestore in the background if the user is
         signed in. On sign-in, always pulls from Firestore and
         merges with any existing localStorage data.

   HOW:  ES module. Import write helpers into words.js and
         practice.js. Call pullFromFirestore(uid) once on page
         load when auth state is known.

   WHY:  Keeping sync logic in one file means words.js and
         practice.js stay focused on UI — they just call
         sync helpers instead of writing localStorage directly.

   KEYS SYNCED:
     lexicon_seen           → users/{uid}/activity/data.seen
     lexicon_log            → users/{uid}/activity/data.log
     lexicon_favourites     → users/{uid}/activity/data.favourites
     lexicon_favourite_log  → users/{uid}/activity/data.favouriteLog
     lexicon_bookmarks      → users/{uid}/activity/data.bookmarks
     lexicon_bookmark_log   → users/{uid}/activity/data.bookmarkLog
     lexicon_quiz_log       → users/{uid}/activity/data.quizLog
     lexicon_streak         → users/{uid}/activity/data.streak

   MERGE STRATEGY:
     seen       — union of both sets, keeping higher count per word
     favourites — union of both arrays, deduplicated by word
     bookmarks  — union of both arrays, deduplicated by word
     quiz_log   — merge + deduplicate by iso timestamp, keep newest 50
     log        — merge + deduplicate by iso timestamp, keep newest 200
     streak     — take whichever has the higher longest streak value
   ============================================================= */

import { db } from './firebase-config.js';
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';


/* =============================================================
   INTERNAL — write full snapshot to Firestore
   Non-blocking fire-and-forget. localStorage is always the
   source of truth locally; Firestore gets a copy.
   ============================================================= */

const activityRef = uid => doc(db, 'users', uid, 'activity', 'data');

async function writeToFirestore(uid) {
  try {
    await setDoc(activityRef(uid), {
      seen:         JSON.parse(localStorage.getItem('lexicon_seen')          || '{}'),
      log:          JSON.parse(localStorage.getItem('lexicon_log')           || '[]'),
      favourites:   JSON.parse(localStorage.getItem('lexicon_favourites')    || '[]'),
      favouriteLog: JSON.parse(localStorage.getItem('lexicon_favourite_log') || '[]'),
      bookmarks:    JSON.parse(localStorage.getItem('lexicon_bookmarks')     || '[]'),
      bookmarkLog:  JSON.parse(localStorage.getItem('lexicon_bookmark_log')  || '[]'),
      quizLog:      JSON.parse(localStorage.getItem('lexicon_quiz_log')      || '[]'),
      streak:       JSON.parse(localStorage.getItem('lexicon_streak')        || '{}'),
      updatedAt:    serverTimestamp()
    });
  } catch (e) {
    console.warn('Firestore sync failed — data saved locally:', e);
  }
}


/* =============================================================
   MERGE HELPERS
   Each takes the local value and remote (Firestore) value and
   returns a merged result. Always non-destructive — data from
   either source is never discarded.
   ============================================================= */

/* Union of seen objects — keeps the higher count per word */
function mergeSeen(local, remote) {
  const merged = { ...remote };
  for (const [word, data] of Object.entries(local)) {
    if (!merged[word]) {
      merged[word] = data;
    } else {
      merged[word] = {
        count:    Math.max(merged[word].count || 0, data.count || 0),
        lastSeen: (merged[word].lastSeen || '') > (data.lastSeen || '')
          ? merged[word].lastSeen
          : data.lastSeen
      };
    }
  }
  return merged;
}

/* Union of two word arrays, deduplicated by word string */
function mergeArrayByWord(local, remote) {
  const seen = new Set();
  return [...remote, ...local].filter(item => {
    const key = typeof item === 'string' ? item : item.word;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* Merge two log arrays, deduplicate by iso, sort newest first, cap */
function mergeLogByIso(local, remote, maxItems = 200) {
  const seen = new Set();
  return [...remote, ...local]
    .filter(entry => {
      if (!entry.iso || seen.has(entry.iso)) return false;
      seen.add(entry.iso);
      return true;
    })
    .sort((a, b) => (b.iso || '') > (a.iso || '') ? 1 : -1)
    .slice(0, maxItems);
}

/* Keep whichever streak has the higher longest value */
function mergeStreak(local, remote) {
  if (!remote || typeof remote !== 'object') return local;
  if (!local  || typeof local  !== 'object') return remote;
  return (remote.longest || 0) >= (local.longest || 0) ? remote : local;
}


/* =============================================================
   PULL FROM FIRESTORE → LOCALSTORAGE
   Always runs on sign-in regardless of whether localStorage
   already has data. Merges remote and local so no data from
   either device is ever lost.
   ============================================================= */

export async function pullFromFirestore(uid) {
  try {
    const snap = await getDoc(activityRef(uid));

    if (!snap.exists()) {
      // First time this user has signed in — push local data up
      await writeToFirestore(uid);
      console.log('First sign-in — local data pushed to Firestore ✓');
      return;
    }

    const remote = snap.data();

    // Read current local values
    const localSeen    = JSON.parse(localStorage.getItem('lexicon_seen')          || '{}');
    const localLog     = JSON.parse(localStorage.getItem('lexicon_log')           || '[]');
    const localFavs    = JSON.parse(localStorage.getItem('lexicon_favourites')    || '[]');
    const localFavLog  = JSON.parse(localStorage.getItem('lexicon_favourite_log') || '[]');
    const localBms     = JSON.parse(localStorage.getItem('lexicon_bookmarks')     || '[]');
    const localBmLog   = JSON.parse(localStorage.getItem('lexicon_bookmark_log')  || '[]');
    const localQuizLog = JSON.parse(localStorage.getItem('lexicon_quiz_log')      || '[]');
    const localStreak  = JSON.parse(localStorage.getItem('lexicon_streak')        || '{}');

    // Merge each data type
    const mergedSeen    = mergeSeen(localSeen, remote.seen || {});
    const mergedLog     = mergeLogByIso(localLog, remote.log || [], 200);
    const mergedFavs    = mergeArrayByWord(localFavs, remote.favourites || []);
    const mergedFavLog  = mergeLogByIso(localFavLog, remote.favouriteLog || [], 200);
    const mergedBms     = mergeArrayByWord(localBms, remote.bookmarks || []);
    const mergedBmLog   = mergeLogByIso(localBmLog, remote.bookmarkLog || [], 200);
    const mergedQuizLog = mergeLogByIso(localQuizLog, remote.quizLog || [], 50);
    const mergedStreak  = mergeStreak(localStreak, remote.streak || {});

    // Write merged data back to localStorage
    localStorage.setItem('lexicon_seen',          JSON.stringify(mergedSeen));
    localStorage.setItem('lexicon_log',           JSON.stringify(mergedLog));
    localStorage.setItem('lexicon_favourites',    JSON.stringify(mergedFavs));
    localStorage.setItem('lexicon_favourite_log', JSON.stringify(mergedFavLog));
    localStorage.setItem('lexicon_bookmarks',     JSON.stringify(mergedBms));
    localStorage.setItem('lexicon_bookmark_log',  JSON.stringify(mergedBmLog));
    localStorage.setItem('lexicon_quiz_log',      JSON.stringify(mergedQuizLog));
    localStorage.setItem('lexicon_streak',        JSON.stringify(mergedStreak));

    // Push the merged result back to Firestore so both devices
    // end up with the same unified state
    await writeToFirestore(uid);

    console.log('Synced and merged from Firestore ✓');

    // Reload only if data actually changed so the UI reflects
    // the merged state. Compare sizes as a cheap heuristic.
    const seenChanged = Object.keys(mergedSeen).length    !== Object.keys(localSeen).length;
    const favsChanged = mergedFavs.length                 !== localFavs.length;
    const quizChanged = mergedQuizLog.length              !== localQuizLog.length;

    if (seenChanged || favsChanged || quizChanged) {
      window.location.reload();
    }

  } catch (e) {
    console.warn('Could not pull from Firestore:', e);
  }
}


/* =============================================================
   WRITE HELPERS — called from words.js and practice.js
   ============================================================= */

export function syncSeen(uid, seenCounts, viewLog) {
  localStorage.setItem('lexicon_seen', JSON.stringify(seenCounts));
  localStorage.setItem('lexicon_log',  JSON.stringify(viewLog));
  if (uid) writeToFirestore(uid);
}

export function syncFavourites(uid, favouritesArray, favouriteLog) {
  localStorage.setItem('lexicon_favourites',    JSON.stringify(favouritesArray));
  localStorage.setItem('lexicon_favourite_log', JSON.stringify(favouriteLog));
  if (uid) writeToFirestore(uid);
}

export function syncBookmarks(uid, bookmarksArray, bookmarkLog) {
  localStorage.setItem('lexicon_bookmarks',    JSON.stringify(bookmarksArray));
  localStorage.setItem('lexicon_bookmark_log', JSON.stringify(bookmarkLog));
  if (uid) writeToFirestore(uid);
}

export function syncQuizLog(uid, quizLog) {
  localStorage.setItem('lexicon_quiz_log', JSON.stringify(quizLog));
  if (uid) writeToFirestore(uid);
}

export function syncStreak(uid, streak) {
  localStorage.setItem('lexicon_streak', JSON.stringify(streak));
  if (uid) writeToFirestore(uid);
}