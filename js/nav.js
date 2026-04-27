
// ═══════════════════════════════════════════════════
//  nav.js - Navigation with auth button state
// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
//  nav.js - Navigation with auth button state
// ═══════════════════════════════════════════════════

import { auth } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { signOut } from './auth.js';

const authButton = document.getElementById('authButton');

// Update auth button based on user state
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in - show sign out button
    authButton.innerHTML = `
      <button class="btn-sign-out" id="signOutBtn">
        Sign out
      </button>
    `;
    
    // Add sign out handler
    document.getElementById('signOutBtn').addEventListener('click', async () => {
      await signOut();
    });
    
  } else {
    // User is signed out - show sign in button
    authButton.innerHTML = `
      <a href="pages/login.html" class="btn-sign-in">
        Sign in
      </a>
    `;
  }
});

// Manually toggle checkbox when hamburger is clicked
function setupMenuToggle() {
  const toggle = document.getElementById('menuToggle');
  const icon = document.querySelector('.menu-icon');
  
  if (!toggle || !icon) return;
  
  // Manual toggle on click (bypasses preventDefault issue)
  icon.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    toggle.checked = !toggle.checked;
  });
}

// Update auth button based on sign-in status
function updateNav() {
  const authBtn = document.getElementById('authButton');
  if (!authBtn) return;

  const isSignedIn = checkAuthStatus();

  if (isSignedIn) {
    const user = getCurrentUser();
    authBtn.innerHTML = `
      <div style="display: flex; align-items: center; gap: var(--space-2);">
        <span style="font-family: var(--font-mono); font-size: var(--text-xs); color: var(--clr-surface-a50);">
          ${user.name || 'User'}
        </span>
      </div>
    `;
    authBtn.onclick = () => window.location.href = 'pages/profile.html';
  } else {
    authBtn.textContent = 'Sign in';
    authBtn.onclick = () => window.location.href = 'pages/login.html';
  }
}

// Close menu when clicking outside or on a link
function setupMenuClose() {
  const menuToggle = document.getElementById('menuToggle');
  const menuDrawer = document.querySelector('.menu-drawer');
  
  if (!menuToggle || !menuDrawer) return;

  // Close menu when clicking a link
  const menuLinks = menuDrawer.querySelectorAll('a');
  menuLinks.forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.checked = false;
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    const menuIcon = document.querySelector('.menu-icon');
    if (menuToggle.checked && 
        !menuDrawer.contains(e.target) && 
        !menuIcon.contains(e.target) &&
        !menuToggle.contains(e.target)) {
      menuToggle.checked = false;
    }
  });
}

// Helper functions for auth
function checkAuthStatus() {
  return localStorage.getItem('isSignedIn') === 'true';
}

function getCurrentUser() {
  return {
    name: localStorage.getItem('userName') || 'User'
  };
}

// Initialize everything
function initNav() {
  setupMenuToggle();  // This is the key fix
  updateNav();
  setupMenuClose();
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNav);
} else {
  initNav();
}

// Export for use in other files
export { updateNav, checkAuthStatus, getCurrentUser };