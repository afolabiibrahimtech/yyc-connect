// ── jobs-ai.js — AI analysis + platform links + JSearch live listings ─────────
import { db, auth } from './firebase.js';
import {
  doc, setDoc, deleteDoc, collection,
  onSnapshot, serverTimestamp, query, where
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const WORKER_URL = 'https://yyc-jobs-ai.keyscapeltd.workers.dev';

// ── Source branding ───────────────────────────────────────────────────────────
const SOURCE_BRANDS = {
  'LinkedIn':        { color: '#0A66C2', label: 'LinkedIn'        },
  'Indeed':          { color: '#2164F3', label: 'Indeed'          },
  'Glassdoor':       { color: '#0CAA41', label: 'Glassdoor'       },
  'ZipRecruiter':    { color: '#44BB59', label: 'ZipRecruiter'    },
  'Monster':         { color: '#6E00FF', label: 'Monster'         },
  'Job Bank Canada': { color: '#D4000F', label: 'Job Bank Canada' },
  'Workopolis':      { color: '#E8421A', label: 'Workopolis'      },
  'SimplyHired':     { color: '#5BB3D0', label: 'SimplyHired'     },
  'Eluta':           { color: '#2E86AB', label: 'Eluta'           },
  'Careerjet':       { color: '#FF6B00', label: 'Careerjet'       },
};

function getBrand(source) {
  if (!source) return { color: '#64748B', label: 'Job Board' };
  if (SOURCE_BRANDS[source]) return SOURCE_BRANDS[source];
  const key = Object.keys(SOURCE_BRANDS).find(k =>
    source.toLowerCase().includes(k.toLowerCase())
  );
  return key ? SOURCE_BRANDS[key] : { color: '#64748B', label: source };
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days/7)}w ago`;
  return `${Math.floor(days/30)}mo ago`;
}

// ── Platform quick-link cards (Indeed, LinkedIn, Glassdoor) ──────────────────
function buildPlatformCards(query, parsed) {
  const role  = encodeURIComponent(parsed?.role || query);
  const loc   = encodeURIComponent('Calgary AB');
  const loc2  = encodeURIComponent('Calgary, Alberta');

  return [
    {
      name:  'Indeed',
      color: '#2164F3',
      url:   `https://ca.indeed.com/jobs?q=${role}&l=${loc}&fromage=14`,
      desc:  'Updated daily · Entry to senior',
    },
    {
      name:  'LinkedIn',
      color: '#0A66C2',
      url:   `https://www.linkedin.com/jobs/search/?keywords=${role}&location=${loc2}&f_TPR=r604800`,
      desc:  'Easy Apply on many postings',
    },
    {
      name:  'Glassdoor',
      color: '#0CAA41',
      url:   `https://www.glassdoor.ca/Job/jobs.htm?suggestCount=0&typedKeyword=${role}&sc.keyword=${role}&locT=C&locId=2278862&locKeyword=Calgary%2C+Alberta`,
      desc:  'Company reviews + salaries',
    },
  ];
}

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

// ── Fetch from APIs ───────────────────────────────────────────────────────────
async function fetchAIAnalysis(query) {
  const res = await fetch(WORKER_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return await res.json();
}

async function fetchRealJobs(query, page = 1) {
  try {
    const res = await fetch(`${WORKER_URL}/search-jobs`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query, page }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error('JSearch error:', text);
      return { jobs: [], total: 0, error: text };
    }
    return JSON.parse(text);
  } catch(e) {
    console.error('fetchRealJobs failed:', e.message);
    return { jobs: [], total: 0, error: e.message };
  }
}

// ── Job card HTML ─────────────────────────────────────────────────────────────
function jobCardHTML(job) {
  const brand  = getBrand(job.source);
  const posted = timeAgo(job.posted);
  const uid    = auth.currentUser?.uid;

  return `
    <div class="real-job-card" data-id="${job.id}">
      <div class="rjc-header">
        <div class="rjc-logo" style="background:${brand.color}20;border:1px solid ${brand.color}30">
          ${job.logo
            ? `<img src="${job.logo}" style="width:28px;height:28px;object-fit:contain;border-radius:4px" onerror="this.style.display='none'">`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${brand.color}" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>`
          }
        </div>
        <div class="rjc-info">
          <div class="rjc-title">${job.title}</div>
          <div class="rjc-company">${job.company} · ${job.location}</div>
        </div>
        ${uid ? `
        <button class="rjc-save-btn" data-job-id="${job.id}" data-job-title="${job.title}" data-job-company="${job.company}" data-job-url="${job.applyUrl}" title="Save job">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
        </button>` : ''}
      </div>
      <div class="rjc-meta">
        ${job.salary ? `<span class="rjc-salary">${job.salary}</span>` : ''}
        ${job.type   ? `<span class="rjc-tag">${job.type.replace(/_/g,' ')}</span>` : ''}
        ${job.remote ? `<span class="rjc-tag rjc-remote">Remote</span>` : ''}
      </div>
      ${job.description ? `<p class="rjc-desc">${job.description}</p>` : ''}
      <div class="rjc-footer">
        <span class="rjc-source" style="color:${brand.color}">
          <span class="rjc-source-dot" style="background:${brand.color}"></span>
          ${brand.label}${posted ? ` · ${posted}` : ''}
        </span>
        <a href="${job.applyUrl}" target="_blank" rel="noopener" class="rjc-apply-btn">
          Apply
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </div>
    </div>`;
}

// ── Wire save buttons ─────────────────────────────────────────────────────────
function wireSaveButtons(container) {
  container.querySelectorAll('.rjc-save-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const uid = auth.currentUser?.uid;
      if (!uid) { window._toast('Sign in to save jobs'); return; }
      await setDoc(doc(db, 'users', uid, 'savedJobs', btn.dataset.jobId), {
        jobId:    btn.dataset.jobId,
        title:    btn.dataset.jobTitle,
        company:  btn.dataset.jobCompany,
        applyUrl: btn.dataset.jobUrl,
        savedAt:  serverTimestamp(),
      });
      btn.style.color = 'var(--amber)';
      btn.style.borderColor = 'var(--amber)';
      window._toast('Job saved');
    });
  });
}

// ── Main search ───────────────────────────────────────────────────────────────
let currentQuery = '';
let currentPage  = 1;

export async function runJobAISearch(query) {
  currentQuery = query;
  currentPage  = 1;

  const container = document.getElementById('ai-job-results');
  if (!container) return;

  container.style.display = 'block';
  container.innerHTML = `
    <div class="ai-job-loading">
      <div class="ai-spinner"></div>
      <p>Searching <strong>${query}</strong> jobs in Calgary...</p>
    </div>`;

  // Run AI + JSearch in parallel
  const [aiResult, jobResult] = await Promise.allSettled([
    fetchAIAnalysis(query),
    fetchRealJobs(query, 1),
  ]);

  const ai   = aiResult.status  === 'fulfilled' ? aiResult.value  : null;
  const jobs = jobResult.status === 'fulfilled' ? (jobResult.value.jobs || []) : [];
  const uid  = auth.currentUser?.uid;
  const platforms = buildPlatformCards(query, ai);

  container.innerHTML = `

    ${ai ? `
    <!-- AI Analysis Header -->
    <div class="ai-job-header">
      <div class="ai-job-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
      </div>
      <div>
        <div class="ai-job-title">"${ai.role || query}" in Calgary</div>
        <div class="ai-job-sub">${[
          ai.level ? ai.level.charAt(0).toUpperCase()+ai.level.slice(1)+' level' : '',
          ai.salaryRange
        ].filter(Boolean).join(' · ')}</div>
      </div>
      ${uid ? `
      <button class="set-alert-btn" onclick="window._setJobAlert('${(ai.role||query).replace(/'/g,"\\'")}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        Set alert
      </button>` : ''}
    </div>

    ${ai.tip ? `
    <div class="ai-job-tip">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      ${ai.tip}
    </div>` : ''}

    ${ai.topSkills?.length ? `
    <div class="ai-skills-row">
      <span class="ai-skills-label">Key skills:</span>
      ${ai.topSkills.map(s => `<span class="ai-skill-chip">${s}</span>`).join('')}
    </div>` : ''}` : ''}

    <!-- Platform quick links -->
    <div class="ai-section-label">Search directly on</div>
    <div class="ai-platform-cards">
      ${platforms.map(platformCardHTML).join('')}
    </div>

    <!-- Live listings from JSearch -->
    <div class="rjc-list-header">
      <span>${jobs.length > 0 ? `${jobs.length} live listings found` : 'No live listings right now'}</span>
      ${ai?.relatedRoles?.length ? `
      <div class="ai-related" style="margin:0;padding:0;border:none">
        ${ai.relatedRoles.map(r =>
          `<button class="ai-related-chip" onclick="window._jobAISearch('${r.replace(/'/g,"\\'")}')">${r}</button>`
        ).join('')}
      </div>` : ''}
    </div>

    <div id="jobs-results-list">
      ${jobs.length ? jobs.map(jobCardHTML).join('') : `
        <div style="padding:14px 0 4px">
          <p style="font-size:13px;color:var(--subtext);margin-bottom:12px">No live listings found via our aggregator right now. Search directly on:</p>
          ${platforms.map(platformCardHTML).join('').replace(/ai-platform-card/g,'ai-platform-card')}
        </div>`}
    </div>

    ${jobs.length >= 10 ? `
    <button class="load-more-btn" onclick="window._loadMoreJobs()">Load more jobs</button>` : ''}

    <button class="ai-clear-btn" onclick="window._clearJobAI()">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
      Clear search
    </button>`;

  wireSaveButtons(container);
}

// ── Load more ─────────────────────────────────────────────────────────────────
window._loadMoreJobs = async () => {
  currentPage++;
  const btn = document.querySelector('.load-more-btn');
  if (btn) { btn.textContent = 'Loading...'; btn.disabled = true; }
  try {
    const result = await fetchRealJobs(currentQuery, currentPage);
    const jobs   = result.jobs || [];
    const list   = document.getElementById('jobs-results-list');
    if (list && jobs.length) {
      list.insertAdjacentHTML('beforeend', jobs.map(jobCardHTML).join(''));
      wireSaveButtons(list);
    }
    if (btn) {
      if (jobs.length >= 10) { btn.textContent = 'Load more jobs'; btn.disabled = false; }
      else btn.remove();
    }
  } catch(e) {
    if (btn) { btn.textContent = 'Load more jobs'; btn.disabled = false; }
  }
};

// ── Job Alerts ────────────────────────────────────────────────────────────────
export async function setRoleAlert(role) {
  const uid = auth.currentUser?.uid;
  if (!uid) { window._toast('Sign in to set job alerts'); return; }
  const alertId = role.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g,'');
  await setDoc(doc(db, 'users', uid, 'jobAlerts', alertId), {
    role, createdAt: serverTimestamp(), active: true,
  });
  window._toast(`Job alert set for "${role}"`);
}

export function initJobAlerts() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  onSnapshot(
    query(collection(db, 'users', uid, 'jobAlerts'), where('active', '==', true)),
    (snap) => {
      const alerts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderJobAlerts(alerts);
      updateAlertBell(alerts.length);
    }
  );
}

function renderJobAlerts(alerts = []) {
  const el = document.getElementById('job-alerts-list');
  if (!el) return;
  if (!alerts.length) {
    el.innerHTML = `<p style="font-size:13px;color:var(--muted);padding:12px 0">No active alerts. Search a role and tap "Set alert".</p>`;
    return;
  }
  el.innerHTML = alerts.map(a => `
    <div class="job-alert-item">
      <div class="job-alert-info">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        <span>${a.role}</span>
      </div>
      <div style="display:flex;gap:6px">
        <button class="job-alert-search" onclick="window._jobAISearch('${a.role.replace(/'/g,"\\'")}')">Search now</button>
        <button class="job-alert-delete" onclick="window._deleteAlert('${a.id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>`).join('');
}

window._deleteAlert = async (alertId) => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await deleteDoc(doc(db, 'users', uid, 'jobAlerts', alertId));
  window._toast('Alert removed');
};

function updateAlertBell(count) {
  // Bell shows alert count only if no unread notifications
  const notifBell = document.getElementById('alert-bell-count');
  if (notifBell && !notifBell.dataset.hasNotifs) {
    notifBell.textContent = count;
    notifBell.style.display = count > 0 ? 'flex' : 'none';
  }
}

window._setJobAlert = setRoleAlert;

// ── In-app notifications ───────────────────────────────────────────────────────
export function initNotifications() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  // Listen for new notifications in real time
  onSnapshot(
    collection(db, 'users', uid, 'notifications'),
    (snap) => {
      const notifs  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const unread  = notifs.filter(n => !n.read);
      renderNotifDrawer(notifs, uid);
      updateNotifBell(unread.length);
    }
  );
}

function renderNotifDrawer(notifs, uid) {
  const el = document.getElementById('notif-list');
  if (!el) return;

  if (!notifs.length) {
    el.innerHTML = `<div class="notif-empty">No notifications yet.<br>Set a job alert to get started.</div>`;
    return;
  }

  // Sort newest first
  const sorted = [...notifs].sort((a,b) => {
    const ta = a.createdAt?.seconds || 0;
    const tb = b.createdAt?.seconds || 0;
    return tb - ta;
  });

  el.innerHTML = sorted.map(n => {
    let jobs = [];
    try { jobs = JSON.parse(n.jobs || '[]'); } catch {}
    const timeStr = n.createdAt?.toDate
      ? n.createdAt.toDate().toLocaleDateString('en-CA', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
      : '';
    return `
      <div class="notif-item ${n.read ? '' : 'unread'}" onclick="window._openNotif('${n.id}','${uid}')">
        <div class="notif-item-title">
          ${n.count} new ${n.role} job${n.count > 1 ? 's' : ''} in Calgary
        </div>
        <div class="notif-item-body">
          ${jobs.slice(0,2).map(j => `${j.title} at ${j.company}`).join(' · ')}
          ${jobs.length > 2 ? ` + ${jobs.length-2} more` : ''}
        </div>
        ${timeStr ? `<div class="notif-item-time">${timeStr}</div>` : ''}
      </div>`;
  }).join('');
}

window._openNotif = async (notifId, uid) => {
  // Mark as read
  await setDoc(doc(db, 'users', uid, 'notifications', notifId), { read: true }, { merge: true });
  // Close drawer and open jobs search
  window._closeNotifDrawer();
};

function updateNotifBell(count) {
  const bell = document.getElementById('alert-bell-count');
  if (!bell) return;
  if (count > 0) {
    bell.textContent = count > 9 ? '9+' : count;
    bell.style.display = 'flex';
    bell.dataset.hasNotifs = 'true';
  } else {
    bell.dataset.hasNotifs = '';
    // Fall back to alert count
    bell.style.display = 'none';
  }
}

window._toggleNotifDrawer = () => {
  const drawer = document.getElementById('notif-drawer');
  if (drawer) drawer.classList.toggle('open');
};
window._closeNotifDrawer = () => {
  const drawer = document.getElementById('notif-drawer');
  if (drawer) drawer.classList.remove('open');
};

// ── Push notifications ────────────────────────────────────────────────────────
export async function requestPushPermission() {
  if (!('Notification' in window)) {
    window._toast('Push notifications not supported on this browser');
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    window._toast('Notifications enabled');
    const uid = auth.currentUser?.uid;
    if (uid) await setDoc(doc(db, 'users', uid), { pushNotifications: true }, { merge: true });
  } else {
    window._toast('Notifications blocked — you\'ll see alerts in-app instead');
  }
}

// ── Popular jobs grid ─────────────────────────────────────────────────────────
const POPULAR_JOBS = [
  { role:'UI/UX Designer',        level:'Entry–Mid',  salary:'$55–75K' },
  { role:'Software Developer',    level:'Mid',        salary:'$70–95K' },
  { role:'Registered Nurse',      level:'Any',        salary:'$75–95K' },
  { role:'Project Manager',       level:'Mid–Senior', salary:'$75–100K' },
  { role:'Accountant',            level:'Entry–Mid',  salary:'$55–75K' },
  { role:'Customer Service Rep',  level:'Entry',      salary:'$35–50K' },
  { role:'Data Analyst',          level:'Mid',        salary:'$65–85K' },
  { role:'Marketing Coordinator', level:'Entry–Mid',  salary:'$45–65K' },
  { role:'Civil Engineer',        level:'Mid',        salary:'$75–100K' },
  { role:'Warehouse Associate',   level:'Entry',      salary:'$38–50K' },
  { role:'Graphic Designer',      level:'Entry–Mid',  salary:'$45–65K' },
  { role:'Financial Analyst',     level:'Mid',        salary:'$65–85K' },
  { role:'Electrician',           level:'Any',        salary:'$70–95K' },
  { role:'HR Coordinator',        level:'Entry–Mid',  salary:'$50–70K' },
  { role:'Sales Representative',  level:'Entry',      salary:'$45–65K' },
  { role:'Frontend Developer',    level:'Mid',        salary:'$70–90K' },
];

function shuffle(arr) {
  return arr.map(v=>({v,s:Math.random()})).sort((a,b)=>a.s-b.s).map(x=>x.v);
}

export function renderPopularJobs() {
  const grid = document.getElementById('popular-jobs-grid');
  if (!grid) return;
  const shown = shuffle(POPULAR_JOBS).slice(0, 8);
  grid.innerHTML = shown.map(j => `
    <div class="popular-job-card" onclick="window._jobAISearch('${j.role.replace(/'/g,"\\'")}')">
      <div class="pjc-role">${j.role}</div>
      <div class="pjc-meta">${j.level} · ${j.salary} CAD</div>
      <div class="pjc-platforms">
        <div class="pjc-dot" style="background:#2164F3" title="Indeed"></div>
        <div class="pjc-dot" style="background:#0CAA41" title="Glassdoor"></div>
        <div class="pjc-dot" style="background:#0A66C2" title="LinkedIn"></div>
      </div>
    </div>`).join('');
}
