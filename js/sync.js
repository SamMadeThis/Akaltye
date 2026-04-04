/* =============================================================
   sync.js — Firestore ↔ localStorage sync for ALKATYE

   WHAT: Write-through cache layer. Every user action writes to
         localStorage immediately (fast, works offline) and then
         writes to Firestore in the background if the user is
         signed in. On first load on a new device, pulls data
         down from Firestore into localStorage.

   HOW:  ES module. Import the write helpers into words.js and
         practice.js. Call pullFromFirestore(uid) once on page
         load when auth state is known.

   WHY:  Keeping sync logic in one file means words.js and
         practice.js stay focused on UI — they just call
         sync helpers instead of writing localStorage directly.

   KEYS SYNCED:
     lexicon_seen           → users/{uid}/activity/seen
     lexicon_log            → users/{uid}/activity/log
     lexicon_favourites     → users/{uid}/activity/favourites
     lexicon_favourite_log  → users/{uid}/activity/favouriteLog
     lexicon_bookmarks      → users/{uid}/activity/bookmarks
     lexicon_bookmark_log   → users/{uid}/activity/bookmarkLog
     lexicon_quiz_log       → users/{uid}/activity/quizLog
   ============================================================= */

import { db } from './firebase-config.js';
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';


/* =============================================================
   INTERNAL HELPERS
   ============================================================= */

// The single Firestore document that holds all activity
const activityRef = uid => doc(db, 'users', uid, 'activity', 'data');

/*
 * writeToFirestore — saves the full activity snapshot
 * Called after every user action. Non-blocking (fire and forget).
 * If it fails, localStorage still has the data — nothing is lost.
 */
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
      updatedAt:    serverTimestamp()
    });
  } catch (e) {
    console.warn('Firestore sync failed — data saved locally:', e);
  }
}


/* =============================================================
   PULL FROM FIRESTORE → LOCALSTORAGE
   Called once on page load when auth state is known.
   Only runs if localStorage appears empty (new device).
   ============================================================= */
export async function pullFromFirestore(uid) {
  // If user already has local data, don't overwrite it
  const alreadyHasData = localStorage.getItem('lexicon_seen');
  if (alreadyHasData) return;

  try {
    const snap = await getDoc(activityRef(uid));
    if (!snap.exists()) return; // No Firestore data yet either

    const data = snap.data();

    // Write each key to localStorage if Firestore has it
    if (data.seen)         localStorage.setItem('lexicon_seen',          JSON.stringify(data.seen));
    if (data.log)          localStorage.setItem('lexicon_log',           JSON.stringify(data.log));
    if (data.favourites)   localStorage.setItem('lexicon_favourites',    JSON.stringify(data.favourites));
    if (data.favouriteLog) localStorage.setItem('lexicon_favourite_log', JSON.stringify(data.favouriteLog));
    if (data.bookmarks)    localStorage.setItem('lexicon_bookmarks',     JSON.stringify(data.bookmarks));
    if (data.bookmarkLog)  localStorage.setItem('lexicon_bookmark_log',  JSON.stringify(data.bookmarkLog));
    if (data.quizLog)      localStorage.setItem('lexicon_quiz_log',      JSON.stringify(data.quizLog));

    console.log('Synced from Firestore ✓');

    // Reload the page so the freshly populated localStorage is used
    window.location.reload();
  } catch (e) {
    console.warn('Could not pull from Firestore:', e);
  }
}


/* =============================================================
   WRITE HELPERS — called from words.js and practice.js
   Each writes to localStorage then syncs to Firestore.
   uid is passed in; if null (not signed in) only localStorage
   is written.
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