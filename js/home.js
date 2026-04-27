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
  
  // Calculate streak (you can implement this based on your logic)
  const streakEl = document.getElementById('currentStreak');
  if (streakEl) streakEl.textContent = '0 days'; // Replace with actual streak calculation
}