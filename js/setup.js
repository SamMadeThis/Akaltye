/* =============================================================
   setup.js — Onboarding logic for ALKATYE

   WHAT: Handles interactive option cards on setup.html,
         pre-fills existing answers if editing, saves to
         Firestore and localStorage, then redirects.
   HOW:  ES module loaded by setup.html (pages/).
         Redirects use ../index.html since JS resolves
         relative to the page that loaded it (pages/).
   ============================================================= */

import { db, auth }          from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  doc, getDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";


/* =============================================================
   OPTION CARD INTERACTIVITY
   ============================================================= */
function wireOptions() {
  document.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', () => {
      input.closest('.setup-option').classList.toggle('selected', input.checked);
    });
  });

  document.querySelectorAll('input[type="radio"]').forEach(input => {
    input.addEventListener('change', () => {
      document.querySelectorAll(`input[name="${input.name}"]`).forEach(s => {
        s.closest('.setup-option').classList.remove('selected');
      });
      input.closest('.setup-option').classList.add('selected');
    });
  });
}


/* =============================================================
   READ CURRENT FORM STATE
   ============================================================= */
function readAnswers() {
  const goals = Array.from(
    document.querySelectorAll('input[name="goals"]:checked')
  ).map(i => i.value);
  const levelEl    = document.querySelector('input[name="level"]:checked');
  const identityEl = document.querySelector('input[name="identity"]:checked');
  return {
    goals,
    level:    levelEl    ? levelEl.value    : null,
    identity: identityEl ? identityEl.value : null
  };
}


/* =============================================================
   PRE-FILL EXISTING ANSWERS
   ============================================================= */
function prefillAnswers(profile) {
  if (!profile) return;
  (profile.goals || []).forEach(val => {
    const input = document.querySelector(`input[name="goals"][value="${val}"]`);
    if (input) { input.checked = true; input.closest('.setup-option').classList.add('selected'); }
  });
  if (profile.level) {
    const input = document.querySelector(`input[name="level"][value="${profile.level}"]`);
    if (input) { input.checked = true; input.closest('.setup-option').classList.add('selected'); }
  }
  if (profile.identity) {
    const input = document.querySelector(`input[name="identity"][value="${profile.identity}"]`);
    if (input) { input.checked = true; input.closest('.setup-option').classList.add('selected'); }
  }
}


/* =============================================================
   SAVE TO FIRESTORE + LOCALSTORAGE
   ============================================================= */
async function saveAnswers(uid, answers) {
  await updateDoc(doc(db, 'users', uid), {
    'profile.goals':     answers.goals,
    'profile.level':     answers.level,
    'profile.identity':  answers.identity,
    'profile.updatedAt': serverTimestamp(),
    setupDone: true
  });
  localStorage.setItem('alkatye_profile', JSON.stringify({
    goals:    answers.goals,
    level:    answers.level,
    identity: answers.identity
  }));
}


/* =============================================================
   INIT
   ============================================================= */
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = '../index.html';
    return;
  }

  // Try to load existing answers
  let existingProfile = null;
  const cached = localStorage.getItem('alkatye_profile');
  if (cached) {
    existingProfile = JSON.parse(cached);
  } else {
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) existingProfile = snap.data().profile || null;
    } catch (e) {
      console.warn('Could not load existing profile:', e);
    }
  }

  wireOptions();
  prefillAnswers(existingProfile);

  document.getElementById('saveBtn').addEventListener('click', async () => {
    const btn = document.getElementById('saveBtn');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      await saveAnswers(user.uid, readAnswers());
      window.location.href = '../index.html';
    } catch (err) {
      console.error('Save failed:', err);
      btn.disabled = false;
      btn.textContent = 'Start learning →';
      alert('Something went wrong. Please try again.');
    }
  });

  document.getElementById('skipBtn').addEventListener('click', async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { setupDone: true });
    } catch (e) {
      console.warn('Could not mark setup done:', e);
    }
    window.location.href = '../index.html';
  });
});