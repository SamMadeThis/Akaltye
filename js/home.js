// ═══════════════════════════════════════════════════
//  home.js — Home page auth state handler
//  Uses your existing auth.js functions
// ═══════════════════════════════════════════════════

import { onUserReady } from './auth.js';

// Get the content sections
const signedOutSection = document.querySelector('.track-journey-section');
const signedInSection = document.querySelector('.dashboard-content');

// Wait for auth state to be ready
onUserReady((user) => {
  if (user) {
    // User is signed in
    console.log('✅ User signed in:', user.email);
    
    // Hide sign-in prompt, show dashboard
    if (signedOutSection) signedOutSection.style.display = 'none';
    if (signedInSection) signedInSection.style.display = 'block';
    
    // Load user data
    loadUserDashboard(user);
    
  } else {
    // User is signed out
    console.log('❌ No user signed in');
    
    // Show sign-in prompt, hide dashboard
    if (signedOutSection) signedOutSection.style.display = 'block';
    if (signedInSection) signedInSection.style.display = 'none';
  }
});

// Load user stats and progress
async function loadUserDashboard(user) {
  // Update user name
  const userNameEl = document.getElementById('userName');
  if (userNameEl) {
    const displayName = user.displayName || user.email.split('@')[0];
    userNameEl.textContent = displayName;
  }
  
  // Load stats from localStorage
  const seenCounts = JSON.parse(localStorage.getItem('lexicon_seen') || '{}');
  const totalSeen = Object.keys(seenCounts).length;
  
  const favourites = JSON.parse(localStorage.getItem('lexicon_favourites') || '[]');
  const favCount = favourites.length;
  
  // Update stat displays
  const wordsStudiedEl = document.getElementById('wordsStudied');
  if (wordsStudiedEl) wordsStudiedEl.textContent = totalSeen;
  
  const favCountEl = document.getElementById('favCount');
  if (favCountEl) favCountEl.textContent = favCount;
  
  // Calculate and update progress bar
  const milestone = 500; // Next milestone
  const remaining = milestone - totalSeen;
  const progressPercent = Math.min((totalSeen / milestone) * 100, 100);
  
  const progressFillEl = document.querySelector('.progress-fill');
  if (progressFillEl) {
    progressFillEl.style.width = progressPercent + '%';
  }
  
  const wordsProgressEl = document.getElementById('wordsProgress');
  if (wordsProgressEl && remaining > 0) {
    wordsProgressEl.textContent = `${remaining} more to reach ${milestone}`;
  } else if (wordsProgressEl) {
    wordsProgressEl.textContent = `Milestone reached! 🎉`;
  }
  
  // Calculate streak
  const currentStreak = parseInt(localStorage.getItem('currentStreak') || '0');
  const streakEl = document.getElementById('currentStreak');
  if (streakEl) {
    streakEl.textContent = currentStreak > 0 ? `${currentStreak} days` : '0 days';
  }
}