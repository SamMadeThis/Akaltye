// Tag filter
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tag = btn.dataset.tag;
    window.location.href = `words.html?tag=${tag}`;
  });
});

// POS filter
document.querySelectorAll('.pos-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const pos = btn.dataset.pos;
    window.location.href = `words.html?pos=${pos}`;
  });
});

// Fetch from your database - shows the user data on units progress to the user dashboard on index.html
async function loadUnitsProgress() {
  const userId = getCurrentUserId(); // your auth function
  const userData = await getUserData(userId);
  
  const completed = userData.unitsCompleted || 0;
  const total = userData.totalUnits || 10;
  
  updateUnitsProgress(completed, total);
}

loadUnitsProgress();