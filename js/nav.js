/* =============================================================
   nav.js — Shared navigation for all pages
   Injects the nav HTML, wires up Firebase auth, and applies
   the sign-in / hamburger order swap on the home page only.
   ============================================================= */

import { auth } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';

/* ── Inject nav HTML ── */
document.querySelector('header').innerHTML = `
  <div class="nav-bar">
    <a href="/index.html" class="logo">AKA<span>LTYE</span></a>
    <input id="menu-toggler" type="checkbox" class="menu-toggler">
    <label for="menu-toggler" class="show-menu"><span></span></label>
    <nav class="nav">
      <ul class="nav__menu">
        <li class="nav__item"><a href="/pages/explore.html"   class="nav__link">Explore</a></li>
        <li class="nav__item"><a href="/pages/practice.html"  class="nav__link">Practice</a></li>
        <li class="nav__item"><a href="/pages/profile.html"   class="nav__link">Profile</a></li>
        <li class="nav__item"><a href="/pages/resources.html" class="nav__link">Resources</a></li>
      </ul>
    </nav>
    <div id="navAuth" class="nav-auth"></div>
  </div>
`;

/* ── Home page — swap sign-in before hamburger ──
   Detects the home page by path rather than body class,
   so the shared nav can handle it without per-page markup.
── */
const isHome = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
if (isHome) {
  document.querySelector('.show-menu').style.order = '3';
  document.querySelector('.nav-auth').style.order  = '2';
}

/* ── Auth state — populate #navAuth on every page ── */
const navAuth = document.getElementById('navAuth');

onAuthStateChanged(auth, user => {
  if (user) {
    navAuth.innerHTML = `
      <a href="/pages/profile.html" class="nav-auth-user">
        ${user.photoURL
          ? `<img src="${user.photoURL}" alt="${user.displayName}" class="nav-auth-avatar">`
          : `<div class="nav-auth-initial">${(user.displayName || user.email || '?')[0].toUpperCase()}</div>`
        }
        <span class="nav-auth-name">${(user.displayName || '').split(' ')[0]}</span>
      </a>`;
  } else {
    navAuth.innerHTML = `<a href="/pages/login.html" class="nav-auth-btn">Sign in</a>`;
  }
});