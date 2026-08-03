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

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
    const prompt = `Ești un mentor pasionat de tehnologie care explică concepte complexe pe înțelesul oricui (ELI5 - Explică-mi ca și cum aș avea 5 ani), în limba română curată și impecabilă.

Analizează acest proiect GitHub (${repo.name}) și creează o explicație amplă, extrem de clară și detaliată, structurată pe 4 secțiuni distincte.

OBLIGATORIU: FIECARE DINTRE CELE 4 SECȚIUNI TREBUIE SĂ ADUCĂ INFORMAȚIE NOUĂ ȘI SPECIFICĂ DESPRE PROIECTUL "${repo.name}". NU REPETA ACELEAȘI IDEI, DESCRIERI SAU FRAZE ÎN CASETE DIFERITE!

Returnează răspunsul STRICT sub formă de JSON cu următoarea structură:

{
  "eli5": {
    "overview": "Ce este proiectul (3-4 propoziții): Arhitectura, ce este din punct de vedere tehnic (bibliotecă, aplicație, colecție de resurse) și ce funcție principală îndeplinește.",
    "problem": "Ce problemă rezolvă (2-3 propoziții): Fii SPECIFIC la acest proiect! Ce treabă manuală, enervantă, scumpă sau grea trebuiau să facă oamenii înainte să existe ${repo.name}? NU repeta definiția din 'Ce este'!",
    "analogy": "Analogie din viața reală (2-3 propoziții): O metaforă vizuală UNICĂ din lumea de zi cu zi (fără jargon IT) care explică cum funcționează conceptul central din ${repo.name}.",
    "audience": "Cui îi folosește (2-3 propoziții): Cine sunt utilizatorii concreți (programatori de ${repo.language || 'un anumit tip'}, echipe de producție, studenți, etc.) și în ce momente sau proiecte specifice îl folosesc."
  },
  "whyUse": [
    "Motiv 1 specific bazat pe valoare reală",
    "Motiv 2 specific bazat pe valoare reală",
    "Motiv 3 specific bazat pe valoare reală"
  ]
}

REGULI ANTI-REPETIȚIE ȘI LIMBĂ:
- Fără formulări generice care s-ar potrivi la orice proiect. Folosește detaliile specifice din descriere și README!
- Fără Romglish și fără lipit direct de fraze brute în engleză din descriere.
- Nu repeta aceleași cuvinte sau concepte între 'overview', 'problem', 'analogy' și 'audience'.

Proiect: ${repo.name}
Descriere oficială GitHub: ${repo.description || '(fără descriere)'}
Limbaj principal: ${repo.language || 'Nespecificat'}
Etichete (Topics): ${(repo.topics || []).join(', ') || '(fără etichete)'}
Număr Stele: ${repo.stargazers_count}
Fragment din README: ${readmeText.slice(0, 4000)}`;

    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const model of models) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${state.geminiKey.trim()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1500, responseMimeType: 'application/json' }
          })
        });

        if (!res.ok) continue;

        const data = await res.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.eli5) {
            return {
              eli5: parsed.eli5,
              whyUse: Array.isArray(parsed.whyUse) && parsed.whyUse.length ? parsed.whyUse : buildFallbackInsights(repo, readmeText).whyUse
            };
          }
        }
      } catch (e) {
        console.error(`Gemini API Error (${model}), încerc mai departe:`, e);
      }
    }
  }

  return buildFallbackInsights(repo, readmeText);
}

function popularityPhrase(stars) {
  if (stars >= 50000) return 'printre cele mai cunoscute proiecte de pe GitHub la nivel mondial';
  if (stars >= 10000) return 'un proiect foarte popular, folosit zi de zi de o comunitate uriașă';
  if (stars >= 1000) return 'un proiect apreciat, cu o comunitate serioasă în jurul lui';
  return 'un proiect nișat, dar apreciat de utilizatorii săi';
}

// --- Smart Offline Fallback Generator (100% Dynamic & Unique per Repo) ---
function buildFallbackInsights(repo, readmeText = '') {
  const name = repo.name || 'Proiectul';
  const lang = repo.language || '';
  const desc = (repo.description || '').trim();
  const cleanDesc = desc ? desc.replace(/\s+/g, ' ').replace(/[.\s]+$/, '') : '';
  const topics = repo.topics || [];
  const topicsStr = topics.length ? topics.slice(0, 4).join(', ') : '';
  const stars = repo.stargazers_count || 0;
  const owner = repo.owner?.login || 'autor';
  const descLower = (desc + ' ' + (topics.join(' ')) + ' ' + readmeText.slice(0, 1500)).toLowerCase();

  // 1. OVERVIEW (Ce este proiectul?)
  let overview = '';
  if (cleanDesc) {
    overview = `${name} este un proiect open-source${lang ? ` dezvoltat în ${lang}` : ''}, având ca scop principal: „${cleanDesc}”.`;
  } else {
    overview = `${name} este o resursă software open-source${lang ? ` creată în ${lang}` : ''}${topicsStr ? ` axată pe ${topicsStr}` : ''}.`;
  }
  if (topicsStr) {
    overview += ` În comunitatea GitHub, proiectul este încadrat în domeniile: #${topics.slice(0, 4).join(', #')}.`;
  }
  overview += ` Are peste ${formatNumber(stars)} de stele, fiind ${popularityPhrase(stars)}.`;

  // 2. PROBLEM (Ce problemă rezolvă? - Dinamic după specificul proiectului)
  let problem = '';
  if (descLower.includes('leetcode') || descLower.includes('interview') || descLower.includes('companywise') || descLower.includes('coding-challenge')) {
    problem = `Fără ${name}, candidații care se pregătesc de interviuri tehnice la companii mari pierd zeci de ore căutând haotic exerciții pe forumuri. Proiectul rezolvă această problemă organizând și filtrând problemele reale după companii și frecvență.`;
  } else if (descLower.includes('awesome') || descLower.includes('curated') || descLower.includes('list') || descLower.includes('cheatsheet')) {
    problem = `Când vrei să studiezi un domeniu nou${topics.length ? ` precum ${topics[0]}` : ''}, internetul este plin de tutoriale vechi sau de proastă calitate. ${name} elimină informația inutilă și oferă o listă selecționată de resurse verificate.`;
  } else if (descLower.includes('machine learning') || descLower.includes('llm') || descLower.includes('ai') || descLower.includes('model') || descLower.includes('gpt')) {
    problem = `Construirea de la zero a modelelor inteligente necesită infrastructură scumpă și calcule matematice grele. ${name} oferă instrumentele necesare pentru a integra inteligența artificială fără a relua totul de la zero.`;
  } else if (descLower.includes('cli') || descLower.includes('terminal') || descLower.includes('command') || descLower.includes('shell')) {
    problem = `Navigarea prin interfețe grafice lente sau executarea manuală a mai multor pași în calculator consumă timp. ${name} permite rularea sarcinilor direct din terminal prin comenzi rapide de tastatură.`;
  } else if (descLower.includes('ui') || descLower.includes('css') || descLower.includes('component') || descLower.includes('theme') || descLower.includes('style')) {
    problem = `Proiectarea manuală a elementelor vizuale și stilurilor pentru aplicații${lang ? ` în ${lang}` : ''} necesită ore de muncă repetitivă. ${name} oferă componente grafice gata stilizate și pregătite de integrare.`;
  } else if (descLower.includes('bot') || descLower.includes('scrape') || descLower.includes('automat') || descLower.includes('workflow')) {
    problem = `Executarea manuală a sarcinilor de rutină (descărcat fișiere, extras date, trimis notificări) este obositoare. ${name} pune aceste activități pe pilot automat.`;
  } else if (descLower.includes('database') || descLower.includes('sql') || descLower.includes('storage') || descLower.includes('cache')) {
    problem = `Gestionarea și găsirea rapidă a datelor dintr-o aplicație fără un sistem specializat ar duce la pierderi de informații și la timpi mari de așteptare. ${name} asigură o stocare structurată și rapidă.`;
  } else {
    problem = `Fără o unealtă precum ${name}, dezvoltatorii care lucrează cu ${lang || 'această tehnologie'} ar fi nevoiți să scrie manual cod complex pentru ${cleanDesc ? `„${cleanDesc.slice(0, 70)}...”` : 'funcționalitățile dorite'}, pierzând timp prețios.`;
  }

  // 3. ANALOGY (Analogie din viața reală - Dinamică după domeniu)
  let analogy = '';
  if (descLower.includes('leetcode') || descLower.includes('interview')) {
    analogy = `E ca o culegere cu exercițiile extrase de la ultimele examene ale unei facultăți de top: în loc să ghicești ce să înveți, ai lista exactă cu întrebările care se dau cel mai des.`;
  } else if (descLower.includes('awesome') || descLower.includes('list')) {
    analogy = `E ca un ghid turistic conceput de un localnic generos: în loc să intri în restaurante slabe la întâmplare, ai o listă scurtă cu cele mai bune locuri din oraș.`;
  } else if (descLower.includes('cli') || descLower.includes('terminal')) {
    analogy = `E ca o telecomandă cu butoane rapide: apeși o comandă scurtă și comanzi aparatul instantaneu, fără să te deplasezi până la el.`;
  } else if (descLower.includes('ui') || descLower.includes('component')) {
    analogy = `E ca un set de mobilă gata montată: pui dulapul în cameră și arată bine din prima zi, fără să fii nevoit să tai scândurile singur.`;
  } else if (descLower.includes('bot') || descLower.includes('scrape') || descLower.includes('automat')) {
    analogy = `E ca un ajutor casnic harnic: face curățenie sau strânge lucrurile de o mie de ori fără să se plângă și fără să obosească.`;
  } else if (descLower.includes('ai') || descLower.includes('model') || descLower.includes('llm')) {
    analogy = `E ca un asistent virtual ultradotat care citește mii de pagini în câteva secunde și îți oferă răspunsul sau rezolvarea exactă de care ai nevoie.`;
  } else if (descLower.includes('database') || descLower.includes('sql') || descLower.includes('storage')) {
    analogy = `E ca un dulap de arhivă inteligent cu sertare etichetate perfect și un robot care îți aduce dosarul cerut într-o fracțiune de secundă.`;
  } else {
    analogy = `Imaginează-ți o cutie de scule profesionistă adaptată special pentru ${name}: în loc să-ți confecționezi singur cheia sau șurubelnița, le iei gata făcute din cutie.`;
  }

  // 4. AUDIENCE (Cui îi folosește? - Personalizat cu limbajul, etichetele și autorul)
  let audience = `Proiectul este destinat în principal dezvoltatorilor${lang ? ` care programează în ${lang}` : ''}${topics.length ? ` și celor pasionați de ${topics.slice(0, 2).map(t => '#' + t).join(' și ')}` : ''}.`;
  audience += ` Este folosit atât de programatori individuali, cât și de echipe care vor să integreze soluția creată de @${owner}.`;

  const eli5 = {
    overview,
    problem,
    analogy,
    audience
  };

  // WHY USE (Dinamic)
  const whyUse = [];
  if (stars > 5000) {
    whyUse.push(`Comunitate masivă de peste ${formatNumber(stars)} de stele pe GitHub care confirmă utilitatea proiectului.`);
  } else {
    whyUse.push(`Popular și apreciat în ecosistemul ${lang || 'open-source'} (${formatNumber(stars)} stele).`);
  }

  if (cleanDesc) {
    whyUse.push(`Axat direct pe scopul declarat: „${cleanDesc.slice(0, 85)}${cleanDesc.length > 85 ? '...' : ''}”.`);
  } else {
    whyUse.push('Economisește timp prețios de dezvoltare prin furnizarea de funcționalități pregătite din fabrică.');
  }

  if (repo.license) {
    whyUse.push(`Licențiat oficial Open-Source (${repo.license.name || repo.license.spdx_id || 'Sursă Deschisă'}).`);
  } else {
    whyUse.push('Proiect deschis, menținut și actualizat de comunitate.');
  }

  return { eli5, whyUse };
}

// --- Normalize ELI5 to 4-Part Structure ---
function normalizeEli5(rawEli5, repo, readmeText) {
  if (rawEli5 && typeof rawEli5 === 'object' && rawEli5.overview) {
    return {
      overview: rawEli5.overview || '',
      problem: rawEli5.problem || '',
      analogy: rawEli5.analogy || '',
      audience: rawEli5.audience || ''
    };
  }

  if (typeof rawEli5 === 'string' && rawEli5.trim()) {
    const paragraphs = rawEli5.split(/\n\n+/).filter(p => p.trim());
    if (paragraphs.length >= 4) {
      return {
        overview: paragraphs[0],
        problem: paragraphs[1],
        analogy: paragraphs[2],
        audience: paragraphs.slice(3).join(' ')
      };
    }
    const fallback = buildFallbackInsights(repo, readmeText).eli5;
    return {
      overview: rawEli5,
      problem: fallback.problem,
      analogy: fallback.analogy,
      audience: fallback.audience
    };
  }

  return buildFallbackInsights(repo, readmeText).eli5;
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

  // Generate AI Insights & normalize ELI5
  const aiInsights = await generateAiInsights(repo, readmeText);
  const eli5Obj = normalizeEli5(aiInsights.eli5, repo, readmeText);

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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          🤖 AI Summary & Explicație Detaliată (ELI5)
        </span>
        ${state.geminiKey ? '<span class="ai-powered-tag">Powered by Gemini AI</span>' : '<span class="ai-offline-tag">Mod Inteligent Offline</span>'}
      </div>

      <div class="ai-eli5-grid">
        <div class="eli5-card eli5-overview">
          <div class="eli5-card-header">
            <span class="eli5-icon">🎯</span>
            <strong>Ce este proiectul?</strong>
          </div>
          <p>${escapeHtml(eli5Obj.overview)}</p>
        </div>

        <div class="eli5-card eli5-problem">
          <div class="eli5-card-header">
            <span class="eli5-icon">⚡</span>
            <strong>Ce problemă rezolvă?</strong>
          </div>
          <p>${escapeHtml(eli5Obj.problem)}</p>
        </div>

        <div class="eli5-card eli5-analogy">
          <div class="eli5-card-header">
            <span class="eli5-icon">💡</span>
            <strong>Analogie din viața reală</strong>
          </div>
          <p>${escapeHtml(eli5Obj.analogy)}</p>
        </div>

        <div class="eli5-card eli5-audience">
          <div class="eli5-card-header">
            <span class="eli5-icon">🚀</span>
            <strong>Cui îi folosește?</strong>
          </div>
          <p>${escapeHtml(eli5Obj.audience)}</p>
        </div>
      </div>

      <div class="ai-why-section">
        <div class="ai-why-title">De ce să folosești ${escapeHtml(repo.name)}?</div>
        <ul class="ai-why-list">
          ${aiInsights.whyUse.map(reason => `<li>${escapeHtml(reason)}</li>`).join('')}
        </ul>
      </div>
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
