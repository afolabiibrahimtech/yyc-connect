// ── jobs-ai.js — AI job search via Firebase Function proxy ────────────────────

// ── Smart search URL builder ──────────────────────────────────────────────────
function buildSearchURLs(query, parsed) {
  const role = encodeURIComponent(parsed.role || query);
  const loc  = encodeURIComponent('Calgary AB');
  const loc2 = encodeURIComponent('Calgary, Alberta');
  const slug = (parsed.role || query).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return [
    {
      name:  'Indeed',
      color: '#2164F3',
      url:   `https://ca.indeed.com/jobs?q=${role}&l=${loc}&fromage=14`,
      desc:  `${parsed.count || 'Active'} listings · Updated daily`,
    },
    {
      name:  'Glassdoor',
      color: '#0CAA41',
      url:   `https://www.glassdoor.ca/Job/jobs.htm?suggestCount=0&suggestChosen=false&clickSource=searchBtn&typedKeyword=${role}&sc.keyword=${role}&locT=C&locId=2278862&locKeyword=Calgary%2C+Alberta&jobType=all`,
      desc:  'Company reviews + salary insights',
    },
    {
      name:  'LinkedIn',
      color: '#0A66C2',
      url:   `https://www.linkedin.com/jobs/search/?keywords=${role}&location=${loc2}&f_TPR=r604800`,
      desc:  'Easy Apply on many postings',
    },
  ];
}

// ── Call Cloudflare Worker proxy ─────────────────────────────────────────────
const WORKER_URL = 'https://yyc-jobs-ai.keyscapeltd.workers.dev';

async function analyseJobQuery(query) {
  const res = await fetch(WORKER_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ query }),
  });

  if (!res.ok) throw new Error(`Worker returned ${res.status}`);
  return await res.json();
}

// ── Platform card HTML ────────────────────────────────────────────────────────
function platformCardHTML(p) {
  return `
    <a href="${p.url}" target="_blank" rel="noopener" class="ai-platform-card">
      <div class="ai-platform-logo" style="background:${p.color}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </div>
      <div class="ai-platform-info">
        <div class="ai-platform-name">Search ${p.name}</div>
        <div class="ai-platform-desc">${p.desc}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </a>`;
}

// ── Fallback — show platform cards without AI analysis ────────────────────────
function renderFallback(container, query) {
  const urls = buildSearchURLs(query, { role: query });
  container.innerHTML = `
    <div class="ai-job-tip" style="border-color:#FCA5A5;background:#FFF1F2;color:#991B1B">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      AI analysis unavailable — searching directly for <strong>${query}</strong> on all platforms
    </div>
    <div class="ai-platform-cards">
      ${urls.map(platformCardHTML).join('')}
    </div>
    <button class="ai-clear-btn" onclick="window._clearJobAI()">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
      Clear search
    </button>`;
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function runJobAISearch(query) {
  const container = document.getElementById('ai-job-results');
  if (!container) return;

  // Loading state
  container.style.display = 'block';
  container.innerHTML = `
    <div class="ai-job-loading">
      <div class="ai-spinner"></div>
      <p>Finding <strong>${query}</strong> roles in Calgary...</p>
    </div>`;

  let parsed = null;

  try {
    parsed = await analyseJobQuery(query);
  } catch(e) {
    console.warn('AI proxy unavailable, using fallback:', e.message);
    renderFallback(container, query);
    return;
  }

  const urls = buildSearchURLs(query, parsed);

  container.innerHTML = `
    <div class="ai-job-header">
      <div class="ai-job-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4l3 3"/>
        </svg>
      </div>
      <div>
        <div class="ai-job-title">"${parsed.role || query}" in Calgary</div>
        <div class="ai-job-sub">
          ${[parsed.level ? parsed.level.charAt(0).toUpperCase() + parsed.level.slice(1) + ' level' : '', parsed.salaryRange].filter(Boolean).join(' · ')}
        </div>
      </div>
    </div>

    ${parsed.tip ? `
    <div class="ai-job-tip">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
      ${parsed.tip}
    </div>` : ''}

    ${parsed.topSkills?.length ? `
    <div class="ai-skills-row">
      <span class="ai-skills-label">Key skills:</span>
      ${parsed.topSkills.map(s => `<span class="ai-skill-chip">${s}</span>`).join('')}
    </div>` : ''}

    <div class="ai-platform-cards">
      ${urls.map(platformCardHTML).join('')}
    </div>

    ${parsed.relatedRoles?.length ? `
    <div class="ai-related">
      <span class="ai-related-label">Also try:</span>
      ${parsed.relatedRoles.map(r =>
        `<button class="ai-related-chip" onclick="window._jobAISearch('${r.replace(/'/g,"\\\'")}')">${r}</button>`
      ).join('')}
    </div>` : ''}

    <button class="ai-clear-btn" onclick="window._clearJobAI()">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
      Clear search
    </button>`;
}


// ── Popular job searches ──────────────────────────────────────────────────────
const POPULAR_JOBS = [
  { role: 'UI/UX Designer',        level: 'Entry–Mid',  salary: '$55–75K' },
  { role: 'Software Developer',     level: 'Mid',        salary: '$70–95K' },
  { role: 'Registered Nurse',       level: 'Any',        salary: '$75–95K' },
  { role: 'Project Manager',        level: 'Mid–Senior', salary: '$75–100K' },
  { role: 'Accountant',             level: 'Entry–Mid',  salary: '$55–75K' },
  { role: 'Customer Service Rep',   level: 'Entry',      salary: '$35–50K' },
  { role: 'Data Analyst',           level: 'Mid',        salary: '$65–85K' },
  { role: 'Marketing Coordinator',  level: 'Entry–Mid',  salary: '$45–65K' },
  { role: 'Civil Engineer',         level: 'Mid',        salary: '$75–100K' },
  { role: 'Warehouse Associate',    level: 'Entry',      salary: '$38–50K' },
  { role: 'Graphic Designer',       level: 'Entry–Mid',  salary: '$45–65K' },
  { role: 'Financial Analyst',      level: 'Mid',        salary: '$65–85K' },
  { role: 'Electrician',            level: 'Any',        salary: '$70–95K' },
  { role: 'HR Coordinator',         level: 'Entry–Mid',  salary: '$50–70K' },
  { role: 'Sales Representative',   level: 'Entry',      salary: '$45–65K' },
  { role: 'Frontend Developer',     level: 'Mid',        salary: '$70–90K' },
];

// Shuffle array
function shuffle(arr) {
  return arr.map(v => ({ v, s: Math.random() })).sort((a,b) => a.s - b.s).map(x => x.v);
}

export function renderPopularJobs() {
  const grid = document.getElementById('popular-jobs-grid');
  if (!grid) return;

  // Show 8 random ones each time
  const shown = shuffle(POPULAR_JOBS).slice(0, 8);

  grid.innerHTML = shown.map(j => {
    const role    = encodeURIComponent(j.role);
    const indeedUrl    = `https://ca.indeed.com/jobs?q=${role}&l=Calgary+AB&fromage=14`;
    const glassdoorUrl = `https://www.glassdoor.ca/Job/jobs.htm?suggestCount=0&typedKeyword=${role}&sc.keyword=${role}&locT=C&locId=2278862&locKeyword=Calgary%2C+Alberta`;
    const linkedinUrl  = `https://www.linkedin.com/jobs/search/?keywords=${role}&location=Calgary%2C+Alberta&f_TPR=r604800`;

    return `
      <div class="popular-job-card" onclick="window._jobAISearch('${j.role.replace(/'/g,"\'")}')">
        <div class="pjc-role">${j.role}</div>
        <div class="pjc-meta">${j.level} · ${j.salary} CAD</div>
        <div class="pjc-platforms">
          <div class="pjc-dot" style="background:#2164F3" title="Indeed"></div>
          <div class="pjc-dot" style="background:#0CAA41" title="Glassdoor"></div>
          <div class="pjc-dot" style="background:#0A66C2" title="LinkedIn"></div>
        </div>
      </div>`;
  }).join('');
}
