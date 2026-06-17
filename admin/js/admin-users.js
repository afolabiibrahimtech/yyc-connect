// ── admin-users.js ────────────────────────────────────────────────────────────
import { db, auth } from '../../js/firebase.js';
import {
  collection, onSnapshot, doc, updateDoc, setDoc,
  serverTimestamp, query, orderBy, getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { AVATARS, sanitizeEmailKey } from '../../js/auth.js';
import { adminToast } from './admin-ui.js';

let allUsers     = [];
let activeFilter = 'all';
let searchQuery  = '';

// ── Real-time user listener ───────────────────────────────────────────────────
// NOTE: orderBy('createdAt') requires a Firestore index.
// We use collection snapshot without orderBy to avoid index requirement,
// then sort client-side.
export function startUserListener() {
  onSnapshot(collection(db, 'users'), snap => {
    allUsers = snap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .sort((a, b) => {
        // Sort by createdAt descending, handle missing values
        const ta = a.createdAt?.seconds || a.createdAt?.toMillis?.() / 1000 || 0;
        const tb = b.createdAt?.seconds || b.createdAt?.toMillis?.() / 1000 || 0;
        return tb - ta;
      });
    updateStats();
    renderUsers();
  }, (error) => {
    console.error('User listener error:', error);
    adminToast('Error loading users — check Firestore rules', 'error');
  });
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function updateStats() {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  set('stat-total',    allUsers.length);
  set('stat-active',   allUsers.filter(u => u.status === 'active').length);
  set('stat-banned',   allUsers.filter(u => u.status === 'banned').length);
  set('stat-students', allUsers.filter(u => u.immigrationType === 'student').length);
  set('stat-workers',  allUsers.filter(u => u.immigrationType === 'worker').length);
  set('stat-pr',       allUsers.filter(u => u.immigrationType === 'pr').length);
  set('stat-admins',   allUsers.filter(u => u.role === 'admin').length);
}

// ── Filter + search ───────────────────────────────────────────────────────────
export function setFilter(f) {
  activeFilter = f;
  document.querySelectorAll('.admin-filter-pill').forEach(p =>
    p.classList.toggle('active', p.dataset.filter === f));
  renderUsers();
}

export function setSearch(q) {
  searchQuery = q.toLowerCase();
  renderUsers();
}

function getFiltered() {
  let res = allUsers;
  if (activeFilter !== 'all') {
    if (['student','worker','pr','visitor','refugee'].includes(activeFilter))
      res = res.filter(u => u.immigrationType === activeFilter);
    else if (['active','banned','restricted'].includes(activeFilter))
      res = res.filter(u => u.status === activeFilter);
    else if (activeFilter === 'admin')
      res = res.filter(u => u.role === 'admin');
  }
  if (searchQuery) {
    res = res.filter(u => {
      const text = [u.name, u.email, u.country, u.dreamCity, u.immigrationType].join(' ').toLowerCase();
      return text.includes(searchQuery);
    });
  }
  return res;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function avatarHTML(user, size = 40) {
  if (user.photoURL) {
    return `<img src="${user.photoURL}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'">`;
  }
  const av = AVATARS.find(a => a.id === user.avatarId) || AVATARS[0];
  if (av) return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" style="border-radius:50%;background:${av.bg}">${av.svg}</svg>`;
  const initials = (user.name||'?').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:var(--amber);display:flex;align-items:center;justify-content:center;font-family:'Sora',sans-serif;font-weight:700;font-size:${size*0.35}px;color:var(--navy)">${initials}</div>`;
}

const IMM_LABELS = {
  student:'International Student', worker:'Temp. Foreign Worker',
  pr:'Permanent Resident', visitor:'Visitor', refugee:'Refugee',
};

function immBadge(type) {
  const labels = { student:'Student', worker:'Worker', pr:'PR', visitor:'Visitor', refugee:'Refugee' };
  const classes = { student:'imm-student', worker:'imm-worker', pr:'imm-pr', visitor:'imm-visitor', refugee:'imm-refugee' };
  const label = labels[type] || type || 'Unknown';
  const cls   = classes[type] || 'imm-other';
  return `<span class="imm-badge ${cls}">${label}</span>`;
}

function statusBadge(s) {
  const map = {
    active:     '<span class="status-badge status-active">Active</span>',
    banned:     '<span class="status-badge status-banned">Banned</span>',
    restricted: '<span class="status-badge status-restricted">Restricted</span>',
  };
  return map[s] || `<span class="status-badge">${s||'Unknown'}</span>`;
}

function roleBadge(role) {
  return role === 'admin'
    ? '<span class="role-badge role-admin">Admin</span>'
    : '<span class="role-badge role-member">Member</span>';
}

function formatDate(ts) {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-CA', { year:'numeric', month:'short', day:'numeric' });
  } catch { return '—'; }
}

// ── Render table ──────────────────────────────────────────────────────────────
export function renderUsers() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  const list = getFiltered();

  const countEl = document.getElementById('results-count');
  if (countEl) countEl.textContent = `${list.length} user${list.length !== 1 ? 's' : ''}`;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">No users match your filters</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(u => `
    <tr data-uid="${u.uid}" class="user-row ${u.status==='banned'?'row-banned':''}">
      <td class="user-cell">
        <div class="user-cell-inner">
          ${avatarHTML(u, 36)}
          <div>
            <div class="user-name">${u.name || '—'}</div>
            <div class="user-email">${u.email || ''}</div>
          </div>
        </div>
      </td>
      <td><span class="country-cell">${u.countryFlag||'🌍'} ${u.country||'—'}</span></td>
      <td>${immBadge(u.immigrationType)}</td>
      <td class="city-cell">${u.dreamCity||'—'}</td>
      <td>${statusBadge(u.status)}</td>
      <td>${roleBadge(u.role)}</td>
      <td class="date-cell">${formatDate(u.createdAt)}</td>
      <td>
        <div class="action-menu">
          <button class="action-btn" onclick="openUserModal('${u.uid}')" title="View details">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M2 12s3.636-8 10-8 10 8 10 8-3.636 8-10 8S2 12 2 12z"/></svg>
          </button>
          <button class="action-btn" onclick="toggleBan('${u.uid}','${u.status}')" title="${u.status==='banned'?'Unban':'Ban'}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </button>
          <button class="action-btn" onclick="toggleRestrict('${u.uid}','${u.status}')" title="Restrict">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          </button>
          <button class="action-btn" onclick="toggleRole('${u.uid}','${u.role}')" title="${u.role==='admin'?'Demote':'Promote to admin'}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </button>
        </div>
      </td>
    </tr>`).join('');
}

// ── Actions ───────────────────────────────────────────────────────────────────
window.toggleBan = async (uid, currentStatus) => {
  const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
  await updateDoc(doc(db,'users',uid), { status: newStatus, updatedAt: serverTimestamp() });
  adminToast(newStatus === 'banned' ? 'User banned' : 'User unbanned');
};

window.toggleRestrict = async (uid, currentStatus) => {
  const newStatus = currentStatus === 'restricted' ? 'active' : 'restricted';
  await updateDoc(doc(db,'users',uid), { status: newStatus, updatedAt: serverTimestamp() });
  adminToast(newStatus === 'restricted' ? 'Account restricted' : 'Restriction lifted');
};

window.toggleRole = async (uid, currentRole) => {
  const newRole = currentRole === 'admin' ? 'member' : 'admin';
  if (newRole === 'admin' && !confirm('Promote this user to admin?')) return;
  await updateDoc(doc(db,'users',uid), { role: newRole, updatedAt: serverTimestamp() });
  adminToast(newRole === 'admin' ? 'Promoted to admin' : 'Demoted to member');
};

// ── User detail modal ─────────────────────────────────────────────────────────
window.openUserModal = (uid) => {
  const u = allUsers.find(u => u.uid === uid);
  if (!u) return;
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val||'—'; };
  const setHTML = (id, val) => { const el = document.getElementById(id); if(el) el.innerHTML = val||'—'; };
  setHTML('modal-avatar',  avatarHTML(u, 64));
  set('modal-name',        u.name);
  set('modal-email',       u.email);
  set('modal-country',     `${u.countryFlag||'🌍'} ${u.country||'—'}`);
  setHTML('modal-immtype', immBadge(u.immigrationType));
  set('modal-city',        u.dreamCity);
  setHTML('modal-status',  statusBadge(u.status));
  setHTML('modal-role',    roleBadge(u.role));
  set('modal-joined',      formatDate(u.createdAt));

  document.getElementById('modal-ban-btn').textContent  = u.status==='banned' ? 'Unban user' : 'Ban user';
  document.getElementById('modal-ban-btn').onclick      = () => { toggleBan(uid, u.status); closeModal(); };
  document.getElementById('modal-role-btn').textContent = u.role==='admin' ? 'Demote to member' : 'Promote to admin';
  document.getElementById('modal-role-btn').onclick     = () => { toggleRole(uid, u.role); closeModal(); };
  document.getElementById('modal-restrict-btn').onclick = () => { toggleRestrict(uid, u.status); closeModal(); };
  document.getElementById('modal-delete-btn').onclick   = () => { closeModal(); openDeleteConfirm(uid, u.name || u.email); };
  document.getElementById('modal-banemail-btn').onclick  = () => { closeModal(); openBanEmailConfirm(u.email); };

  document.getElementById('user-modal').classList.add('open');
};

window.closeModal = () => {
  document.getElementById('user-modal').classList.remove('open');
};

// ── Delete account — confirmation modal + Worker call ─────────────────────────
const WORKER_URL = 'https://yyc-jobs-ai.keyscapeltd.workers.dev';

function openDeleteConfirm(uid, name) {
  document.getElementById('del-confirm-name').textContent = name || 'this user';
  document.getElementById('del-confirm-input').value = '';
  document.getElementById('del-confirm-error').textContent = '';
  const btn = document.getElementById('del-confirm-btn');
  btn.textContent = 'Delete permanently';
  btn.disabled = false;
  btn.onclick = () => confirmDelete(uid);
  document.getElementById('delete-confirm-modal').classList.add('open');
}

window.closeDeleteConfirm = () => {
  document.getElementById('delete-confirm-modal').classList.remove('open');
};

async function confirmDelete(uid) {
  const input = document.getElementById('del-confirm-input').value.trim();
  const errEl = document.getElementById('del-confirm-error');
  const btn   = document.getElementById('del-confirm-btn');

  if (input !== 'DELETE') {
    errEl.textContent = 'Type DELETE exactly to confirm.';
    return;
  }

  btn.textContent = 'Deleting...';
  btn.disabled = true;
  errEl.textContent = '';

  try {
    // Use the signed-in admin's own Firebase ID token to prove identity.
    // The Worker verifies this token server-side and checks role=='admin'
    // in Firestore before performing the deletion.
    const idToken = await auth.currentUser.getIdToken();

    const res = await fetch(`${WORKER_URL}/admin/delete-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ uid }),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error || `Server returned ${res.status}`);
    }

    adminToast('Account deleted permanently');
    window.closeDeleteConfirm();
  } catch(e) {
    errEl.textContent = `Failed: ${e.message}`;
    btn.textContent = 'Delete permanently';
    btn.disabled = false;
  }
}

// ── Ban email — locks out an email from all future sign-in/sign-up ───────────
function openBanEmailConfirm(email) {
  document.getElementById('banemail-confirm-email').textContent = email;
  document.getElementById('banemail-reason').value = '';
  document.getElementById('banemail-confirm-error').textContent = '';
  const btn = document.getElementById('banemail-confirm-btn');
  btn.textContent = 'Lock out email';
  btn.disabled = false;
  btn.onclick = () => confirmBanEmail(email);
  document.getElementById('banemail-confirm-modal').classList.add('open');
}

window.closeBanEmailConfirm = () => {
  document.getElementById('banemail-confirm-modal').classList.remove('open');
};

async function confirmBanEmail(email) {
  const errEl  = document.getElementById('banemail-confirm-error');
  const btn    = document.getElementById('banemail-confirm-btn');
  const reason = document.getElementById('banemail-reason').value.trim();

  btn.textContent = 'Locking out...';
  btn.disabled = true;
  errEl.textContent = '';

  try {
    await setDoc(doc(db, 'bannedEmails', sanitizeEmailKey(email)), {
      email,
      reason: reason || null,
      bannedAt: serverTimestamp(),
      bannedBy: auth.currentUser?.uid || null,
    });
    adminToast(`${email} has been locked out`);
    window.closeBanEmailConfirm();
  } catch(e) {
    errEl.textContent = `Failed: ${e.message}`;
    btn.textContent = 'Lock out email';
    btn.disabled = false;
  }
}

// ── Unban an email — removes the lockout ──────────────────────────────────────
window.unbanEmail = async (email) => {
  if (!confirm(`Remove the lockout for ${email}? They will be able to sign in again.`)) return;
  try {
    const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await deleteDoc(doc(db, 'bannedEmails', sanitizeEmailKey(email)));
    adminToast(`${email} unlocked`);
  } catch(e) {
    adminToast(`Failed to unlock: ${e.message}`);
  }
};
