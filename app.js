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

Returnează răspunsul STRICT sub formă de JSON cu următoarea structură:

{
  "eli5": {
    "overview": "Explică pe larg (3-4 propoziții) ce este acest proiect, ce face exact și care este scopul lui principal. Folosește termeni simpli și limba română naturală.",
    "problem": "Explică în detaliu (2-3 propoziții) ce problemă enervantă sau dificilă rezolvă acest proiect și cum era viața oamenilor sau a programatorilor înainte să existe această soluție.",
    "analogy": "Oferă o analogie intuitivă din viața reală (2-3 propoziții). De exemplu: 'Imaginează-ți că... E ca și cum...' ca să înțeleagă instant un copil de 5 ani sau cineva care nu are nicio legătură cu IT-ul.",
    "audience": "Explică clar cine sunt utilizatorii acestui proiect (2-3 propoziții) și în ce situații concrete din practică îl folosesc aceștia."
  },
  "whyUse": [
    "Motiv 1 specific, clar și bazat pe valoare reală",
    "Motiv 2 specific, clar și bazat pe valoare reală",
    "Motiv 3 specific, clar și bazat pe valoare reală"
  ]
}

REGULI OBLIGATORII:
- Totul în limba română corectă, fără Romglish (dacă e absolut necesar un termen tehnic ca 'server' sau 'database', explică-l pe scurt).
- FĂRĂ propoziții lipite artificial din engleză. Nu lipi direct descrierea în engleză în mijlocul frazelor în română!
- Nu folosi jargon de marketing gol ("revoluționar", "starea artei", "next-gen").
- Fii generos cu detaliile și explicațiile intuitive!

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

// --- Categorii pentru explicația offline (fără cheie Gemini) ---
const ELI5_CATEGORIES = [
  {
    keys: ['leetcode', 'interview', 'algorithm', 'coding-challenge', 'competitive-programming', 'data-structures'],
    overview: (repo) => `${repo.name} este o colecție vastă și bine structurată de probleme de algoritmică și exerciții de programare${repo.language ? ` implementate în ${repo.language}` : ''}. Proiectul adună sute de exerciții practice catalogate pe domenii, niveluri de dificultate și frecvența cu care sunt cerute la interviuri.`,
    problem: () => `Rezolvă problema pregătirii haotice pentru interviurile tehnice. În loc să cauți la întâmplare exerciții pe tot internetul sau să pierzi ore încercând să înțelegi explicații incomplete, ai un ghid complet de studiu într-un singur loc.`,
    analogy: () => `Imaginează-ți că te pregătești pentru un examen greu de admitere: în loc să ghicești ce întrebări vor cădea, ai o culegere completă cu toate variantele din anii trecuți și cu rezolvările lor pas cu pas.`,
    audience: () => `Este utilizat în special de studenți, candidați pentru roluri de programator și ingineri software care vor să obțină un job la companiile IT de top.`
  },
  {
    keys: ['awesome', 'curated', 'resources', 'cheatsheet', 'collection', 'list'],
    overview: (repo) => `${repo.name} este o bibliotecă centralizată și o colecție selecționată de resurse, ghiduri, articole și instrumente valoroase${repo.language ? ` legate de ${repo.language}` : ''}. Proiectul filtrează zgomotul de pe internet și păstrează doar materialele cu adevărat utile.`,
    problem: () => `Elimină supraîncărcarea cu informații inutile. Când vrei să înveți un domeniu nou, internetul este plin de tutoriale vechi sau slabe; acest ghid îți oferă scurtătura către cele mai bune resurse verificate.`,
    analogy: () => `E ca un ghid turistic al unui oraș străin scris de un localnic generos: în loc să intri în localuri proaste la întâmplare, ghidul îți arată exact locurile de nota 10 unde merită să mergi.`,
    audience: () => `Îl folosesc pasionații de tehnologie, programatorii curioși și profesioniștii care vor să descopere rapid cele mai bune resurse dintr-un domeniu fără risipă de timp.`
  },
  {
    keys: ['machine-learning', 'deep-learning', 'llm', 'neural', 'transformer', 'gpt', 'diffusion', 'artificial-intelligence', 'nlp', 'ai'],
    overview: (repo) => `${repo.name} este un proiect avansat de inteligență artificială${repo.language ? ` dezvoltat în ${repo.language}` : ''}, capabil să analizeze date complexe, să recunoască tipare sau să genereze conținut inteligent în mod automat.`,
    problem: () => `Rezolvă sarcini extrem de complexe care ar dura sute de ore de muncă manuală sau care ar necesita calcule imposibil de efectuat de către un om (cum ar fi analizarea a milioane de texte sau imagini).`,
    analogy: () => `E ca un asistent virtual genial care citește o bibliotecă întreagă în câteva secunde și este capabil să îți sintetizeze răspunsul corect sau să creeze ceva nou la comandă.`,
    audience: () => `Este utilizat de cercetători, dezvoltatori de aplicații de IA și companii care vor să automatizeze procese de decizie sau să adauge funcționalități inteligente.`
  },
  {
    keys: ['framework', 'library', 'sdk', 'toolkit', 'boilerplate', 'starter'],
    overview: (repo) => `${repo.name} este un set de blocuri de construcție și piese de cod prefabricate${repo.language ? ` în ${repo.language}` : ''}. Oferă arhitectura de bază necesară pentru ca dezvoltatorii să creeze aplicații noi fără a reconstrui totul de la zero.`,
    problem: () => `Scapă programatorii de munca repetitivă de a scrie de la zero cod pentru funcționalități de bază (autentificare, conectare la baze de date, gestionarea fișierelor sau navigație).`,
    analogy: () => `E ca o cutie cu piese Lego gata turnate: în loc să produci tu fiecare piesă din plastic topit, le pui cap la cap pe cele gata făcute și construiești castelul dorit în timp record.`,
    audience: () => `Îl folosesc echipele de dezvoltare și creatorii de produse software care vor să lanseze aplicații rapid și să mențină o calitate ridicată a codului.`
  },
  {
    keys: ['cli', 'terminal', 'command-line', 'shell', 'bash', 'zsh'],
    overview: (repo) => `${repo.name} este o unealtă software rapidă care rulează direct în terminal (linia de comandă)${repo.language ? `, realizată în ${repo.language}` : ''}. Permite executarea de acțiuni complexe prin comenzi scurte de text.`,
    problem: () => `Rezolvă problema interfețelor grafice lente. În loc să navighezi prin zeci de meniuri și să dai click-uri repetate, tastezi o comandă scurtă și treaba se execută instantaneu.`,
    analogy: () => `E ca o cheie cu telecomandă pentru mașină: în loc să descui manual fiecare portieră pe rând, apeși un buton și totul se deschide dintr-o dată.`,
    audience: () => `Îl folosesc administratorii de sistem, inginerii DevOps și programatorii care lucrează intensiv la tastatură și vor viteză maximă.`
  },
  {
    keys: ['docker', 'kubernetes', 'devops', 'ci-cd', 'infrastructure', 'self-hosted', 'monitoring', 'deployment'],
    overview: (repo) => `${repo.name} este un instrument de infrastructură care ambalează, distribuie și rulează aplicații software în medii izolate și sigure.`,
    problem: () => `Elimină celebra scuză „la mine pe calculator funcționează, dar pe server a crăpat”. Asigură că aplicația rulează identic oriunde este instalată.`,
    analogy: () => `E ca un container de marfă standardizat: indiferent ce pui în el (electronice, haine, mâncare), navele și camioanele îl pot transporta în siguranță fără să le pese de conținut.`,
    audience: () => `Îl folosesc inginerii care publică servicii online și vor ca site-urile sau aplicațiile lor să meargă fără întrerupere 24 din 24.`
  },
  {
    keys: ['game', 'gamedev', 'engine', 'godot', 'unity', 'emulator'],
    overview: (repo) => `${repo.name} este un proiect dedicat creației de jocuri video sau emulării de console de jocuri${repo.language ? ` dezvoltat în ${repo.language}` : ''}. Furnizează mecanicele de bază pentru fizică, grafică și sunet.`,
    problem: () => `Scapă creatorii de jocuri de necesitatea de a programa manual formule matematice grele pentru gravitație, mișcarea personajelor sau coliziunile dintre obiecte.`,
    analogy: () => `E ca o scenă de teatru gata echipată cu lumini, decoruri mobile și efecte speciale: regizorul (creatorul de jocuri) trebuie doar să pună actorii în scenă.`,
    audience: () => `Îl folosesc dezvoltatorii independenți de jocuri, studiourile de gaming și pasionații care vor să retrăiască jocuri clasice pe calculatoare noi.`
  },
  {
    keys: ['database', 'sql', 'orm', 'storage', 'cache', 'postgres', 'redis'],
    overview: (repo) => `${repo.name} este un sistem specializat pentru stocarea, organizarea și găsirea ultra-rapidă a datelor și informațiilor dintr-o aplicație.`,
    problem: () => `Rezolvă problema pierderii datelor și a timpului mare de căutare. Când ai mii de utilizatori, găsirea informației potrivite fără o bază de date ar dura minute sau ore.`,
    analogy: () => `E ca un dulap de arhivă inteligent cu mii de sertare etichetate și un robot super-rapid care îți aduce dosarul cerut într-o fracțiune de secundă.`,
    audience: () => `Este un pilon central utilizat de aproape orice aplicație web, mobilă sau bancară care trebuie să păstreze datele în siguranță.`
  },
  {
    keys: ['security', 'pentest', 'vulnerability', 'hacking', 'cryptography', 'privacy', 'firewall'],
    overview: (repo) => `${repo.name} este o unealtă de securitate cibernetică creată pentru detectarea vulnerabilităților, criptarea datelor sau protejarea sistemelor informatice.`,
    problem: () => `Previne atacurile cibernetice și scurgerile de date confidențiale. Ajută la descoperirea punctelor slabe dintr-un program înainte ca atacatorii rău intenționați să le poată exploata.`,
    analogy: () => `E ca un lăcătuș profesionist angajat să încerce să spargă ușa unei case: dacă el reușește să intre, îți spune exact unde trebuie să schimbi yala înainte să vină hoții.`,
    audience: () => `Îl folosesc specialiștii în securitate IT, hackerii etici și administratorii de rețea care vor să-și protejeze datele utilizatorilor.`
  },
  {
    keys: ['tutorial', 'course', 'learning', 'book', 'guide', 'roadmap', 'education', 'handbook'],
    overview: (repo) => `${repo.name} este un ghid educațional complet și bine structurat, conceput pentru învățarea pas cu pas a unor concepte fundamentale sau avansate de tehnologie.`,
    problem: () => `Elimină confuzia începătorilor. În loc să navighezi prin sute de articole împrăștiate și contradictorii, ai un traseu clar de învățare, de la simplu la complex.`,
    analogy: () => `E ca o hartă de drumeție pe munte cu traseul marcat: știi exact unde începe drumul, unde sunt locurile de odihnă și cum ajungi în siguranță în vârf.`,
    audience: () => `Îl folosesc persoanele care învață autonom, studenții și profesorii care caută un suport de curs de calitate.`
  },
  {
    keys: ['api', 'rest', 'graphql', 'backend', 'http', 'server', 'microservice'],
    overview: (repo) => `${repo.name} este o interfață de comunicare sau o aplicație de backend${repo.language ? ` scrisă în ${repo.language}` : ''} care permite conectarea și schimbul de date între diferite sisteme.`,
    problem: () => `Rezolvă problema izolării programelor. Permite ca o aplicație de pe telefon și un server din alt colț al lumii să vorbească între ele instantaneu.`,
    analogy: () => `E ca un chelner într-un restaurant: preia comanda de la masa ta, o duce în bucătărie și vine înapoi cu mâncarea. Tu nu trebuie să intri în bucătărie deloc.`,
    audience: () => `Îl folosesc programatorii de backend și inginerii care construiesc servicii interconectate pe internet.`
  },
  {
    keys: ['ui', 'css', 'design', 'frontend', 'react', 'vue', 'svelte', 'component', 'tailwind', 'animation'],
    overview: (repo) => `${repo.name} este o colecție de elemente vizuale de interfață, stiluri și componente grafice${repo.language ? ` pentru ${repo.language}` : ''} destinate creării de site-uri și aplicații arătoase.`,
    problem: () => `Economisește sute de ore de muncă vizuală. Scapă dezvoltatorii web de necesitatea de a desena și programa manual fiecare buton, meniu sau animație.`,
    analogy: () => `E ca un set de piese de mobilier gata croite: le așezi în cameră și arată impecabil din prima zi, fără să dai tu cu ciocanul sau cu vopseaua.`,
    audience: () => `Îl folosesc designerii web și dezvoltatorii frontend care vor să creeze interfețe moderne, responsive și atractive.`
  },
  {
    keys: ['bot', 'automation', 'scraper', 'crawler', 'workflow', 'scheduler'],
    overview: (repo) => `${repo.name} este un robot software conceput pentru automatizarea sarcinilor repetitive, colectarea de date de pe internet sau executarea de fluxuri automate.`,
    problem: () => `Elimină munca manuală obositoare (cum ar fi copierea și lipirea de date, descărcarea de fișiere sau trimiterea de e-mailuri) care consumă timp și aduce greșeli.`,
    analogy: () => `E ca un ajutor de nădejde care face aceeași treabă plictisitoare de o mie de ori fără să obosească, fără să facă pauze și fără să greșească.`,
    audience: () => `Îl folosesc analiștii de date, antreprenorii și oricine vrea să lase treburile de rutină pe seama calculatorului.`
  },
  {
    keys: ['mobile', 'android', 'ios', 'flutter', 'react-native', 'kotlin', 'swift'],
    overview: (repo) => `${repo.name} este o soluție software dedicată dezvoltării de aplicații pentru telefoane inteligente și tablete${repo.language ? ` construite în ${repo.language}` : ''}.`,
    problem: () => `Rezolvă provocarea de a crea aplicații rapide și fluide pe ecrane de dimensiuni diferite și pe sisteme de operare distincte (precum Android și iOS).`,
    analogy: () => `E ca un tipar inteligent de croitorie: ajustează hainele automat astfel încât să vină perfect pe oricine, indiferent de înălțime sau conformație.`,
    audience: () => `Îl folosesc dezvoltatorii de aplicații mobile care vor să ofere o experiență impecabilă utilizatorilor pe smartphone.`
  }
];

function pickEli5Category(repo, readmeText) {
  const haystack = [
    repo.name,
    repo.description || '',
    (repo.topics || []).join(' '),
    readmeText.slice(0, 1500)
  ].join(' ').toLowerCase();

  let best = null;
  let bestScore = 0;
  for (const cat of ELI5_CATEGORIES) {
    const score = cat.keys.reduce((acc, k) => acc + (haystack.includes(k) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  return best || {
    overview: (r) => `${r.name} este un proiect open-source apreciat${r.language ? `, creat în principal în ${r.language}` : ''}, al cărui cod este public și pus gratuit la dispoziția tuturor.`,
    problem: () => `Rezolvă problema reinventării roții în programare: oferă o soluție deja testată și finisată pentru a economisi timpul comunității.`,
    analogy: () => `E ca o rețetă culinară publicată pe internet: oricine o poate citi, o poate găti acasă și îi poate adăuga propriile condimente pentru a o face și mai bună.`,
    audience: () => `Îl folosesc programatorii și pasionații din întreaga lume care caută o bază solidă pentru proiectele lor.`
  };
}

function popularityPhrase(stars) {
  if (stars >= 50000) return 'e printre cele mai cunoscute proiecte de pe GitHub la nivel mondial';
  if (stars >= 10000) return 'foarte multă lume îl folosește deja zi de zi';
  if (stars >= 1000) return 's-a strâns o comunitate serioasă în jurul lui';
  return 'e apreciat de un grup dedicat de utilizatori';
}

// --- Smart Offline Fallback Generator ---
function buildFallbackInsights(repo, readmeText = '') {
  const cat = pickEli5Category(repo, readmeText);
  const stars = repo.stargazers_count || 0;

  let overviewText = cat.overview(repo);
  if (repo.description && repo.description.trim()) {
    const cleanDesc = repo.description.trim().replace(/\s+/g, ' ').replace(/[.\s]+$/, '');
    overviewText += ` Autorii îl descriu oficial pe GitHub astfel: „${cleanDesc}”.`;
  }
  overviewText += ` Proiectul adună peste ${formatNumber(stars)} de stele pe GitHub, ceea ce înseamnă că ${popularityPhrase(stars)}.`;

  const eli5 = {
    overview: overviewText,
    problem: cat.problem(repo),
    analogy: cat.analogy(repo),
    audience: cat.audience(repo)
  };

  const whyUse = [];
  if (stars > 5000) {
    whyUse.push(`Proiect extrem de popular și de încredere, susținut de peste ${formatNumber(stars)} de stele pe GitHub.`);
  } else {
    whyUse.push(`Apreciat de comunitatea de ${repo.language || 'dezvoltatori'} cu peste ${formatNumber(stars)} de stele.`);
  }

  if (readmeText.toLowerCase().includes('fast') || readmeText.toLowerCase().includes('performan')) {
    whyUse.push('Optimizat pentru performanță ridicată, viteză de execuție și utilizare eficientă a resurselor.');
  } else if (readmeText.toLowerCase().includes('easy') || readmeText.toLowerCase().includes('simple')) {
    whyUse.push('Conceput pentru a fi ușor de instalat, configurat și integrat în proiectele existente.');
  } else {
    whyUse.push('Economisește timp prețios de dezvoltare prin furnizarea de funcționalități gata pregătite.');
  }

  if (repo.license) {
    whyUse.push(`Licențiat oficial Open-Source (${repo.license.name || repo.license.spdx_id || 'Sursă Deschisă'}).`);
  } else {
    whyUse.push('Proiect deschis, menținut activ de către comunitate.');
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
