/* ==========================================================================
   GitStellar PWA - Core Application Logic
   ========================================================================== */

// --- Language Accent Colors Mapping ---
const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  'C++': '#f34b7d',
  C: '#555555',
  Java: '#b07219',
  'C#': '#178600',
  PHP: '#4F5D95',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Ruby: '#701516',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Shell: '#89e051',
  Vue: '#41b883',
  React: '#61dafb',
  Zig: '#ec915c',
  Dart: '#00B4AB'
};

// --- Application State ---
const state = {
  minStars: 100,
  language: '',
  currentRepo: null,
  isLoading: false,
  seenRepoIds: new Set(),
  bookmarks: [],
  deferredInstallPrompt: null
};

// --- DOM Elements ---
const repoCard = document.getElementById('repoCard');
const discoverBtn = document.getElementById('discoverBtn');
const minStarsSelect = document.getElementById('minStarsSelect');
const languageSelect = document.getElementById('languageSelect');
const openBookmarksBtn = document.getElementById('openBookmarksBtn');
const closeBookmarksBtn = document.getElementById('closeBookmarksBtn');
const modalOverlay = document.getElementById('modalOverlay');
const bookmarksList = document.getElementById('bookmarksList');
const bookmarkCount = document.getElementById('bookmarkCount');
const toastContainer = document.getElementById('toastContainer');
const installPwaBtn = document.getElementById('installPwaBtn');

// --- Helper Functions ---
function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Astăzi';
  if (diffDays === 1) return 'Ieri';
  if (diffDays < 30) return `acum ${diffDays} zile`;
  if (diffDays < 365) return `acum ${Math.floor(diffDays / 30)} luni`;
  return `acum ${Math.floor(diffDays / 365)} ani`;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  if (type === 'success') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
  } else if (type === 'warning') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
  }

  toast.innerHTML = `${iconSvg} <span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --- Skeleton Loading UI ---
function renderSkeleton() {
  repoCard.innerHTML = `
    <div class="skeleton">
      <div class="repo-header">
        <div class="owner-info">
          <div class="skeleton-box" style="width:48px; height:48px; border-radius:50%;"></div>
          <div class="repo-title-group" style="gap:6px;">
            <div class="skeleton-box" style="width:100px; height:14px;"></div>
            <div class="skeleton-box" style="width:220px; height:24px;"></div>
          </div>
        </div>
        <div class="skeleton-box" style="width:42px; height:42px; border-radius:50%;"></div>
      </div>
      
      <div class="skeleton-box" style="width:100%; height:16px; margin-bottom:8px;"></div>
      <div class="skeleton-box" style="width:85%; height:16px; margin-bottom:24px;"></div>

      <div style="display:flex; gap:8px; margin-bottom:24px;">
        <div class="skeleton-box" style="width:70px; height:26px; border-radius:20px;"></div>
        <div class="skeleton-box" style="width:90px; height:26px; border-radius:20px;"></div>
        <div class="skeleton-box" style="width:60px; height:26px; border-radius:20px;"></div>
      </div>

      <div class="repo-meta-grid">
        <div style="display:flex; gap:16px;">
          <div class="skeleton-box" style="width:70px; height:20px;"></div>
          <div class="skeleton-box" style="width:70px; height:20px;"></div>
        </div>
        <div style="display:flex; gap:8px;">
          <div class="skeleton-box" style="width:110px; height:36px; border-radius:12px;"></div>
          <div class="skeleton-box" style="width:110px; height:36px; border-radius:12px;"></div>
        </div>
      </div>
    </div>
  `;
}

// --- Render Repository Card ---
function renderRepoCard(repo) {
  if (!repo) return;

  const isBookmarked = state.bookmarks.some(b => b.id === repo.id);
  const langColor = LANGUAGE_COLORS[repo.language] || '#6366f1';
  
  const topicsHtml = (repo.topics && repo.topics.length > 0)
    ? repo.topics.slice(0, 6).map(t => `<span class="topic-tag">#${t}</span>`).join('')
    : '<span class="topic-tag">#open-source</span>';

  repoCard.innerHTML = `
    <div class="repo-header">
      <div class="owner-info">
        <img class="avatar-img" src="${repo.owner.avatar_url}" alt="${repo.owner.login}" loading="lazy">
        <div class="repo-title-group">
          <span class="owner-name">@${repo.owner.login}</span>
          <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="repo-name" title="Deschide ${repo.name} pe GitHub">
            ${repo.name}
          </a>
        </div>
      </div>

      <button id="toggleBookmarkBtn" class="bookmark-btn ${isBookmarked ? 'active' : ''}" title="${isBookmarked ? 'Șterge din favorite' : 'Salvează la favorite'}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      </button>
    </div>

    <p class="repo-description">
      ${repo.description || 'Nicio descriere disponibilă pentru acest proiect.'}
    </p>

    <div class="repo-topics">
      ${topicsHtml}
    </div>

    <div class="repo-meta-grid">
      <div class="meta-stats">
        <div class="stat-item stars" title="${repo.stargazers_count} Stele">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <span>${formatNumber(repo.stargazers_count)}</span>
        </div>

        <div class="stat-item forks" title="${repo.forks_count} Bifurcații (Forks)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><circle cx="18" cy="6" r="3"></circle><path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"></path><path d="M12 12v3"></path></svg>
          <span>${formatNumber(repo.forks_count)}</span>
        </div>

        <div class="stat-item issues" title="${repo.open_issues_count} Probleme deschise">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span>${formatNumber(repo.open_issues_count)}</span>
        </div>

        ${repo.language ? `
          <div class="lang-badge" title="Limbaj principal">
            <span class="lang-dot" style="background-color: ${langColor}"></span>
            <span>${repo.language}</span>
          </div>
        ` : ''}
      </div>

      <div class="repo-card-actions">
        <button id="copyCloneBtn" class="btn-icon-secondary" title="Copiază comanda git clone">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          Clone URL
        </button>

        <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="btn-primary-action" title="Deschide repozitoriul pe GitHub">
          <span>Vezi pe GitHub</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </a>
      </div>
    </div>
  `;

  // Attach dynamic event listeners to card inner elements
  document.getElementById('toggleBookmarkBtn').addEventListener('click', () => toggleBookmark(repo));
  document.getElementById('copyCloneBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(`git clone ${repo.clone_url}`);
    showToast('Comanda `git clone` a fost copiată în clipboard!', 'success');
  });
}

// --- Error Card Rendering ---
function renderErrorCard(message) {
  repoCard.innerHTML = `
    <div style="text-align: center; padding: 2.5rem 1rem;">
      <div style="display:inline-flex; padding: 1rem; background: rgba(239, 68, 68, 0.1); border-radius: 50%; color: #ef4444; margin-bottom: 1rem;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      </div>
      <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: #fff;">Oups! A apărut o problemă</h3>
      <p style="color: var(--text-muted); max-width: 450px; margin: 0 auto 1.5rem auto; font-size: 0.95rem;">${message}</p>
      <button onclick="fetchRandomRepo()" class="btn-primary-action" style="margin: 0 auto;">Încearcă din nou</button>
    </div>
  `;
}

// --- GitHub Search & Randomizing Algorithm ---
async function fetchRandomRepo() {
  if (state.isLoading) return;
  state.isLoading = true;

  // Add rotate animation to discover button icon
  const svgIcon = discoverBtn.querySelector('svg');
  if (svgIcon) svgIcon.style.transform = 'rotate(360deg)';

  renderSkeleton();

  try {
    const randomChars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'st', 'th', 'in', 're'];
    const randomChar = randomChars[Math.floor(Math.random() * randomChars.length)];
    
    // Randomize page index (1..10) to sample varied sets
    const randomPage = Math.floor(Math.random() * 10) + 1;

    let queryParts = [`stars:>=${state.minStars}`];
    if (state.language) {
      queryParts.push(`language:${state.language}`);
    }
    // Random query modifier for maximum freshness
    queryParts.push(randomChar);

    const query = encodeURIComponent(queryParts.join(' '));
    const url = `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=30&page=${randomPage}`;

    const response = await fetch(url);

    if (response.status === 403 || response.status === 429) {
      throw new Error('Limită de interogări GitHub atinsă (Rate Limit). Vă rugăm să așteptați un minut înainte de a încerca din nou.');
    }

    if (!response.ok) {
      throw new Error(`Eroare GitHub API (${response.status})`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      // Fallback query without random character modifier if zero results returned
      const fallbackQuery = encodeURIComponent(`stars:>=${state.minStars}` + (state.language ? ` language:${state.language}` : ''));
      const fallbackRes = await fetch(`https://api.github.com/search/repositories?q=${fallbackQuery}&sort=updated&order=desc&per_page=30&page=1`);
      const fallbackData = await fallbackRes.json();
      
      if (!fallbackData.items || fallbackData.items.length === 0) {
        renderErrorCard('Nu am găsit niciun repozitoriu cu criteriile selectate. Încearcă să scazi numărul minim de stele sau să schimbi limbajul.');
        state.isLoading = false;
        return;
      }
      data.items = fallbackData.items;
    }

    // Pick a random repository item from the array that hasn't been recently shown
    let unseenItems = data.items.filter(item => !state.seenRepoIds.has(item.id));
    if (unseenItems.length === 0) unseenItems = data.items;

    const selectedRepo = unseenItems[Math.floor(Math.random() * unseenItems.length)];
    
    // Save to seen set (cap set size to 50)
    state.seenRepoIds.add(selectedRepo.id);
    if (state.seenRepoIds.size > 50) {
      const firstItem = state.seenRepoIds.values().next().value;
      state.seenRepoIds.delete(firstItem);
    }

    state.currentRepo = selectedRepo;
    renderRepoCard(selectedRepo);

  } catch (error) {
    console.error('Fetch Error:', error);
    renderErrorCard(error.message || 'Nu s-a putut încărca un repozitoriu. Verifică conexiunea la internet.');
  } finally {
    state.isLoading = false;
    if (svgIcon) svgIcon.style.transform = 'rotate(0deg)';
  }
}

// --- Bookmarks Logic ---
function loadBookmarks() {
  try {
    const stored = localStorage.getItem('gitstellar_bookmarks');
    if (stored) state.bookmarks = JSON.parse(stored);
  } catch (e) {
    state.bookmarks = [];
  }
  updateBookmarkCount();
}

function saveBookmarks() {
  try {
    localStorage.setItem('gitstellar_bookmarks', JSON.stringify(state.bookmarks));
  } catch (e) {
    console.error('Failed to save bookmarks:', e);
  }
  updateBookmarkCount();
}

function updateBookmarkCount() {
  bookmarkCount.textContent = state.bookmarks.length;
}

function toggleBookmark(repo) {
  const index = state.bookmarks.findIndex(b => b.id === repo.id);
  if (index > -1) {
    state.bookmarks.splice(index, 1);
    showToast(`Eliminat: ${repo.name}`, 'warning');
  } else {
    state.bookmarks.push({
      id: repo.id,
      name: repo.name,
      owner: repo.owner.login,
      avatar_url: repo.owner.avatar_url,
      html_url: repo.html_url,
      stargazers_count: repo.stargazers_count,
      language: repo.language,
      savedAt: new Date().toISOString()
    });
    showToast(`Adăugat la favorite: ${repo.name}`, 'success');
  }
  saveBookmarks();
  renderRepoCard(repo);
  if (modalOverlay.classList.contains('open')) renderBookmarksList();
}

function renderBookmarksList() {
  if (state.bookmarks.length === 0) {
    bookmarksList.innerHTML = `
      <div class="empty-saved">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:0.75rem; color:var(--text-dim);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        <p>Nu ai nicio favorită salvată încă.</p>
        <small style="color:var(--text-dim);">Apasă pe steluța din cardul unui repo pentru a-l salva.</small>
      </div>
    `;
    return;
  }

  bookmarksList.innerHTML = state.bookmarks.map(item => `
    <div class="saved-item-card">
      <div class="saved-item-header">
        <a href="${item.html_url}" target="_blank" class="saved-item-name">${item.name}</a>
        <button onclick="removeBookmark(${item.id})" class="btn-close" title="Elimină din favorite">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div class="saved-item-meta">
        <span>@${item.owner}</span>
        <span>⭐ ${formatNumber(item.stargazers_count)}</span>
        ${item.language ? `<span>💻 ${item.language}</span>` : ''}
      </div>
    </div>
  `).join('');
}

window.removeBookmark = function(id) {
  state.bookmarks = state.bookmarks.filter(b => b.id !== id);
  saveBookmarks();
  renderBookmarksList();
  if (state.currentRepo && state.currentRepo.id === id) {
    renderRepoCard(state.currentRepo);
  }
};

// --- Event Listeners ---
discoverBtn.addEventListener('click', fetchRandomRepo);

minStarsSelect.addEventListener('change', (e) => {
  state.minStars = parseInt(e.target.value, 10);
  fetchRandomRepo();
});

languageSelect.addEventListener('change', (e) => {
  state.language = e.target.value;
  fetchRandomRepo();
});

openBookmarksBtn.addEventListener('click', () => {
  renderBookmarksList();
  modalOverlay.classList.add('open');
});

closeBookmarksBtn.addEventListener('click', () => {
  modalOverlay.classList.remove('open');
});

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) modalOverlay.classList.remove('open');
});

// Keyboard shortcuts (Space or 'R')
document.addEventListener('keydown', (e) => {
  // Avoid triggering shortcuts inside select inputs or modals
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (modalOverlay.classList.contains('open')) return;

  if (e.code === 'Space' || e.key.toLowerCase() === 'r') {
    e.preventDefault();
    fetchRandomRepo();
  }
});

// --- PWA Installation & Service Worker ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('[Service Worker] Registered:', reg.scope))
      .catch(err => console.error('[Service Worker] Registration failed:', err));
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  state.deferredInstallPrompt = e;
  installPwaBtn.style.display = 'inline-flex';
});

installPwaBtn.addEventListener('click', async () => {
  if (!state.deferredInstallPrompt) return;
  state.deferredInstallPrompt.prompt();
  const { outcome } = await state.deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') {
    showToast('Aplicația GitStellar a fost instalată cu succes!', 'success');
  }
  state.deferredInstallPrompt = null;
  installPwaBtn.style.display = 'none';
});

// Initial Load
loadBookmarks();
fetchRandomRepo();
