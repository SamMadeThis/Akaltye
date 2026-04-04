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