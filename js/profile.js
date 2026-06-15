// ── profile.js ────────────────────────────────────────────────────────────────
import { db } from './firebase.js';
import {
  doc, getDoc, setDoc, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { AVATARS } from './auth.js';
import { defaultTasks, filterTasksForUser } from './settlement.js';

const IMM_MAP = {
  student:  'International Student',
  worker:   'Temp. Foreign Worker',
  pr:       'Permanent Resident',
  visitor:  'Visitor',
  refugee:  'Refugee / Asylum Seeker',
};

// ── Cached settlement state ───────────────────────────────────────────────────
let _cachedTasks         = [];
let _cachedCompleted     = [];
let _cachedUid           = null;
let _cachedImmType       = '';

export function getCachedSettlement() {
  return { tasks: _cachedTasks, completed: _cachedCompleted, uid: _cachedUid };
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val || '—';
}

function applyAvatar(el, data) {
  if (!el) return;
  if (data.photoURL) {
    el.style.cssText += ';background-image:url(' + data.photoURL + ');background-size:cover;background-position:center';
    el.innerHTML = '';
  } else if (data.avatarId) {
    const av = AVATARS.find(a => a.id === data.avatarId);
    if (av) {
      el.style.backgroundImage = 'none';
      el.style.background = av.bg;
      el.innerHTML = `<svg viewBox="0 0 100 100" width="100%" height="100%">${av.svg}</svg>`;
    }
  } else {
    el.style.backgroundImage = 'none';
    el.style.background = 'var(--amber)';
    el.innerHTML = (data.name || '?')[0].toUpperCase();
  }
}

// ── Real-time profile listener ────────────────────────────────────────────────
export function loadUserProfile(uid) {
  _cachedUid = uid;
  return onSnapshot(doc(db, 'users', uid), async (snap) => {
    if (!snap.exists()) return;
    const d = snap.data();

    const name     = d.name || '';
    const immLabel = IMM_MAP[d.immigrationType] || d.immigrationType || '—';
    _cachedImmType = d.immigrationType || '';

    applyAvatar(document.getElementById('user-avatar'), d);
    setText('hero-name',  name.split(' ')[0] || 'there');
    applyAvatar(document.getElementById('profile-initials'), { ...d, name });
    setText('profile-name',  name);
    setText('profile-email', d.email);

    const badge = document.getElementById('profile-badge');
    if (badge) badge.textContent = immLabel !== '—' ? immLabel : 'Member';

    setText('pref-country',     d.countryFlag ? `${d.countryFlag} ${d.country}` : (d.country || null));
    setText('pref-immigration', immLabel);
    setText('pref-city',        d.dreamCity);
    setText('pref-budget',      d.budget ? `$${d.budget}/mo` : null);
    setText('pref-dietary',     d.dietary);

    if (d.arrivalDate) {
      const dt = new Date(d.arrivalDate + 'T00:00:00');
      setText('pref-arrival', dt.toLocaleDateString('en-CA', { year:'numeric', month:'short', day:'numeric' }));
    } else {
      setText('pref-arrival', null);
    }

    await loadSettlement(uid, d.immigrationType || '');
  });
}

// ── Load settlement ───────────────────────────────────────────────────────────
export async function loadSettlement(uid, immigrationType) {
  if (!uid) return;

  const settleSnap = await getDoc(doc(db, 'settings', 'settlement'));
  let tasks = settleSnap.exists() && settleSnap.data().tasks?.length
    ? settleSnap.data().tasks
    : defaultTasks();

  // Seed or migrate Firestore settlement tasks
  const hasNewTasks = tasks.some(t => t.id === 'sin' || t.id === 'health' || t.id === 'sim');
  if (!settleSnap.exists() || !hasNewTasks) {
    const fresh = defaultTasks();
    await setDoc(doc(db, 'settings', 'settlement'), {
      tasks: fresh, updatedAt: serverTimestamp()
    });
    tasks = fresh;
  }

  // Filter student-only tasks
  tasks = filterTasksForUser(tasks, immigrationType);

  const progressSnap = await getDoc(doc(db, 'users', uid, 'progress', 'settlement'));
  const completed    = progressSnap.exists() ? (progressSnap.data().completed || []) : [];

  _cachedTasks     = tasks;
  _cachedCompleted = completed;
  _cachedUid       = uid;

  renderSettlement(tasks, completed, uid);
}

// ── Render hero ring + coloured chips ─────────────────────────────────────────
export function renderSettlement(tasks, completed, uid) {
  if (!tasks.length) return;

  _cachedTasks     = tasks;
  _cachedCompleted = completed;
  _cachedUid       = uid;

  const total     = tasks.length;
  const doneCount = completed.length;
  const pct       = Math.round((doneCount / total) * 100);
  const remaining = total - doneCount;

  // Hero ring
  const arc = document.getElementById('settle-arc');
  if (arc) {
    const r = 26, circ = 2 * Math.PI * r;
    arc.setAttribute('stroke-dasharray',  circ.toFixed(1));
    arc.setAttribute('stroke-dashoffset', (circ * (1 - pct / 100)).toFixed(1));
  }

  const pctEl = document.getElementById('settle-pct-n');
  if (pctEl) pctEl.textContent = `${pct}%`;

  const subEl = document.getElementById('settle-sub');
  if (subEl) {
    subEl.textContent = remaining > 0
      ? `${remaining} of ${total} tasks remaining — tap to update`
      : 'All tasks complete — you\'re fully settled!';
  }

  // Coloured chips — task colours defined in settlement.js TASK_META
  // We import meta inline via data attribute and CSS custom property
  const CHIP_COLOURS = {
    sin:     { done: '#3B82F6', bg: '#EFF6FF' },
    health:  { done: '#10B981', bg: '#ECFDF5' },
    banking: { done: '#F59E0B', bg: '#FFFBEB' },
    housing: { done: '#8B5CF6', bg: '#F5F3FF' },
    sim:     { done: '#EF4444', bg: '#FEF2F2' },
    library: { done: '#06B6D4', bg: '#ECFEFF' },
  };

  const chipsEl = document.getElementById('task-chips');
  if (chipsEl) {
    const preview = tasks.slice(0, 5);
    chipsEl.innerHTML = preview.map(t => {
      const isDone  = completed.includes(t.id);
      const colours = CHIP_COLOURS[t.id] || { done: '#64748B', bg: '#F1F5F9' };
      const style = isDone
        ? `background:${colours.bg};color:${colours.done};border:1.5px solid ${colours.done}40`
        : `background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.55);border:1.5px solid rgba(255,255,255,0.12)`;
      return `<button
        class="chip"
        data-task-id="${t.id}"
        data-uid="${uid}"
        data-done="${isDone}"
        type="button"
        style="${style}"
        title="${isDone ? 'Mark incomplete' : 'Mark complete'}"
      >${isDone ? '✓ ' : ''}${t.label}</button>`;
    }).join('');

    if (tasks.length > 5) {
      const extra = tasks.length - 5;
      chipsEl.innerHTML += `<button class="chip" onclick="window._openSettleModal()"
        style="background:rgba(245,166,35,0.15);color:var(--amber);border:1.5px dashed rgba(245,166,35,0.4)"
        type="button">+${extra} more</button>`;
    }
  }
}
