/* =============================================================
   auth.js — Authentication helpers for ALKATYE

   WHAT: Google sign-in, sign-out, and a shared auth state
         observer that other pages can import and use.
   HOW:  ES module. Exports signIn(), signOut(), and
         onUserReady(callback) which fires once auth state
         is known (either logged in or not).
   WHY:  Centralising auth logic means every page gets
         consistent behaviour without duplicating code.
   ============================================================= */

import { auth, db }           from "firebase-config.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const provider = new GoogleAuthProvider();


/* =============================================================
   SIGN IN — Google popup
   - WHAT: Opens Google sign-in popup, creates Firestore user
           doc if this is their first sign-in
   - HOW:  signInWithPopup → check if user doc exists →
           create if not → redirect to setup if new user,
           index if returning
   - WHY:  Popup works well on desktop and mobile; the
           first-visit check means setup.html only shows once
   ============================================================= */
export async function signIn() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user   = result.user;

    // Check if this user already has a profile in Firestore
    const userRef  = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // First time — create the user document
      await setDoc(userRef, {
        displayName: user.displayName || '',
        email:       user.email       || '',
        photoURL:    user.photoURL    || '',
        createdAt:   serverTimestamp(),
        setupDone:   false
      });
      // Send to setup
      window.location.href = 'setup.html';
    } else if (!userSnap.data().setupDone) {
      // Has account but never finished setup
      window.location.href = 'setup.html';
    } else {
      // Returning user — go home
      window.location.href = '../index.html';
    }
  } catch (err) {
    console.error('Sign-in failed:', err);
    throw err;
  }
}


/* =============================================================
   SIGN OUT
   - WHAT: Signs the user out of Firebase Auth
   - HOW:  Calls firebaseSignOut, clears local auth cache,
           redirects to index
   - WHY:  Clean sign-out prevents stale auth state
   ============================================================= */
export async function signOut() {
  try {
    await firebaseSignOut(auth);
    localStorage.removeItem('alkatye_uid');
    window.location.href = '../index.html';
  } catch (err) {
    console.error('Sign-out failed:', err);
  }
}


/* =============================================================
   ON USER READY
   - WHAT: Fires callback once auth state is known
   - HOW:  Wraps onAuthStateChanged in a one-time observer;
           callback receives the user object (or null if
           not signed in)
   - WHY:  Pages need to know auth state before rendering
           user-specific content; this avoids race conditions
   ============================================================= */
export function onUserReady(callback) {
  const unsubscribe = onAuthStateChanged(auth, user => {
    unsubscribe(); // only fire once
    callback(user);
  });
}


/* =============================================================
   GET CURRENT USER
   - WHAT: Returns the currently signed-in user synchronously
   - WHY:  Convenience helper so pages don't need to import
           auth directly just to get the current user
   ============================================================= */
export function getCurrentUser() {
  return auth.currentUser;
}