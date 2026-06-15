// ── settlement.js ─────────────────────────────────────────────────────────────
import { db } from './firebase.js';
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { renderSettlement } from './profile.js';

// ── State ─────────────────────────────────────────────────────────────────────
let _currentTasks     = [];
let _currentCompleted = [];
let _currentUid       = null;

// ── Task config — colour, icon, description ───────────────────────────────────
const TASK_META = {
  sin: {
    colour: '#3B82F6', bg: '#EFF6FF',
    icon: `<path d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0"/>`,
    desc: 'Apply at any Service Canada office with your passport and study/work permit. Free — takes ~2 weeks by mail or same-day in person.',
  },
  health: {
    colour: '#10B981', bg: '#ECFDF5',
    icon: `<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>`,
    desc: 'Apply for the Alberta Health Care Insurance Plan (AHCIP) after 3 months of residency. Until then, get private insurance.',
  },
  banking: {
    colour: '#F59E0B', bg: '#FFFBEB',
    icon: `<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>`,
    desc: 'Open a no-fee student chequing account at RBC, TD, Scotiabank, CIBC, or BMO. Bring your passport, study permit, and SIN.',
  },
  housing: {
    colour: '#8B5CF6', bg: '#F5F3FF',
    icon: `<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
    desc: 'Find a rental near your campus or workplace. Use Porchlight in the Housing tab for verified Calgary listings.',
  },
  sim: {
    colour: '#EF4444', bg: '#FEF2F2',
    icon: `<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>`,
    desc: 'Get a Canadian SIM from Koodo, Fido, Freedom, or Lucky Mobile. Bring your phone (unlocked) and ID. Costs ~$15–$40/mo.',
  },
  library: {
    colour: '#06B6D4', bg: '#ECFEFF',
    studentOnly: true,
    icon: `<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>`,
    desc: 'Get a free Calgary Public Library card with your student ID or proof of address. Free internet, books, study rooms, and more.',
  },
};

function getMeta(taskId) {
  return TASK_META[taskId] || {
    colour: '#64748B', bg: '#F1F5F9',
    icon: `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,
    desc: 'Complete this step to progress your settlement journey.',
  };
}

// ── Default tasks seeded into Firestore ───────────────────────────────────────
export function defaultTasks() {
  return [
    { id: 'sin',     label: 'SIN card',        studentOnly: false },
    { id: 'health',  label: 'Health card',     studentOnly: false },
    { id: 'banking', label: 'Bank account',    studentOnly: false },
    { id: 'housing', label: 'Housing',         studentOnly: false },
    { id: 'sim',     label: 'SIM card',        studentOnly: false },
    { id: 'library', label: 'Library card',    studentOnly: true  },
  ];
}

// ── Filter tasks by user immigration type ─────────────────────────────────────
export function filterTasksForUser(tasks, immigrationType) {
  return tasks.filter(t => {
    if (t.studentOnly && immigrationType !== 'student') return false;
    return true;
  });
}

// ── Toggle a single task ──────────────────────────────────────────────────────
export async function toggleTask(taskId, uid, isDone) {
  if (!taskId || !uid) return;

  const ref  = doc(db, 'users', uid, 'progress', 'settlement');
  const snap = await getDoc(ref);
  let completed = snap.exists() ? (snap.data().completed || []) : [];

  if (isDone) {
    completed = completed.filter(id => id !== taskId);
  } else {
    if (!completed.includes(taskId)) completed.push(taskId);
  }

  await setDoc(ref, { completed, updatedAt: serverTimestamp() }, { merge: true });

  _currentCompleted = completed;

  renderSettlement(_currentTasks, completed, uid);
  renderModalList(_currentTasks, completed, uid);
  renderModalProgress(_currentTasks, completed);
}

// ── Render modal task list ────────────────────────────────────────────────────
export function renderModalList(tasks, completed, uid) {
  const el = document.getElementById('settle-task-list');
  if (!el) return;

  if (!tasks.length) {
    el.innerHTML = `<div style="padding:40px 20px;text-align:center;color:var(--muted);font-size:13px">No tasks set up yet.<br>An admin can add tasks in the admin panel.</div>`;
    return;
  }

  el.innerHTML = tasks.map(t => {
    const isDone = completed.includes(t.id);
    const meta   = getMeta(t.id);
    return `
      <div class="settle-task-item ${isDone ? 'done' : ''}"
           data-task-id="${t.id}" data-uid="${uid}" data-done="${isDone}"
           role="checkbox" aria-checked="${isDone}" tabindex="0"
           style="${isDone ? `background:${meta.bg};` : ''}">
        <div class="settle-task-icon" style="background:${isDone ? meta.colour : '#F1F5F9'}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="${isDone ? '#fff' : meta.colour}" stroke-width="2">
            ${isDone
              ? `<polyline points="20 6 9 17 4 12"/>`
              : meta.icon}
          </svg>
        </div>
        <div class="settle-task-label">
          <div class="settle-task-label-text" style="${isDone ? `color:${meta.colour};text-decoration:line-through;text-decoration-color:${meta.colour}40` : ''}">${t.label}</div>
          <div class="settle-task-label-desc">${meta.desc}</div>
        </div>
        <div class="settle-task-status" style="color:${isDone ? meta.colour : 'var(--border2)'}">
          ${isDone
            ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="${meta.colour}" stroke="none"><path d="M12 2a10 10 0 110 20A10 10 0 0112 2zm-1 14l-4-4 1.41-1.41L11 13.17l6.59-6.58L19 8l-8 8z"/></svg>`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`
          }
        </div>
      </div>`;
  }).join('');
}

// ── Render modal progress ─────────────────────────────────────────────────────
export function renderModalProgress(tasks, completed) {
  const total     = tasks.length;
  const doneCount = completed.length;
  const pct       = total ? Math.round((doneCount / total) * 100) : 0;
  const remaining = total - doneCount;

  const arc = document.getElementById('modal-settle-arc');
  if (arc) {
    const r = 22, circ = 2 * Math.PI * r;
    arc.setAttribute('stroke-dasharray',  circ.toFixed(1));
    arc.setAttribute('stroke-dashoffset', (circ * (1 - pct / 100)).toFixed(1));
  }
  const pctEl = document.getElementById('modal-settle-pct');
  if (pctEl) pctEl.textContent = `${pct}%`;

  const titleEl = document.getElementById('modal-settle-title');
  if (titleEl) {
    if (pct === 0)       titleEl.textContent = 'Getting started';
    else if (pct < 50)  titleEl.textContent = 'Making progress';
    else if (pct < 100) titleEl.textContent = 'Almost there!';
    else                titleEl.textContent  = 'Fully settled!';
  }

  const subEl = document.getElementById('modal-settle-sub');
  if (subEl) {
    subEl.textContent = remaining > 0
      ? `${doneCount} of ${total} tasks complete · ${remaining} remaining`
      : 'All tasks complete — welcome to Calgary!';
  }
}

// ── Open / close modal ────────────────────────────────────────────────────────
export function openSettleModal(tasks, completed, uid) {
  _currentTasks     = tasks;
  _currentCompleted = completed;
  _currentUid       = uid;

  renderModalList(tasks, completed, uid);
  renderModalProgress(tasks, completed);

  const modal = document.getElementById('settle-modal');
  if (modal) modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeSettleModal() {
  const modal = document.getElementById('settle-modal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Delegated listeners ───────────────────────────────────────────────────────
export function initSettlementChips() {
  // Hero chips
  const chipsContainer = document.getElementById('task-chips');
  if (chipsContainer) {
    chipsContainer.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-task-id]');
      if (!btn) return;
      btn.disabled = true;
      await toggleTask(btn.dataset.taskId, btn.dataset.uid, btn.dataset.done === 'true');
    });
  }

  // Modal task list
  const modalList = document.getElementById('settle-task-list');
  if (modalList) {
    modalList.addEventListener('click', async (e) => {
      const item = e.target.closest('[data-task-id]');
      if (!item) return;
      await toggleTask(item.dataset.taskId, item.dataset.uid, item.dataset.done === 'true');
    });
    modalList.addEventListener('keydown', async (e) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      const item = e.target.closest('[data-task-id]');
      if (!item) return;
      e.preventDefault();
      await toggleTask(item.dataset.taskId, item.dataset.uid, item.dataset.done === 'true');
    });
  }

  // Close on backdrop
  const modal = document.getElementById('settle-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeSettleModal();
    });
  }
}
