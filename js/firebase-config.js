/* =============================================================
   firebase-config.js — Shared Firebase initialisation

   WHAT: Single source of truth for Firebase config and shared
         service instances (app, db, auth).
   HOW:  ES module — import what you need in each page script.
         Every page that needs Firebase imports from here so the
         config is never duplicated.
   WHY:  One place to update if config changes; avoids
         initialising Firebase multiple times across pages.
   ============================================================= */

import { initializeApp }           from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore }            from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getAuth }                 from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCvEdCqAuwgtJ-02R9xs7nbeBlfn55lYUk",
  authDomain:        "lexicon-69642.firebaseapp.com",
  projectId:         "lexicon-69642",
  storageBucket:     "lexicon-69642.firebasestorage.app",
  messagingSenderId: "40542416693",
  appId:             "1:40542416693:web:ce930dbe96c7d5b3ebe67c",
  measurementId:     "G-17ZB632V40"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };