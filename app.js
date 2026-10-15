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

// --- Repo Insights: Gemini explains, README-only fallback never invents ---
const GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest'];

const GEMINI_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    example: { type: 'STRING' },
    command: { type: 'STRING' },
    steps: { type: 'STRING' },
    worthIf: { type: 'STRING' },
    skipIf: { type: 'STRING' }
  },
  required: ['summary', 'example', 'command', 'steps', 'worthIf', 'skipIf'],
  propertyOrdering: ['summary', 'example', 'command', 'steps', 'worthIf', 'skipIf']
};

const CARD_DEFS = [
  { key: 'summary', icon: '🎯', title: 'Pe scurt' },
  { key: 'example', icon: '🧪', title: 'Exemplu' },
  { key: 'tryIt', icon: '▶️', title: 'Cum îl încerci' },
  { key: 'worthIf', icon: '⚖️', title: 'Merită dacă…' }
];

const readmeCache = new Map();
const aiCache = new Map();
const aiPending = new Map();

function cacheSet(map, key, value) {
  map.set(key, value);
  if (map.size > 50) map.delete(map.keys().next().value);
}

// Strip badges, images, HTML and link URLs outside code blocks, so only readable text and code remain
function cleanReadme(md) {
  return String(md || '')
    .split(/((?:```|~~~)[\s\S]*?(?:```|~~~))/)
    .map((part, i) => i % 2 ? part : part
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/^\s*\[[^\]]+\]:\s*\S+.*$/gm, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"))
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function plainText(s) {
  return String(s || '').replace(/\*\*|__|`/g, '').replace(/\s+/g, ' ').trim();
}

function truncateText(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sentenceEnd = cut.lastIndexOf('. ');
  return (sentenceEnd > max * 0.5 ? cut.slice(0, sentenceEnd + 1) : cut.replace(/\s+\S*$/, '') + '…');
}

// Split a README into paragraphs, lists and code blocks, each tagged with the heading above it
function parseReadme(md) {
  const blocks = [];
  const headingPath = [];
  let heading = '';
  let fence = null;
  let code = [];
  let para = [];
  let list = [];
  const flushPara = () => { if (para.length) blocks.push({ type: 'para', text: plainText(para.join(' ')), heading }); para = []; };
  const flushList = () => { if (list.length) blocks.push({ type: 'list', items: list.map(i => plainText(i.split(' | ')[0])), heading }); list = []; };

  for (const line of cleanReadme(md).split('\n')) {
    const t = line.trim();
    if (fence) {
      if (t.startsWith(fence)) {
        blocks.push({ type: 'code', code: code.join('\n').replace(/^\n+|\s+$/g, ''), heading });
        fence = null;
        code = [];
      } else {
        code.push(line);
      }
      continue;
    }
    const fenceMatch = t.match(/^(```|~~~)/);
    const headingMatch = t.match(/^#{1,6}\s+(.*)$/);
    const listMatch = t.match(/^(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (fenceMatch) { flushPara(); flushList(); fence = fenceMatch[1]; continue; }
    if (headingMatch) {
      flushPara();
      flushList();
      const level = t.match(/^#+/)[0].length;
      headingPath.length = level - 1;
      headingPath[level - 1] = plainText(headingMatch[1]).toLowerCase();
      heading = headingPath.filter(Boolean).join(' > ');
      continue;
    }
    if (/^(=+|-+)$/.test(t) && para.length) { heading = plainText(para.pop()).toLowerCase(); flushPara(); continue; }
    if (/^([-*_]\s*){3,}$/.test(t)) { flushPara(); flushList(); continue; }
    if (listMatch) { flushPara(); list.push(listMatch[1]); continue; }
    if (!t || t.startsWith('|')) { flushPara(); flushList(); continue; }
    flushList();
    para.push(t.replace(/^>\s*/, ''));
  }
  flushPara();
  flushList();
  return blocks;
}

const SKIP_HEADINGS = /licen|contribut|sponsor|backer|star history|contents|cuprins|changelog|acknowledg|credits|citation|faq|integration|community|ecosystem|related|alternative|who uses|used by|showcase|built with|libraries|bindings|translation|press|talks|articles|videos/;
const PROMO_RE = /sponsor|donat|t-shirt|merch|sticker|star us|buy me|patreon|discord|join our|follow us|newsletter|subscribe|follow me|check out my/i;
const INSTALL_HEADINGS = /install|get(ting)?[ -]started|quick ?start|setup|download|usage|run/;
const USAGE_HEADINGS = /usage|example|quick ?start|get(ting)?[ -]started|demo|how to use|basic|tutorial|hello/;
const INSTALL_RE = /^(npm (i|install)|npx |pnpm (add|dlx|i)|yarn (add|global|dlx)|bun (add|x|i)|bunx |pip3? install|(python3?|py) -m pip install|pipx install|uv (tool|pip) install|uvx |cargo (install|add)|go (install|get)|brew install|docker (run|pull|compose)|winget install|choco install|scoop install|gem install|composer (require|global)|dotnet (tool|add)|(sudo )?apt(-get)? install|curl .*\|\s*(sudo )?(ba)?sh|wget .*\|\s*(ba)?sh|iwr .*\|\s*iex|irm .*\|\s*iex|git clone )/;

function stripShellPrompt(line) {
  return line.trim().replace(/^(\$|>|PS>|PS [^>]*>)\s*/, '');
}

function pickIntro(blocks) {
  const para = blocks.find(b => b.type === 'para'
    && !SKIP_HEADINGS.test(b.heading)
    && b.text.length >= 60
    && b.text.split(' ').length >= 8
    && (/[.。]/.test(b.text) || b.text.length >= 100)
    && !PROMO_RE.test(b.text)
    && (b.text.match(/\p{L}/gu) || []).length > b.text.length * 0.6);
  return para ? truncateText(para.text, 420) : '';
}

function pickFeatures(blocks) {
  const isUseful = b => b.type === 'list' && b.items.length >= 3 && !SKIP_HEADINGS.test(b.heading)
    && b.items.filter(i => i.split(' ').length > 3).length >= b.items.length * 0.6;
  const list = blocks.find(b => isUseful(b) && /feature|highlight|why|what|capabilit|key|benefit|overview/.test(b.heading))
    || blocks.find(isUseful);
  return list ? list.items.slice(0, 5).map(i => truncateText(i, 160)) : [];
}

function pickInstall(blocks) {
  const codeBlocks = blocks.filter(b => b.type === 'code');
  const ordered = [...codeBlocks.filter(b => INSTALL_HEADINGS.test(b.heading)), ...codeBlocks];
  for (const block of ordered) {
    for (const line of block.code.split('\n')) {
      const cmd = stripShellPrompt(line);
      if (INSTALL_RE.test(cmd)) return cmd;
    }
  }
  return '';
}

function pickUsage(blocks) {
  const block = blocks.find(b => b.type === 'code' && USAGE_HEADINGS.test(b.heading) && b.code.trim().length >= 12
    && !b.code.split('\n').filter(l => l.trim() && !/^(#|\/\/)/.test(l.trim())).every(l => INSTALL_RE.test(stripShellPrompt(l))));
  if (!block) return '';
  const lines = block.code.split('\n');
  return lines.length > 14 ? lines.slice(0, 14).join('\n') + '\n…' : block.code;
}

function roCount(n, one, many) {
  if (n === 1) return one;
  const de = n >= 20 && (n % 100 === 0 || n % 100 >= 20) ? 'de ' : '';
  return `${n} ${de}${many}`;
}

function timeAgoRo(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days < 1) return 'azi';
  if (days < 30) return `acum ${roCount(days, 'o zi', 'zile')}`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return `acum ${roCount(months, 'o lună', 'luni')}`;
  return `acum ${roCount(Math.floor(days / 365.25), 'un an', 'ani')}`;
}

function repoFacts(repo) {
  const facts = [];
  if (repo.archived) facts.push('Arhivat de autor: nu mai primește modificări.');
  if (repo.pushed_at) {
    const old = Date.now() - new Date(repo.pushed_at).getTime() > 2 * 365 * 86400000;
    facts.push(`Ultima modificare: ${timeAgoRo(repo.pushed_at)}${old ? ' (posibil abandonat)' : ''}.`);
  }
  const license = repo.license && repo.license.spdx_id !== 'NOASSERTION' ? repo.license.spdx_id : (repo.license?.name || '');
  facts.push(license ? `Licență: ${license}.` : 'Licență: nedeclarată.');
  facts.push(`${formatNumber(repo.stargazers_count)} stele, ${formatNumber(repo.open_issues_count)} probleme raportate încă deschise.`);
  return facts;
}

// Offline cards: only what the README actually says, untranslated
function buildReadmeInsights(repo, readmeText) {
  const worthIf = [
    { type: 'text', value: 'Fără AI nu pot judeca pentru tine. Câteva fapte care ajută:' },
    { type: 'list', value: repoFacts(repo) }
  ];
  if (!readmeText.trim()) {
    const none = [{ type: 'text', value: 'Proiectul nu are README, deci nu am de unde lua informații.' }];
    return { source: 'readme', cards: { summary: none, example: none, tryIt: none, worthIf } };
  }

  const blocks = parseReadme(readmeText);
  const intro = pickIntro(blocks);
  const usage = pickUsage(blocks);
  const features = usage ? [] : pickFeatures(blocks);
  const install = pickInstall(blocks);

  const summary = [{ type: 'text', value: intro || 'README-ul nu are un paragraf de prezentare; descrierea scurtă e mai sus.' }];

  let example;
  if (usage) example = [{ type: 'code', value: usage }];
  else if (features.length) example = [{ type: 'text', value: 'Ce scrie README-ul că face:' }, { type: 'list', value: features }];
  else example = [{ type: 'text', value: 'README-ul nu are un exemplu de folosire.' }];

  let tryIt;
  if (install) tryIt = [{ type: 'code', value: install }];
  else if (repo.language) tryIt = [{ type: 'text', value: 'README-ul nu dă o comandă de instalare. Poți descărca codul cu:' }, { type: 'code', value: `git clone ${repo.clone_url}` }];
  else tryIt = [{ type: 'text', value: 'README-ul nu dă o comandă de instalare și proiectul nu are cod principal, deci pare unul de citit: îl deschizi direct pe GitHub.' }];

  return { source: 'readme', cards: { summary, example, tryIt, worthIf } };
}

function buildGeminiPrompt(repo, readmeText) {
  return `Explici unui om curios, care se descurcă cu calculatorul dar nu e programator, ce face concret un proiect de pe GitHub. Scrii în română corectă, cu diacritice, în propoziții scurte. Un termen tehnic îl explici pe românește, în paranteză, prima dată când apare (nu doar desfaci acronimul englezesc).

Regula de bază: fiecare frază trebuie să fie despre ACEST proiect. Dacă o frază s-ar potrivi și la alt proiect („economisește timp", „ușor de folosit", „comunitate mare"), înlocuiește-o cu un detaliu de aici: ce intră, ce iese, ce comenzi, ce fișiere, ce servicii. Fără laude („puternic", „modern", „revoluționar"). Nu inventa: dacă README-ul nu spune ceva, nu scrie.

Câmpuri:
- summary: 1-2 propoziții. Ce fel de lucru e (aplicație, bibliotecă de cod folosită de alți programatori, unealtă de terminal, extensie, listă de linkuri, carte, curs, colecție de exemple etc.) și ce face.
- example: un caz concret al folosirii PRINCIPALE (pentru ce l-ar folosi cineva, nu instalarea sau actualizarea lui), scris ca „Tu … → proiectul … → obții …". Folosește nume, comenzi sau fișiere reale din README. Dacă e o listă, o carte sau un curs, exemplul arată ce găsești în el și cum îl folosești.
- command: prima comandă de instalare sau pornire, copiată EXACT din README, pe o singură linie. Șir gol dacă README-ul nu are una. Nu compune tu comenzi.
- steps: 1-2 propoziții despre ce faci ca să vezi rezultatul (după comandă, sau de unde începi să citești).
- worthIf: continuarea frazei „Merită dacă …", concretă, fără să repeți începutul.
- skipIf: continuarea frazei „Nu merită dacă …", concretă, fără să repeți începutul.

Dacă README-ul e prea sărac ca să știi ce face proiectul, spune asta cinstit în summary în loc să ghicești.

Proiect: ${repo.full_name}
Descriere GitHub: ${repo.description || '(fără descriere)'}
Limbaj principal: ${repo.language || 'nespecificat'}
Etichete: ${(repo.topics || []).join(', ') || '(fără etichete)'}
README:
"""
${cleanReadme(readmeText).slice(0, 8000) || '(fără README)'}
"""`;
}

function geminiErrorMessage(status, message = '') {
  if (/api key/i.test(message)) return 'cheia Gemini nu e validă';
  if (status === 429) return 'limita gratuită Gemini e atinsă pentru moment';
  if (status === 500 || status === 503) return 'Gemini e aglomerat acum';
  if (status === 403) return 'cheia Gemini nu are acces';
  return `eroare Gemini ${status}`;
}

function stripVerdictPrefix(s) {
  return plainText(s).replace(/^(nu\s+)?merit[ăa]\s+dac[ăa]\s*/i, '').replace(/^…\s*/, '');
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function aiResultToInsights(data, model, repo, readmeText) {
  // Keep the command only if it really is in the README; if it isn't an install command, prefer one found there
  const command = stripShellPrompt(plainText(data.command || ''));
  const inReadme = command && plainText(readmeText).includes(command) ? command : '';
  const verified = (INSTALL_RE.test(inReadme) && inReadme) || pickInstall(parseReadme(readmeText)) || inReadme;
  const tryIt = [];
  if (verified) tryIt.push({ type: 'code', value: verified });
  if (plainText(data.steps)) tryIt.push({ type: 'text', value: plainText(data.steps) });
  if (!tryIt.length) tryIt.push({ type: 'text', value: 'README-ul nu spune cum se pornește.' });

  return {
    source: 'ai',
    model,
    cards: {
      summary: [{ type: 'text', value: plainText(data.summary) }],
      example: [{ type: 'text', value: plainText(data.example) }],
      tryIt,
      worthIf: [
        { type: 'text', value: capitalize(stripVerdictPrefix(data.worthIf)) },
        { type: 'text', value: `Nu merită dacă ${stripVerdictPrefix(data.skipIf)}`, muted: true }
      ]
    }
  };
}

async function generateAiInsights(repo, readmeText) {
  const prompt = buildGeminiPrompt(repo, readmeText);
  let lastError = 'Gemini n-a răspuns';

  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': state.geminiKey.trim() },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
            responseSchema: GEMINI_SCHEMA,
            thinkingConfig: model.startsWith('gemini-2.5') ? { thinkingBudget: 0 } : { thinkingLevel: 'low' }
          }
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        lastError = geminiErrorMessage(res.status, data.error?.message);
        if (lastError === 'cheia Gemini nu e validă') break;
        continue;
      }

      const text = (data.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
      const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
      if (parsed.summary && parsed.example) {
        return aiResultToInsights(parsed, data.modelVersion || model, repo, readmeText);
      }
      lastError = 'Gemini a dat un răspuns incomplet';
    } catch (e) {
      console.error(`Gemini (${model}) a eșuat, încerc următorul model:`, e);
      lastError = 'Gemini n-a răspuns';
    }
  }

  throw new Error(lastError);
}

// One request per repo, even if the card re-renders while Gemini is still writing
function getAiInsights(repo, readmeText) {
  if (!aiPending.has(repo.id)) {
    aiPending.set(repo.id, generateAiInsights(repo, readmeText)
      .then(insights => { cacheSet(aiCache, repo.id, insights); return insights; })
      .finally(() => aiPending.delete(repo.id)));
  }
  return aiPending.get(repo.id);
}

async function loadAiInsights(repo, readmeText) {
  let insights;
  try {
    insights = await getAiInsights(repo, readmeText);
  } catch (e) {
    insights = { ...buildReadmeInsights(repo, readmeText), aiError: e.message };
  }
  if (state.currentRepo?.id !== repo.id) return;
  const box = document.getElementById('aiInsightsBox');
  if (box) box.innerHTML = renderInsightsBox(insights);
}

function renderCardParts(parts) {
  return parts.map(part => {
    if (part.type === 'code') {
      return `<div class="card-code"><pre><code>${escapeHtml(part.value)}</code></pre><button type="button" class="code-copy-btn" title="Copiază comanda">Copiază</button></div>`;
    }
    if (part.type === 'list') {
      return `<ul class="card-list">${part.value.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
    }
    return `<p${part.muted ? ' class="muted"' : ''}>${escapeHtml(part.value)}</p>`;
  }).join('');
}

function renderInsightsBox(insights) {
  let tag;
  let note = '';
  if (insights.source === 'loading') {
    tag = '<span class="ai-powered-tag">Gemini citește README-ul…</span>';
  } else if (insights.source === 'ai') {
    tag = `<span class="ai-powered-tag" title="${escapeHtml(insights.model)}">Explicat de Gemini</span>`;
  } else if (insights.aiError) {
    tag = '<span class="ai-warn-tag">AI indisponibil</span>';
    note = `Gemini n-a putut răspunde (${escapeHtml(insights.aiError)}), așa că textul de mai jos e luat direct din README, netradus. <button type="button" class="ai-retry-btn" data-action="retry-ai">Reîncearcă</button>`;
  } else {
    tag = '<span class="ai-offline-tag">Doar din README</span>';
    note = 'Fără AI: textul e luat direct din README, netradus. Pentru explicații în română, pune o cheie Gemini gratuită în Setări.';
  }

  const cardHeader = def => `<div class="eli5-card-header"><span class="eli5-icon">${def.icon}</span><strong>${def.title}</strong></div>`;
  const cards = CARD_DEFS.map(def => {
    const body = insights.source === 'loading'
      ? '<div class="skeleton-box" style="height:14px; width:100%;"></div><div class="skeleton-box" style="height:14px; width:75%;"></div>'
      : renderCardParts(insights.cards[def.key]);
    return `<div class="eli5-card">${cardHeader(def)}${body}</div>`;
  }).join('');

  return `
    <div class="ai-header">
      <span class="ai-title-badge">🔍 Ce face, pe înțeles</span>
      ${tag}
    </div>
    ${note ? `<p class="ai-note">${note}</p>` : ''}
    <div class="ai-eli5-grid">${cards}</div>
  `;
}

// --- Render Repository Card ---
async function renderRepoCard(repo) {
  if (!repo) return;

  const isBookmarked = state.bookmarks.some(b => b.id === repo.id);
  const langColor = LANGUAGE_COLORS[repo.language] || '#6366f1';
  
  const topicsHtml = (repo.topics && repo.topics.length > 0)
    ? repo.topics.slice(0, 6).map(t => `<span class="topic-tag">#${t}</span>`).join('')
    : '<span class="topic-tag">#open-source</span>';

  // README is cached per repo, so re-renders (bookmark, settings) don't refetch it
  let readmeText = readmeCache.get(repo.id);
  if (readmeText === undefined) {
    readmeText = await fetchRepoReadme(repo.owner.login, repo.name);
    cacheSet(readmeCache, repo.id, readmeText);
  }
  state.currentReadmeText = readmeText;

  // Show README-only cards right away; with a Gemini key, show a placeholder and fill it when the AI answers
  const insights = aiCache.get(repo.id) || (state.geminiKey ? { source: 'loading' } : buildReadmeInsights(repo, readmeText));

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
      ${escapeHtml(repo.description) || 'Nicio descriere disponibilă pentru acest proiect.'}
    </p>

    <!-- AI Insights Box -->
    <div class="ai-insights-box" id="aiInsightsBox">
      ${renderInsightsBox(insights)}
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

  if (insights.source === 'loading') loadAiInsights(repo, readmeText);
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
    // Parse Markdown with marked.js, then strip scripts and event handlers: a README can contain any HTML,
    // and this page keeps the GitHub token and Gemini key in localStorage. Without DOMPurify, show plain text.
    if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
      readmeContent.innerHTML = DOMPurify.sanitize(marked.parse(readmeText));
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
  
  aiCache.clear();
  settingsModalOverlay.classList.remove('open');
  showToast('Setările au fost salvate!', 'success');
  fetchGitHubUser();
  if (state.currentRepo) renderRepoCard(state.currentRepo);
});

// Insights box buttons (the box is re-rendered, so listen on the card)
repoCard.addEventListener('click', (e) => {
  const copyBtn = e.target.closest('.code-copy-btn');
  if (copyBtn) {
    navigator.clipboard.writeText(copyBtn.previousElementSibling.textContent).then(
      () => showToast('Comanda a fost copiată în clipboard!', 'success'),
      () => showToast('Nu am putut copia; selectează comanda și copiaz-o manual.', 'warning')
    );
    return;
  }

  if (e.target.closest('[data-action="retry-ai"]') && state.currentRepo) {
    document.getElementById('aiInsightsBox').innerHTML = renderInsightsBox({ source: 'loading' });
    loadAiInsights(state.currentRepo, state.currentReadmeText);
  }
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
