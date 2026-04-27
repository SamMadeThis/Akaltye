// home.js - Updated for prominent sign-in gate
// Matches user's current design, just with sign-in section moved up

// Word of the day data
const wordOfTheDay = {
  word: "Akaltye",
  phonetic: "/ə-ɡəl-tʲɛ/",
  definition: "Language, tongue, speech. The Arrernte language specifically.",
  example: "We're learning akaltye at school."
};

// Update word of the day display
function updateWordOfTheDay() {
  const wotdCard = document.getElementById('wotdCard');
  const wordEl = document.getElementById('wotdWord');
  const phoneticEl = document.getElementById('wotdPhonetic');
  const defEl = document.getElementById('wotdDef');
  const exampleEl = document.getElementById('wotdExample');

  if (!wotdCard || !wordEl || !phoneticEl || !defEl || !exampleEl) return;

  // Set the word data
  wordEl.textContent = wordOfTheDay.word;
  phoneticEl.textContent = wordOfTheDay.phonetic;
  defEl.textContent = wordOfTheDay.definition;
  exampleEl.textContent = wordOfTheDay.example;

  // Trigger animation on scroll
  observeWOTD();
}

// Animate WOTD on scroll
function observeWOTD() {
  const wotdCard = document.getElementById('wotdCard');
  if (!wotdCard) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        wotdCard.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.2
  });

  observer.observe(wotdCard);
}

// Update auth sections based on sign-in status
function updateAuthSections() {
  const signinPrompt = document.getElementById('signinPrompt');
  const progressCompact = document.getElementById('progressCompact');
  const wotdCard = document.getElementById('wotdCard');
  const ctaSection = document.getElementById('ctaSection');
  
  if (!signinPrompt || !progressCompact) return;

  const isSignedIn = checkAuthStatus();

  if (isSignedIn) {
    // Show compact welcome/progress section
    signinPrompt.style.display = 'none';
    progressCompact.style.display = 'block';
    
    // Show gated content (WOTD + CTAs - only visible when signed in)
    if (wotdCard) wotdCard.style.display = 'block';
    if (ctaSection) ctaSection.style.display = 'flex';

    // Update streak
    updateStreak();

    // Get user data
    const user = getCurrentUser();
    const stats = getUserStats();
    
    // Update welcome message
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
      userNameEl.textContent = user.name || 'Learner';
    }

    // Update streak display
    const streakEl = document.getElementById('streakNumber');
    if (streakEl) {
      streakEl.textContent = stats.streak || 0;
    }

    // Update quick stats
    const seenEl = document.getElementById('quickSeen');
    const quizzesEl = document.getElementById('quickQuizzes');
    
    if (seenEl) seenEl.textContent = stats.seen;
    if (quizzesEl) quizzesEl.textContent = stats.quizzes || 0;

  } else {
    // Show prominent sign-in prompt
    signinPrompt.style.display = 'flex';
    progressCompact.style.display = 'none';
    
    // Hide gated content (WOTD + CTAs)
    if (wotdCard) wotdCard.style.display = 'none';
    if (ctaSection) ctaSection.style.display = 'none';
  }
}

// Streak tracking function
function updateStreak() {
  const today = new Date().toDateString();
  const lastVisit = localStorage.getItem('lastVisit');
  const currentStreak = parseInt(localStorage.getItem('currentStreak') || '0');
  
  // If already visited today, don't update
  if (lastVisit === today) return;
  
  // Check if yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();
  
  if (lastVisit === yesterdayStr) {
    // Consecutive day - increment streak
    localStorage.setItem('currentStreak', (currentStreak + 1).toString());
  } else if (!lastVisit) {
    // First visit ever
    localStorage.setItem('currentStreak', '1');
  } else {
    // Streak broken - reset to 1
    localStorage.setItem('currentStreak', '1');
  }
  
  // Update last visit
  localStorage.setItem('lastVisit', today);
}

// Helper functions
function checkAuthStatus() {
  return localStorage.getItem('isSignedIn') === 'true';
}

function getCurrentUser() {
  return {
    name: localStorage.getItem('userName') || 'Learner'
  };
}

function getUserStats() {
  return {
    seen: parseInt(localStorage.getItem('wordsStudied') || '0'),
    quizzes: parseInt(localStorage.getItem('quizzesTaken') || '0'),
    favourites: parseInt(localStorage.getItem('favouritesCount') || '0'),
    streak: parseInt(localStorage.getItem('currentStreak') || '0')
  };
}

// Initialize home page
function initHome() {
  updateWordOfTheDay();
  updateAuthSections();
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHome);
} else {
  initHome();
}

// Export for use in other files if needed
export { updateWordOfTheDay, updateAuthSections, checkAuthStatus };