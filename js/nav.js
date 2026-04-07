/* =============================================================
   nav.js — Shared navigation for all pages
   Injects nav HTML, auth state, and notification bell/dropdown.
   ============================================================= */

import { auth }               from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { getAllNotifications, markAllRead, clearNotification, clearAllNotifications, getUnreadCount } from './notifications.js';

/* ── Load Font Awesome if not already present ── */
if (!document.querySelector('script[src*="fontawesome"]')) {
  const fa = document.createElement('script');
  fa.src         = 'https://kit.fontawesome.com/7c89d7deb7.js';
  fa.crossOrigin = 'anonymous';
  document.head.appendChild(fa);
}

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
    <div class="nav-bell-wrap" id="navBellWrap">
      <button class="nav-bell" id="navBell" aria-label="Notifications">
        <i class="fa-regular fa-bell"></i>
        <span class="nav-bell-badge" id="navBellBadge" style="display:none"></span>
      </button>
    </div>
    <div id="navAuth" class="nav-auth"></div>
  </div>
`;

/* ── Inject notification dropdown into body (outside header
   so it can overlap page content without clipping) ── */
const dropdown = document.createElement('div');
dropdown.id        = 'navNotifPanel';
dropdown.className = 'nav-notif-panel';
dropdown.innerHTML = `<div class="nav-notif-inner" id="navNotifInner"></div>`;
document.body.appendChild(dropdown);

/* ── Inject nav styles ── */
const style = document.createElement('style');
style.textContent = `
  /* Bell button */
  .nav-bell-wrap { position: relative; flex-shrink: 0; }

  .nav-bell {
    background: none;
    border: none;
    cursor: pointer;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--clr-surface-a50);
    font-size: 1rem;
    transition: color 0.15s ease, background 0.15s ease;
    position: relative;
  }
  .nav-bell:hover { color: var(--clr-ochre); background: rgba(184,115,51,0.08); }
  .nav-bell.active { color: var(--clr-ochre); }

  /* Ochre badge dot with count */
  .nav-bell-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    min-width: 16px;
    height: 16px;
    background: var(--clr-ochre);
    color: #1a0a00;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    border-radius: 99px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    pointer-events: none;
    line-height: 1;
  }

  /* Dropdown panel */
  .nav-notif-panel {
    position: fixed;
    top: 61px;
    right: var(--space-4);
    width: min(360px, calc(100vw - 2rem));
    background: var(--clr-surface-tonal-a0);
    border: 0.5px solid var(--clr-surface-a20);
    border-radius: var(--radius-md);
    z-index: 300;
    overflow: hidden;
    opacity: 0;
    transform: translateY(-8px);
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  .nav-notif-panel.open {
    opacity: 1;
    transform: translateY(0);
    pointer-events: all;
  }

  .nav-notif-inner { display: flex; flex-direction: column; }

  /* Panel header */
  .nav-notif-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 0.5px solid var(--clr-surface-a10);
  }
  .nav-notif-title {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--clr-surface-a40);
  }
  .nav-notif-clear-all {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--clr-surface-a30);
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.15s ease;
    padding: 0;
  }
  .nav-notif-clear-all:hover { color: var(--clr-ochre); }

  /* Notification items */
  .nav-notif-list { max-height: 400px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--clr-surface-a20) transparent; }

  .nav-notif-item {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-4);
    border-bottom: 0.5px solid var(--clr-surface-a10);
    transition: background 0.15s ease;
  }
  .nav-notif-item:last-child { border-bottom: none; }
  .nav-notif-item:hover { background: rgba(184,115,51,0.04); }

  .nav-notif-icon {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(184,115,51,0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: var(--clr-ochre);
    margin-top: 1px;
  }
  .nav-notif-icon.announcement {
    background: rgba(201,175,194,0.12);
    color: var(--clr-primary-a0);
  }

  .nav-notif-body { flex: 1; min-width: 0; }
  .nav-notif-item-title {
    font-family: var(--font-body);
    font-size: var(--text-base);
    color: var(--clr-light);
    line-height: 1.4;
    margin-bottom: 2px;
  }
  .nav-notif-item-body {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--clr-surface-a40);
    line-height: 1.6;
    letter-spacing: 0.02em;
  }
  .nav-notif-item-date {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--clr-surface-a30);
    margin-top: var(--space-1);
  }

  .nav-notif-dismiss {
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--clr-surface-a30);
    font-size: 12px;
    padding: 2px;
    line-height: 1;
    transition: color 0.15s ease;
  }
  .nav-notif-dismiss:hover { color: var(--clr-ochre); }

  /* Read item — muted styling */
  .nav-notif-item.is-read .nav-notif-item-title { color: var(--clr-surface-a50); }
  .nav-notif-item.is-read .nav-notif-icon { opacity: 0.5; }

  /* Unread indicator dot */
  .nav-notif-unread-dot {
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--clr-ochre);
    margin-top: 8px;
  }
  .nav-notif-empty {
    padding: var(--space-8) var(--space-4);
    text-align: center;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--clr-surface-a30);
    letter-spacing: 0.06em;
  }
`;
document.head.appendChild(style);

/* ── Render notification panel ── */
function renderPanel() {
  const notifications = getAllNotifications();
  const inner = document.getElementById('navNotifInner');

  if (notifications.length === 0) {
    inner.innerHTML = `
      <div class="nav-notif-header">
        <span class="nav-notif-title">Notifications</span>
      </div>
      <div class="nav-notif-empty">You're all caught up</div>`;
    return;
  }

  const items = notifications.map(n => {
    const iconClass  = n.type === 'announcement' ? 'announcement' : '';
    const readClass  = n.read ? 'is-read' : '';
    const unreadDot  = !n.read ? '<span class="nav-notif-unread-dot"></span>' : '';
    const date = n.date
      ? `<div class="nav-notif-item-date">${n.date}</div>`
      : '';
    return `
      <div class="nav-notif-item ${readClass}" data-id="${n.id}">
        ${unreadDot}
        <div class="nav-notif-icon ${iconClass}">
          <i class="${n.icon}"></i>
        </div>
        <div class="nav-notif-body">
          <div class="nav-notif-item-title">${n.title}</div>
          <div class="nav-notif-item-body">${n.body}</div>
          ${date}
        </div>
        <button class="nav-notif-dismiss" data-clear="${n.id}" aria-label="Clear">✕</button>
      </div>`;
  }).join('');

  inner.innerHTML = `
    <div class="nav-notif-header">
      <span class="nav-notif-title">Notifications</span>
      <button class="nav-notif-clear-all" id="notifClearAll">Clear all</button>
    </div>
    <div class="nav-notif-list">${items}</div>`;

  /* Clear individual */
  inner.querySelectorAll('[data-clear]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      clearNotification(btn.dataset.clear);
      updateBadge();
      renderPanel();
    });
  });

  /* Clear all */
  inner.querySelector('#notifClearAll')?.addEventListener('click', () => {
    clearAllNotifications();
    updateBadge();
    renderPanel();
  });
}

/* ── Update badge count ── */
function updateBadge() {
  const count = getUnreadCount();
  const badge = document.getElementById('navBellBadge');
  if (!badge) return;
  if (count === 0) {
    badge.style.display = 'none';
  } else {
    badge.style.display = 'flex';
    badge.textContent   = count > 9 ? '9+' : String(count);
  }
}

/* ── Bell toggle ── */
let panelOpen = false;

document.getElementById('navBell').addEventListener('click', e => {
  e.stopPropagation();
  panelOpen = !panelOpen;
  dropdown.classList.toggle('open', panelOpen);
  document.getElementById('navBell').classList.toggle('active', panelOpen);
  if (panelOpen) {
    renderPanel();
    markAllRead();
    updateBadge();
  }
});

/* ── Close on outside click ── */
document.addEventListener('click', e => {
  if (panelOpen && !dropdown.contains(e.target) && e.target.id !== 'navBell') {
    panelOpen = false;
    dropdown.classList.remove('open');
    document.getElementById('navBell').classList.remove('active');
  }
});

/* ── Close on escape ── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && panelOpen) {
    panelOpen = false;
    dropdown.classList.remove('open');
    document.getElementById('navBell').classList.remove('active');
  }
});

/* ── Initial badge render ── */
updateBadge();

/* ── Home page — swap sign-in before hamburger ── */
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