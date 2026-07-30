/* ==========================================================================
   GitStellar PWA - Core & Advanced AI & GitHub Auth Logic
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
  currentReadmeText: '',
  isLoading: false,
  seenRepoIds: new Set(),
  bookmarks: [],
  ghToken: '',
  geminiKey: '',
  ghUser: null,
  isStarredOnGitHub: false,
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

// Settings Elements
const openSettingsBtn = document.getElementById('openSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const settingsModalOverlay = document.getElementById('settingsModalOverlay');
const ghTokenInput = document.getElementById('ghTokenInput');
const geminiKeyInput = document.getElementById('geminiKeyInput');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const githubUserBadge = document.getElementById('githubUserBadge');
const ghUserAvatar = document.getElementById('ghUserAvatar');
const ghUserLogin = document.getElementById('ghUserLogin');

// README Modal Elements
const readmeModalOverlay = document.getElementById('readmeModalOverlay');
const closeReadmeBtn = document.getElementById('closeReadmeBtn');
const readmeRepoTitle = document.getElementById('readmeRepoTitle');
const readmeContent = document.getElementById('readmeContent');

// --- Helper Functions ---
function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
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

function getGitHubHeaders() {
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  if (state.ghToken) {
    headers['Authorization'] = `Bearer ${state.ghToken.trim()}`;
  }
  return headers;
}

// --- GitHub Auth User Check ---
async function fetchGitHubUser() {
  if (!state.ghToken) {
    githubUserBadge.style.display = 'none';
    state.ghUser = null;
    return;
  }

  try {
    const res = await fetch('https://api.github.com/user', { headers: getGitHubHeaders() });
    if (res.ok) {
      const user = await res.json();
      state.ghUser = user;
      ghUserAvatar.src = user.avatar_url;
      ghUserLogin.textContent = `@${user.login}`;
      githubUserBadge.style.display = 'inline-flex';
    } else {
      githubUserBadge.style.display = 'none';
    }
  } catch (e) {
    console.error('Failed to fetch GH user', e);
  }
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
      <div class="skeleton-box" style="width:85%; height:16px; margin-bottom:20px;"></div>

      <div class="skeleton-box" style="width:100%; height:90px; border-radius:12px; margin-bottom:20px;"></div>

      <div style="display:flex; gap:8px; margin-bottom:20px;">
        <div class="skeleton-box" style="width:70px; height:26px; border-radius:20px;"></div>
        <div class="skeleton-box" style="width:90px; height:26px; border-radius:20px;"></div>
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

// --- Fetch Raw README Text ---
async function fetchRepoReadme(owner, repoName) {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}/readme`, {
      headers: { ...getGitHubHeaders(), 'Accept': 'application/vnd.github.v3.raw' }
    });
    if (res.ok) {
      return await res.text();
    }
  } catch (e) {
    console.error('Failed to fetch README:', e);
  }
  return '';
}

// --- Smart AI Insights Generator (Gemini + Smart Fallback) ---
async function generateAiInsights(repo, readmeText) {
  // If Gemini API Key is provided, use Google Gemini API
  if (state.geminiKey) {
    try {
      const prompt = `Analizează acest proiect GitHub și oferă în limba română:
1) O descriere simplă "Explain Like I'm 5" în maxim o propoziție clară.
2) 3 motive scurte "De ce să folosești acest proiect?" (bullet points).

Proiect: ${repo.name}
Descriere: ${repo.description}
README extras: ${readmeText.slice(0, 1500)}

Răspunde STRICT în format JSON:
{"eli5": "...", "whyUse": ["motiv 1", "motiv 2", "motiv 3"]}`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.geminiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (res.ok) {
        const data = await res.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (e) {
      console.error('Gemini API Error, using smart fallback:', e);
    }
  }

  // --- Smart Offline Fallback Generator ---
  let cleanDesc = repo.description || 'Un proiect open-source apreciat de comunitate.';
  let eli5 = `${repo.name} este o aplicație/bibliotecă creată pentru a simplifica ${cleanDesc.toLowerCase().replace(/^(a|an|the)\s+/, '')}.`;
  
  const whyUse = [];
  if (repo.stargazers_count > 5000) {
    whyUse.push(`Proiect de încredere masivă cu peste ${formatNumber(repo.stargazers_count)} de stele pe GitHub.`);
  } else {
    whyUse.push(`Popular în comunitatea de ${repo.language || 'developers'} (${formatNumber(repo.stargazers_count)} stele).`);
  }

  if (readmeText.toLowerCase().includes('fast') || readmeText.toLowerCase().includes('performan')) {
    whyUse.push('Optimizat pentru performanță ridicată și execuție rapidă.');
  } else if (readmeText.toLowerCase().includes('easy') || readmeText.toLowerCase().includes('simple')) {
    whyUse.push('Ușor de integrat și configurat în orice proiect.');
  } else {
    whyUse.push('Economisește timp de dezvoltare prin funcționalitățile pregătite din fabrică.');
  }

  if (repo.license) {
    whyUse.push(`Licențiat Open-Source (${repo.license.name || repo.license.spdx_id}).`);
  } else {
    whyUse.push('Activ menținut și susținut de comunitate.');
  }

  return { eli5, whyUse };
}

// --- Render Repository Card ---
async function renderRepoCard(repo) {
  if (!repo) return;

  const isBookmarked = state.bookmarks.some(b => b.id === repo.id);
  const langColor = LANGUAGE_COLORS[repo.language] || '#6366f1';
  
  const topicsHtml = (repo.topics && repo.topics.length > 0)
    ? repo.topics.slice(0, 6).map(t => `<span class="topic-tag">#${t}</span>`).join('')
    : '<span class="topic-tag">#open-source</span>';

  // Fetch README for AI Insights and Readme Viewer
  const readmeText = await fetchRepoReadme(repo.owner.login, repo.name);
  state.currentReadmeText = readmeText;

  // Generate AI Insights
  const aiInsights = await generateAiInsights(repo, readmeText);

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

    <!-- AI Insights Box -->
    <div class="ai-insights-box">
      <div class="ai-header">
        <span class="ai-title-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          🤖 AI Summary (ELI5)
        </span>
        ${state.geminiKey ? '<small style="color:#c084fc; font-size:0.75rem;">Powered by Gemini</small>' : ''}
      </div>

      <p class="ai-eli5-text">"${aiInsights.eli5}"</p>

      <div class="ai-why-title">De ce să folosești ${repo.name}?</div>
      <ul class="ai-why-list">
        ${aiInsights.whyUse.map(reason => `<li>${reason}</li>`).join('')}
      </ul>
    </div>

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

        ${repo.language ? `
          <div class="lang-badge" title="Limbaj principal">
            <span class="lang-dot" style="background-color: ${langColor}"></span>
            <span>${repo.language}</span>
          </div>
        ` : ''}
      </div>

      <div class="repo-card-actions">
        <button id="openReadmeBtn" class="btn-icon-secondary" title="Citește fișierul README direct în aplicație">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          README
        </button>

        ${state.ghToken ? `
          <button id="starOnGhBtn" class="btn-icon-secondary btn-star-gh" title="Dă Star direct pe GitHub">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            Star pe GH
          </button>
        ` : ''}

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

  // Attach dynamic event listeners
  document.getElementById('toggleBookmarkBtn').addEventListener('click', () => toggleBookmark(repo));
  document.getElementById('copyCloneBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(`git clone ${repo.clone_url}`);
    showToast('Comanda `git clone` a fost copiată în clipboard!', 'success');
  });

  document.getElementById('openReadmeBtn').addEventListener('click', () => openReadmeModal(repo, readmeText));

  const starOnGhBtn = document.getElementById('starOnGhBtn');
  if (starOnGhBtn) {
    starOnGhBtn.addEventListener('click', () => starRepoOnGitHub(repo.owner.login, repo.name));
  }
}

// --- Live Star on GitHub API ---
async function starRepoOnGitHub(owner, repoName) {
  if (!state.ghToken) {
    showToast('Conectează-ți GitHub Token din Setări pentru a da star direct!', 'warning');
    return;
  }

  try {
    const res = await fetch(`https://api.github.com/user/starred/${owner}/${repoName}`, {
      method: 'PUT',
      headers: { ...getGitHubHeaders(), 'Content-Length': '0' }
    });

    if (res.status === 204) {
      showToast(`Ai dat ⭐ Star pe GitHub repozitoriului ${repoName}!`, 'success');
    } else {
      showToast('Nu am putut trimite Star-ul. Verifică drepturile token-ului (public_repo).', 'warning');
    }
  } catch (e) {
    console.error('Star error:', e);
    showToast('Eroare la conectarea cu GitHub.', 'warning');
  }
}

// --- Readme Modal Handler ---
function openReadmeModal(repo, readmeText) {
  readmeRepoTitle.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
    README - ${repo.name}
  `;

  if (!readmeText || readmeText.trim().length === 0) {
    readmeContent.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:3rem;">Acest repozitoriu nu conține un fișier README.md.</p>`;
  } else {
    // Parse Markdown using marked.js
    if (typeof marked !== 'undefined') {
      readmeContent.innerHTML = marked.parse(readmeText);
    } else {
      readmeContent.textContent = readmeText;
    }
  }

  readmeModalOverlay.classList.add('open');
}

// --- Error Card Rendering ---
function renderErrorCard(message) {
  repoCard.innerHTML = `
    <div style="text-align: center; padding: 2.5rem 1rem;">
      <div style="display:inline-flex; padding: 1rem; background: rgba(239, 68, 68, 0.1); border-radius: 50%; color: #ef4444; margin-bottom: 1rem;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
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

  const svgIcon = discoverBtn.querySelector('svg');
  if (svgIcon) svgIcon.style.transform = 'rotate(360deg)';

  renderSkeleton();

  try {
    const randomChars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'st', 'th', 'in', 're'];
    const randomChar = randomChars[Math.floor(Math.random() * randomChars.length)];
    const randomPage = Math.floor(Math.random() * 10) + 1;

    let queryParts = [`stars:>=${state.minStars}`];
    if (state.language) {
      queryParts.push(`language:${state.language}`);
    }
    queryParts.push(randomChar);

    const query = encodeURIComponent(queryParts.join(' '));
    const url = `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=30&page=${randomPage}`;

    const response = await fetch(url, { headers: getGitHubHeaders() });

    if (response.status === 403 || response.status === 429) {
      throw new Error('Limită de interogări GitHub atinsă (Rate Limit). Introdu un GitHub Token în Setări pentru 5.000 cereri/oră!');
    }

    if (!response.ok) {
      throw new Error(`Eroare GitHub API (${response.status})`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      const fallbackQuery = encodeURIComponent(`stars:>=${state.minStars}` + (state.language ? ` language:${state.language}` : ''));
      const fallbackRes = await fetch(`https://api.github.com/search/repositories?q=${fallbackQuery}&sort=updated&order=desc&per_page=30&page=1`, { headers: getGitHubHeaders() });
      const fallbackData = await fallbackRes.json();
      
      if (!fallbackData.items || fallbackData.items.length === 0) {
        renderErrorCard('Nu am găsit niciun repozitoriu cu criteriile selectate.');
        state.isLoading = false;
        return;
      }
      data.items = fallbackData.items;
    }

    let unseenItems = data.items.filter(item => !state.seenRepoIds.has(item.id));
    if (unseenItems.length === 0) unseenItems = data.items;

    const selectedRepo = unseenItems[Math.floor(Math.random() * unseenItems.length)];
    
    state.seenRepoIds.add(selectedRepo.id);
    if (state.seenRepoIds.size > 50) {
      const firstItem = state.seenRepoIds.values().next().value;
      state.seenRepoIds.delete(firstItem);
    }

    state.currentRepo = selectedRepo;
    await renderRepoCard(selectedRepo);

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

    state.ghToken = localStorage.getItem('gitstellar_gh_token') || '';
    state.geminiKey = localStorage.getItem('gitstellar_gemini_key') || '';
    
    ghTokenInput.value = state.ghToken;
    geminiKeyInput.value = state.geminiKey;

    if (state.ghToken) fetchGitHubUser();
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

closeBookmarksBtn.addEventListener('click', () => modalOverlay.classList.remove('open'));
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) modalOverlay.classList.remove('open'); });

// Settings Modal Listeners
openSettingsBtn.addEventListener('click', () => settingsModalOverlay.classList.add('open'));
closeSettingsBtn.addEventListener('click', () => settingsModalOverlay.classList.remove('open'));
settingsModalOverlay.addEventListener('click', (e) => { if (e.target === settingsModalOverlay) settingsModalOverlay.classList.remove('open'); });

saveSettingsBtn.addEventListener('click', () => {
  state.ghToken = ghTokenInput.value.trim();
  state.geminiKey = geminiKeyInput.value.trim();
  localStorage.setItem('gitstellar_gh_token', state.ghToken);
  localStorage.setItem('gitstellar_gemini_key', state.geminiKey);
  
  settingsModalOverlay.classList.remove('open');
  showToast('Setările au fost salvate!', 'success');
  fetchGitHubUser();
  if (state.currentRepo) renderRepoCard(state.currentRepo);
});

// Readme Modal Listeners
closeReadmeBtn.addEventListener('click', () => readmeModalOverlay.classList.remove('open'));
readmeModalOverlay.addEventListener('click', (e) => { if (e.target === readmeModalOverlay) readmeModalOverlay.classList.remove('open'); });

// Keyboard shortcuts (Space or 'R')
document.addEventListener('keydown', (e) => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (modalOverlay.classList.contains('open') || settingsModalOverlay.classList.contains('open') || readmeModalOverlay.classList.contains('open')) return;

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
