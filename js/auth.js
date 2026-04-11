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

import { auth, db }           from "./firebase-config.js";
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
   
   Opens Google sign-in popup, creates Firestore user
   doc if this is their first sign-in. 
   @Todo - the setup is supposed to show up once but is every time user signs in 12/04.
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
      
   Clean sign-out of Firebase Auth prevents stale auth state
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
    
   Pages need to know auth state before rendering
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
   
   Convenience helper so pages don't need to import
   auth directly just to get the current user
   ============================================================= */
export function getCurrentUser() {
  return auth.currentUser;
}