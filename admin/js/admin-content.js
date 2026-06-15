// ── admin-content.js — CRUD for listings, jobs, events, settlement, dashboard ─
import { db } from '../../js/firebase.js';
import {
  collection, onSnapshot, doc, addDoc, updateDoc,
  deleteDoc, setDoc, getDoc, serverTimestamp, query, orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { adminToast } from './admin-ui.js';

const PORCHLIGHT = 'https://porchlights.pages.dev';

// ── Dashboard settings ────────────────────────────────────────────────────────
export function startDashboardListener() {
  onSnapshot(doc(db, 'settings', 'dashboard'), snap => {
    const d = snap.data() || {};
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.value = val ?? ''; };
    set('dash-movein', d.daysToMovein ?? 12);
    set('dash-rent',   d.avgRent      || '$850');
    set('dash-alert',  d.alertText    || 'First snowfall expected this week.');
    set('dash-weather',d.weather      || '−3°C Calgary');
  });
}

export async function saveDashboard() {
  await setDoc(doc(db, 'settings', 'dashboard'), {
    daysToMovein: parseInt(document.getElementById('dash-movein').value) || 12,
    avgRent:      document.getElementById('dash-rent').value.trim(),
    alertText:    document.getElementById('dash-alert').value.trim(),
    weather:      document.getElementById('dash-weather').value.trim(),
    updatedAt:    serverTimestamp(),
  }, { merge: true });
  adminToast('Dashboard settings saved');
}

// ── Settlement tasks ──────────────────────────────────────────────────────────
// Single source of truth — always read from / write to Firestore directly
// Never rely on a module-level array that could be out of sync

export function startSettlementListener() {
  onSnapshot(doc(db, 'settings', 'settlement'), snap => {
    const tasks = snap.exists() ? (snap.data().tasks || []) : [];
    renderSettleTasks(tasks);
  });
}

function renderSettleTasks(tasks) {
  const el = document.getElementById('settle-tasks-list');
  if (!el) return;

  if (!tasks.length) {
    el.innerHTML = `<p style="font-size:13px;color:var(--muted);padding:8px 0">No tasks yet. Add your first task below.</p>`;
    return;
  }

  el.innerHTML = tasks.map((t, i) => `
    <div class="settle-task-row" data-id="${t.id}">
      <span style="font-size:11px;color:var(--muted);min-width:20px;flex-shrink:0">${i + 1}.</span>
      <div style="flex:1;display:flex;flex-direction:column;gap:4px">
        <input
          class="task-label-input"
          data-id="${t.id}"
          value="${t.label}"
          style="width:100%;border:1px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px;font-family:'Inter',sans-serif;outline:none;transition:border-color 0.2s"
          onfocus="this.style.borderColor='var(--amber)'"
          onblur="this.style.borderColor='var(--border)'"
        >
        ${t.studentOnly ? '<span style="font-size:10px;color:#1E40AF;background:#EFF6FF;padding:2px 8px;border-radius:20px;font-weight:600;width:fit-content">Students only</span>' : ''}
      </div>
      <button
        onclick="window._deleteTask('${t.id}')"
        style="background:none;border:none;cursor:pointer;color:var(--danger);padding:6px;border-radius:6px;flex-shrink:0"
        title="Remove task"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
      </button>
    </div>`).join('');
}

// ── Read current tasks from DOM inputs ────────────────────────────────────────
function readTasksFromDOM() {
  const rows = document.querySelectorAll('#settle-tasks-list .settle-task-row');
  return Array.from(rows).map(row => ({
    id:    row.dataset.id,
    label: row.querySelector('.task-label-input')?.value.trim() || '',
  })).filter(t => t.label);
}

// ── Add task ──────────────────────────────────────────────────────────────────
export async function addTask() {
  const input       = document.getElementById('new-task-input');
  const studentOnly = document.getElementById('new-task-student')?.checked || false;
  const label       = input?.value.trim();
  if (!label) { adminToast('Enter a task name first', 'error'); input?.focus(); return; }

  const btn = document.getElementById('add-task-btn');
  if (btn) { btn.textContent = 'Adding...'; btn.disabled = true; }

  try {
    const snap  = await getDoc(doc(db, 'settings', 'settlement'));
    const tasks = snap.exists() ? (snap.data().tasks || []) : [];
    const id    = label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
    tasks.push({ id, label, studentOnly });

    await setDoc(doc(db, 'settings', 'settlement'), { tasks, updatedAt: serverTimestamp() }, { merge: true });
    if (input) input.value = '';
    if (document.getElementById('new-task-student')) document.getElementById('new-task-student').checked = false;
    adminToast(`Task "${label}" added${studentOnly ? ' (students only)' : ''}`);
  } catch(e) {
    console.error(e);
    adminToast('Failed to add task', 'error');
  } finally {
    if (btn) { btn.textContent = 'Add task'; btn.disabled = false; }
  }
}

// ── Save all tasks (inline label edits) ──────────────────────────────────────
export async function saveSettleTasks() {
  const tasks = readTasksFromDOM();
  if (!tasks.length) { adminToast('No tasks to save', 'error'); return; }
  await setDoc(doc(db, 'settings', 'settlement'), { tasks, updatedAt: serverTimestamp() }, { merge: true });
  adminToast('Settlement checklist saved');
}

// ── Delete task ───────────────────────────────────────────────────────────────
window._deleteTask = async (id) => {
  const snap  = await getDoc(doc(db, 'settings', 'settlement'));
  const tasks = snap.exists() ? (snap.data().tasks || []) : [];
  const updated = tasks.filter(t => t.id !== id);
  await setDoc(doc(db, 'settings', 'settlement'), { tasks: updated, updatedAt: serverTimestamp() }, { merge: true });
  adminToast('Task removed');
};

// ── Listings ──────────────────────────────────────────────────────────────────
let allListings = [];

export function startListingsListener() {
  onSnapshot(query(collection(db,'listings'), orderBy('createdAt','desc')), snap => {
    allListings = snap.docs.map(d => ({id:d.id,...d.data()}));
    renderListingsTable();
  });
}

function renderListingsTable() {
  const tbody = document.getElementById('listings-tbody');
  if (!tbody) return;
  if (!allListings.length) { tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No listings yet</td></tr>`; return; }
  tbody.innerHTML = allListings.map(l => `
    <tr>
      <td style="font-weight:500;font-size:13px">${l.title}</td>
      <td style="font-size:12px;color:var(--subtext)">${l.neighbourhood||'—'}</td>
      <td style="font-family:'Sora',sans-serif;font-weight:600">$${(l.price||0).toLocaleString()}</td>
      <td>${l.featured
        ? '<span class="status-badge status-active">Featured</span>'
        : '<span class="status-badge" style="background:var(--surface);color:var(--muted)">Standard</span>'}</td>
      <td style="font-size:12px;color:var(--subtext)">${(l.tags||[]).slice(0,2).join(', ')}</td>
      <td>
        <div class="action-menu">
          <button class="action-btn" onclick="openListingModal('${l.id}')" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn" onclick="deleteListing('${l.id}')" title="Delete" style="color:var(--danger)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
      </td>
    </tr>`).join('');
}

window.openListingModal = (id) => {
  const l = id ? allListings.find(x => x.id === id) : null;
  document.getElementById('lm-id').value             = id || '';
  document.getElementById('lm-title').value          = l?.title          || '';
  document.getElementById('lm-neighbourhood').value  = l?.neighbourhood  || '';
  document.getElementById('lm-address').value        = l?.address        || '';
  document.getElementById('lm-price').value          = l?.price          || '';
  document.getElementById('lm-beds').value           = l?.beds           ?? '';
  document.getElementById('lm-baths').value          = l?.baths          ?? '';
  document.getElementById('lm-lat').value            = l?.lat            || '';
  document.getElementById('lm-lng').value            = l?.lng            || '';
  document.getElementById('lm-tags').value           = (l?.tags||[]).join(', ');
  document.getElementById('lm-url').value            = l?.porchlightUrl  || PORCHLIGHT;
  document.getElementById('lm-furnished').checked   = l?.furnished       || false;
  document.getElementById('lm-utilities').checked   = l?.utilities       || false;
  document.getElementById('lm-intl').checked        = l?.intlFriendly    || false;
  document.getElementById('lm-shortterm').checked   = l?.shortterm       || false;
  document.getElementById('lm-featured').checked    = l?.featured        || false;
  document.getElementById('lm-bvc').checked         = l?.nearBVC         || false;
  document.getElementById('lm-modal').classList.add('open');
};
window.closeLM = () => document.getElementById('lm-modal').classList.remove('open');
window.saveListing = async () => {
  const id = document.getElementById('lm-id').value;
  const data = {
    title:         document.getElementById('lm-title').value.trim(),
    neighbourhood: document.getElementById('lm-neighbourhood').value.trim(),
    address:       document.getElementById('lm-address').value.trim(),
    price:         parseFloat(document.getElementById('lm-price').value)  || 0,
    beds:          parseInt(document.getElementById('lm-beds').value)     || 0,
    baths:         parseInt(document.getElementById('lm-baths').value)    || 1,
    lat:           parseFloat(document.getElementById('lm-lat').value)    || 0,
    lng:           parseFloat(document.getElementById('lm-lng').value)    || 0,
    tags:          document.getElementById('lm-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
    porchlightUrl: document.getElementById('lm-url').value.trim() || PORCHLIGHT,
    furnished:     document.getElementById('lm-furnished').checked,
    utilities:     document.getElementById('lm-utilities').checked,
    intlFriendly:  document.getElementById('lm-intl').checked,
    shortterm:     document.getElementById('lm-shortterm').checked,
    featured:      document.getElementById('lm-featured').checked,
    nearBVC:       document.getElementById('lm-bvc').checked,
    updatedAt:     serverTimestamp(),
  };
  if (id) { await updateDoc(doc(db,'listings',id), data); adminToast('Listing updated'); }
  else    { await addDoc(collection(db,'listings'), {...data, createdAt:serverTimestamp()}); adminToast('Listing added'); }
  window.closeLM();
};
window.deleteListing = async (id) => {
  if (!confirm('Delete this listing?')) return;
  await deleteDoc(doc(db,'listings',id));
  adminToast('Listing deleted');
};

// ── Jobs ──────────────────────────────────────────────────────────────────────
let allJobs = [];

export function startJobsListener() {
  onSnapshot(query(collection(db,'jobs'), orderBy('createdAt','desc')), snap => {
    allJobs = snap.docs.map(d => ({id:d.id,...d.data()}));
    renderJobsTable();
  });
}

function renderJobsTable() {
  const tbody = document.getElementById('jobs-tbody');
  if (!tbody) return;
  if (!allJobs.length) { tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No jobs yet</td></tr>`; return; }
  tbody.innerHTML = allJobs.map(j => `
    <tr>
      <td style="font-weight:500;font-size:13px">${j.title}</td>
      <td style="font-size:12px;color:var(--subtext)">${j.company||'—'}</td>
      <td style="font-weight:600;color:var(--success)">${j.salary||'—'}</td>
      <td>${j.remote ? '<span class="jtag remote" style="font-size:10px">Remote</span>' : '<span class="jtag" style="font-size:10px">On-site</span>'}</td>
      <td>
        <div class="action-menu">
          <button class="action-btn" onclick="openJobModal('${j.id}')" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn" onclick="deleteJob('${j.id}')" title="Delete" style="color:var(--danger)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
      </td>
    </tr>`).join('');
}

window.openJobModal = (id) => {
  const j = id ? allJobs.find(x => x.id === id) : null;
  document.getElementById('jm-id').value       = id || '';
  document.getElementById('jm-title').value    = j?.title   || '';
  document.getElementById('jm-company').value  = j?.company || '';
  document.getElementById('jm-salary').value   = j?.salary  || '';
  document.getElementById('jm-type').value     = j?.type    || 'frontend';
  document.getElementById('jm-level').value    = j?.level   || 'entry';
  document.getElementById('jm-tags').value     = (j?.tags||[]).join(', ');
  document.getElementById('jm-remote').checked = j?.remote  || false;
  document.getElementById('jm-modal').classList.add('open');
};
window.closeJM = () => document.getElementById('jm-modal').classList.remove('open');
window.saveJob = async () => {
  const id = document.getElementById('jm-id').value;
  const data = {
    title:   document.getElementById('jm-title').value.trim(),
    company: document.getElementById('jm-company').value.trim(),
    salary:  document.getElementById('jm-salary').value.trim(),
    type:    document.getElementById('jm-type').value,
    level:   document.getElementById('jm-level').value,
    tags:    document.getElementById('jm-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
    remote:  document.getElementById('jm-remote').checked,
    updatedAt: serverTimestamp(),
  };
  if (id) { await updateDoc(doc(db,'jobs',id), data); adminToast('Job updated'); }
  else    { await addDoc(collection(db,'jobs'), {...data, createdAt:serverTimestamp()}); adminToast('Job added'); }
  window.closeJM();
};
window.deleteJob = async (id) => {
  if (!confirm('Delete this job?')) return;
  await deleteDoc(doc(db,'jobs',id));
  adminToast('Job deleted');
};

// ── Events ────────────────────────────────────────────────────────────────────
let allEvents = [];

export function startEventsListener() {
  onSnapshot(collection(db,'events'), snap => {
    allEvents = snap.docs.map(d => ({id:d.id,...d.data()}));
    renderEventsTable();
  });
}

function renderEventsTable() {
  const tbody = document.getElementById('events-tbody');
  if (!tbody) return;
  if (!allEvents.length) { tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No events yet</td></tr>`; return; }
  tbody.innerHTML = allEvents.map(e => `
    <tr>
      <td style="font-weight:500;font-size:13px">${e.title}</td>
      <td style="font-size:12px">${e.date?.day} ${e.date?.mon}</td>
      <td style="font-size:12px;color:var(--subtext)">${e.venue||'—'}</td>
      <td><span class="echip ${e.category}" style="font-size:10px">${e.category||'—'}</span></td>
      <td>
        <div class="action-menu">
          <button class="action-btn" onclick="openEventModal('${e.id}')" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn" onclick="deleteEvent('${e.id}')" title="Delete" style="color:var(--danger)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
      </td>
    </tr>`).join('');
}

window.openEventModal = (id) => {
  const e = id ? allEvents.find(x => x.id === id) : null;
  document.getElementById('em-id').value        = id || '';
  document.getElementById('em-title').value     = e?.title         || '';
  document.getElementById('em-day').value       = e?.date?.day     || '';
  document.getElementById('em-mon').value       = e?.date?.mon     || 'Jun';
  document.getElementById('em-time').value      = e?.time          || '';
  document.getElementById('em-venue').value     = e?.venue         || '';
  document.getElementById('em-category').value  = e?.category      || 'campus';
  document.getElementById('em-free').checked    = e?.free          || false;
  document.getElementById('em-modal').classList.add('open');
};
window.closeEM = () => document.getElementById('em-modal').classList.remove('open');
window.saveEvent = async () => {
  const id = document.getElementById('em-id').value;
  const data = {
    title:    document.getElementById('em-title').value.trim(),
    date:     { day: parseInt(document.getElementById('em-day').value)||1, mon: document.getElementById('em-mon').value },
    time:     document.getElementById('em-time').value.trim(),
    venue:    document.getElementById('em-venue').value.trim(),
    category: document.getElementById('em-category').value,
    free:     document.getElementById('em-free').checked,
    updatedAt: serverTimestamp(),
  };
  if (id) { await updateDoc(doc(db,'events',id), data); adminToast('Event updated'); }
  else    { await addDoc(collection(db,'events'), {...data, createdAt:serverTimestamp()}); adminToast('Event added'); }
  window.closeEM();
};
window.deleteEvent = async (id) => {
  if (!confirm('Delete this event?')) return;
  await deleteDoc(doc(db,'events',id));
  adminToast('Event deleted');
};
