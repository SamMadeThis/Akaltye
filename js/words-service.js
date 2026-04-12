/* =============================================================
   words-service.js — Firestore word fetcher for AKALTYE

   WHAT: Single source of truth for fetching the word lexicon.
         Replaces direct imports of words-data.js across all pages.

   HOW:  Fetches all published words from Firestore on first call,
         then caches the result in sessionStorage so subsequent
         page navigations in the same browser session are instant
         with no extra Firestore reads.

   USAGE:
     import { getWords } from './words-service.js';
     const WORDS = await getWords();

   CACHE:
     Key:  'akaltye_words_cache'
     TTL:  Session only (cleared when tab closes)
         For admin edits to appear: user opens a new tab or
         hard-refreshes (Ctrl+Shift+R / Cmd+Shift+R).

   FIRESTORE:
     Collection: words
     Filter:     published == true
     Order:      word (ascending)
   ============================================================= */

import { db } from './firebase-config.js';
import {
  collection, getDocs, query, where
} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

const CACHE_KEY = 'akaltye_words_cache_v2'; // v2: includes unitId field

let _memoryCache = null; // in-memory for the current page load

/* =============================================================
   getWords — returns the full lexicon array.
   Checks memory → sessionStorage → Firestore in that order.
   ============================================================= */
export async function getWords() {
  /* 1. In-memory — fastest, same page load */
  if (_memoryCache) return _memoryCache;

  /* 2. sessionStorage — fast, same browser session */
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      _memoryCache = JSON.parse(cached);
      return _memoryCache;
    }
  } catch (e) {
    console.warn('words-service: sessionStorage read failed', e);
  }

  /* 3. Firestore — first load of the session */
  try {
    const q    = query(
      collection(db, 'words'),
      where('published', '==', true)
    );
    const snap = await getDocs(q);
    const words = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      definition: doc.data().definition || [],
      tags:       doc.data().tags       || [],
      groups:     doc.data().groups     || [],
      examples:   doc.data().examples   || [],
      notes:      doc.data().notes      || '',
    }));

    /* Sort client-side — avoids needing a Firestore composite index */
    words.sort((a, b) => a.word.localeCompare(b.word));

    /* Cache in sessionStorage */
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(words));
    } catch (e) {
      console.warn('words-service: sessionStorage write failed', e);
    }

    _memoryCache = words;
    return words;

  } catch (e) {
    console.error('words-service: Firestore fetch failed', e);
    return [];
  }
}


/* =============================================================
   clearWordsCache — call after admin edits a word so the next
   getWords() call fetches fresh data from Firestore.
   ============================================================= */
export function clearWordsCache() {
  _memoryCache = null;
  try {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem('akaltye_words_cache'); // clear old key too
  } catch {}
}