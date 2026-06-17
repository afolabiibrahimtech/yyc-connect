// ── tasks.js — My Tasks drawer, per-user Firestore persistence ────────────────
// Ported from a standalone localStorage to-do app into YYC Connect's drawer
// pattern (matches Local Services / Winter Survival / Meetups). Saves to
// users/{uid}/progress/tasks the same way budget.js and winter gear do.
import { db, auth } from './firebase.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

let tasks = [];
let _tasksLoaded = false;
let saveTimer = null;

const ICONS = {
  calendar: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  alert:    `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  tag:      `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  close:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDueDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function isOverdue(task) {
  if (!task.dueDate || task.completed) return false;
  return new Date(task.dueDate) < new Date();
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

function getActiveFilter(groupId, attr) {
  return document.querySelector(`#${groupId} .svc-cat-pill.active`)?.dataset[attr] || 'all';
}

function el(id) { return document.getElementById(id); }

// ── Load / save (per-user Firestore, mirrors budget.js pattern) ──────────────
export async function loadTasksForUser() {
  const uid = auth.currentUser?.uid;
  tasks = [];
  _tasksLoaded = false;
  if (!uid) { renderTasks(); return; }
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'progress', 'tasks'));
    tasks = snap.exists() && Array.isArray(snap.data().items) ? snap.data().items : [];
  } catch(e) {
    console.warn('Tasks load failed:', e.message);
    tasks = [];
  }
  _tasksLoaded = true;
  renderTasks();
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveTasksToFirestore, 600);
}

async function saveTasksToFirestore() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    await setDoc(doc(db, 'users', uid, 'progress', 'tasks'), {
      items: tasks,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch(e) {
    console.warn('Tasks save failed:', e.message);
  }
}

// ── Render ───────────────────────────────────────────────────────────────────
function getFilteredTasks() {
  const status   = getActiveFilter('tk-status-filters', 'filter');
  const priority = getActiveFilter('tk-priority-filters', 'priority');
  const search   = (el('tk-search')?.value || '').toLowerCase().trim();

  return tasks.filter(task => {
    const over = isOverdue(task);
    if (status === 'active'    && (task.completed || over)) return false;
    if (status === 'completed' && !task.completed)          return false;
    if (status === 'overdue'   && !over)                     return false;
    if (priority !== 'all' && task.priority !== priority)   return false;
    if (search && !task.text.toLowerCase().includes(search)) return false;
    return true;
  });
}

function taskCardHTML(task) {
  const overdue = isOverdue(task);
  const priorityDot = (task.priority && task.priority !== 'none')
    ? `<span class="task-p-dot ${task.priority}" title="${task.priority} priority"></span>` : '';
  const dueMeta = task.dueDate
    ? `<span class="task-due ${overdue ? 'overdue-label' : ''}">${overdue ? ICONS.alert : ICONS.calendar} ${formatDueDate(task.dueDate)}${overdue ? ' · Overdue' : ''}</span>`
    : '';
  const catMeta = (task.category && task.category !== 'none')
    ? `<span class="task-cat-badge">${ICONS.tag} ${task.category}</span>` : '';

  return `
    <li class="${[task.completed ? 'completed' : '', overdue ? 'overdue' : ''].filter(Boolean).join(' ')}" draggable="true" data-id="${task.id}">
      <input type="checkbox" ${task.completed ? 'checked' : ''} aria-label="Mark complete">
      <div class="task-body">
        <div class="task-top">${priorityDot}<span class="task-text">${escapeHTML(task.text)}</span></div>
        ${(dueMeta || catMeta) ? `<div class="task-meta">${dueMeta}${catMeta}</div>` : ''}
      </div>
      <button class="task-delete-btn" aria-label="Delete task">${ICONS.close}</button>
    </li>`;
}

function renderTasks() {
  const listEl = el('tk-list');
  if (!listEl) return;

  if (!_tasksLoaded) {
    listEl.innerHTML = '<li class="task-empty-state">Loading your tasks...</li>';
    return;
  }

  const filtered = getFilteredTasks();
  listEl.innerHTML = filtered.length
    ? filtered.map(taskCardHTML).join('')
    : '<li class="task-empty-state">No tasks here yet</li>';

  listEl.querySelectorAll('li[data-id]').forEach(li => {
    const id = li.dataset.id;
    li.querySelector('input[type=checkbox]').addEventListener('change', () => {
      const t = tasks.find(x => x.id === id);
      if (t) { t.completed = !t.completed; scheduleSave(); renderTasks(); updateDrawerSub(); }
    });
    li.querySelector('.task-delete-btn').addEventListener('click', () => {
      tasks = tasks.filter(x => x.id !== id);
      scheduleSave(); renderTasks(); updateDrawerSub();
    });
  });

  updateCount();
  updateDrawerSub();
}

function updateCount() {
  const active = tasks.filter(t => !t.completed).length;
  const countEl = el('tk-count-label');
  if (countEl) countEl.textContent = `${active} task${active !== 1 ? 's' : ''} remaining`;
}

// Updates the small home-screen stat box and the drawer header subtitle.
function updateDrawerSub() {
  const active = tasks.filter(t => !t.completed).length;
  const sub = el('tasks-count-sub');
  if (sub) sub.textContent = active ? `${active} task${active !== 1 ? 's' : ''} remaining` : 'All caught up!';
  const homeStat = el('s-tasks');
  if (homeStat) homeStat.textContent = active;
}

export function getActiveTaskCount() {
  return tasks.filter(t => !t.completed).length;
}

// ── Add task ─────────────────────────────────────────────────────────────────
function addTask() {
  const input = el('tk-input');
  const text = input.value.trim();
  if (!text) {
    const btn = el('tk-add-btn');
    btn.classList.add('shake');
    setTimeout(() => btn.classList.remove('shake'), 400);
    input.focus();
    return;
  }
  tasks.unshift({
    id: 'tk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    text,
    completed: false,
    dueDate:  el('tk-due').value   || null,
    priority: el('tk-priority').value || 'none',
    category: el('tk-category').value || 'none',
  });
  input.value = '';
  el('tk-due').value = '';
  el('tk-priority').value = 'none';
  el('tk-category').value = 'none';
  scheduleSave();
  renderTasks();
}

// ── Drag & drop reorder ────────────────────────────────────────────────────────
let dragSrcId = null;

function initDragDrop() {
  const listEl = el('tk-list');
  if (!listEl) return;
  listEl.addEventListener('dragstart', e => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    dragSrcId = li.dataset.id;
    setTimeout(() => li.classList.add('dragging'), 0);
  });
  listEl.addEventListener('dragend', () => {
    listEl.querySelectorAll('li').forEach(l => l.classList.remove('dragging', 'drag-over'));
  });
  listEl.addEventListener('dragover', e => {
    e.preventDefault();
    const li = e.target.closest('li[data-id]');
    listEl.querySelectorAll('li').forEach(l => l.classList.remove('drag-over'));
    if (li) li.classList.add('drag-over');
  });
  listEl.addEventListener('drop', e => {
    e.preventDefault();
    const li = e.target.closest('li[data-id]');
    if (!li || !dragSrcId) return;
    const toId = li.dataset.id;
    if (dragSrcId !== toId) {
      const sI = tasks.findIndex(t => t.id === dragSrcId);
      const tI = tasks.findIndex(t => t.id === toId);
      if (sI > -1 && tI > -1) {
        const [moved] = tasks.splice(sI, 1);
        tasks.splice(tI, 0, moved);
        scheduleSave(); renderTasks();
      }
    }
    dragSrcId = null;
  });
}

// ── Init — wire all buttons/filters once ───────────────────────────────────────
export function initTasks() {
  el('tk-add-btn')?.addEventListener('click', addTask);
  el('tk-input')?.addEventListener('keypress', e => { if (e.key === 'Enter') addTask(); });
  el('tk-search')?.addEventListener('input', renderTasks);

  el('tk-clear-completed')?.addEventListener('click', () => {
    tasks = tasks.filter(t => !t.completed);
    scheduleSave(); renderTasks();
  });

  function setupFilterGroup(containerId) {
    const buttons = document.querySelectorAll(`#${containerId} .svc-cat-pill`);
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderTasks();
      });
    });
  }
  setupFilterGroup('tk-status-filters');
  setupFilterGroup('tk-priority-filters');

  initDragDrop();

  // Re-check overdue status periodically while the drawer might be open
  setInterval(renderTasks, 30000);
}
