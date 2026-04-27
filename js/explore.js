// ============================================================
// EXPLORE SEARCH FUNCTIONALITY — Add to explore.js
// Searches Firestore 'words' collection
// ============================================================

const searchInput = document.getElementById('exploreSearch');
const searchClear = document.getElementById('searchClear');
const searchCount = document.getElementById('searchCount');
const resultCount = document.getElementById('resultCount');
const searchResultsContainer = document.getElementById('searchResults');

let searchTimeout;

// Show/hide clear button
searchInput.addEventListener('input', function() {
  if (this.value.length > 0) {
    searchClear.classList.add('show');
    
    // Debounce search (wait 300ms after user stops typing)
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performSearch(this.value);
    }, 300);
  } else {
    searchClear.classList.remove('show');
    clearSearch();
  }
});

// Clear search
searchClear.addEventListener('click', function() {
  searchInput.value = '';
  searchClear.classList.remove('show');
  clearSearch();
  searchInput.focus();
});

// Perform Firestore search
async function performSearch(query) {
  const lowerQuery = query.toLowerCase().trim();
  
  if (lowerQuery.length < 2) {
    clearSearch();
    return;
  }
  
  // Show loading state
  showLoadingState();
  
  try {
    // Query Firestore for matching words
    const wordsRef = db.collection('words');
    
    // Search in word field (Arrernte) and definition (English)
    const wordResults = await wordsRef
      .where('word', '>=', lowerQuery)
      .where('word', '<=', lowerQuery + '\uf8ff')
      .limit(20)
      .get();
    
    const defResults = await wordsRef
      .where('definition', '>=', lowerQuery)
      .where('definition', '<=', lowerQuery + '\uf8ff')
      .limit(20)
      .get();
    
    // Combine results and remove duplicates
    const resultsMap = new Map();
    
    wordResults.forEach(doc => {
      resultsMap.set(doc.id, { id: doc.id, ...doc.data() });
    });
    
    defResults.forEach(doc => {
      if (!resultsMap.has(doc.id)) {
        resultsMap.set(doc.id, { id: doc.id, ...doc.data() });
      }
    });
    
    const results = Array.from(resultsMap.values());
    
    // Display results
    displayResults(results, query);
    
  } catch (error) {
    console.error('Search error:', error);
    showErrorState();
  }
}

// Display search results
function displayResults(results, query) {
  // Hide category tiles when searching
  const tilesContainer = document.querySelector('.tiles');
  const collectionsSection = document.querySelector('.hero'); // Adjust selector as needed
  
  if (tilesContainer) tilesContainer.style.display = 'none';
  if (collectionsSection) collectionsSection.style.display = 'none';
  
  // Update count
  resultCount.textContent = results.length;
  searchCount.style.display = 'block';
  
  // Show results
  if (results.length === 0) {
    showEmptyState(query);
  } else {
    searchResultsContainer.innerHTML = results.map(word => `
      <a href="word.html?id=${word.id}" class="list__item list__item--link">
        <div style="flex: 1;">
          <div class="list__title">${word.word}</div>
          <div class="list__meta">${word.definition || ''}</div>
        </div>
        ${word.pos ? `<span class="badge badge--pos">${word.pos}</span>` : ''}
      </a>
    `).join('');
    
    searchResultsContainer.style.display = 'flex';
  }
}

// Clear search
function clearSearch() {
  const tilesContainer = document.querySelector('.tiles');
  const collectionsSection = document.querySelector('.hero');
  
  // Show original content
  if (tilesContainer) tilesContainer.style.display = 'flex';
  if (collectionsSection) collectionsSection.style.display = 'flex';
  
  // Hide search results
  searchResultsContainer.innerHTML = '';
  searchResultsContainer.style.display = 'none';
  searchCount.style.display = 'none';
  hideEmptyState();
}

// Loading state
function showLoadingState() {
  searchResultsContainer.innerHTML = `
    <div style="text-align: center; padding: var(--space-8); color: var(--clr-surface-a40);">
      <div style="font-size: 2rem; margin-bottom: var(--space-3);">⏳</div>
      <p>Searching...</p>
    </div>
  `;
  searchResultsContainer.style.display = 'block';
}

// Error state
function showErrorState() {
  searchResultsContainer.innerHTML = `
    <div style="text-align: center; padding: var(--space-8); color: var(--clr-danger);">
      <div style="font-size: 2rem; margin-bottom: var(--space-3);">⚠️</div>
      <p>Search failed. Please try again.</p>
    </div>
  `;
}

// Empty state
function showEmptyState(query) {
  searchResultsContainer.innerHTML = `
    <div class="search-empty">
      <div class="search-empty-icon">🔍</div>
      <p>No results found for "<strong>${query}</strong>"</p>
      <span>Try a different search term</span>
    </div>
  `;
  searchResultsContainer.style.display = 'block';
}

// Hide empty state
function hideEmptyState() {
  const emptyState = searchResultsContainer.querySelector('.search-empty');
  if (emptyState) {
    searchResultsContainer.innerHTML = '';
  }
}