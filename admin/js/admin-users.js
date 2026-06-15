import { db } from '../../js/firebase.js';
import {
  collection, onSnapshot, doc, updateDoc,
  deleteDoc, serverTimestamp, query, orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { AVATARS } from '../../js/auth.js';
import { adminToast } from './admin-ui.js';

let allUsers = [];
let activeFilter = 'all';
let searchQuery  = '';

// ── Real-time user listener ───────────────────────────────────────────────────
export function startUserListener() {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  onSnapshot(q, snap => {
    allUsers = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    updateStats();
    renderUsers();
  });
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function updateStats() {
  const total    = allUsers.length;
  const active   = allUsers.filter(u => u.status === 'active').length;
  const banned   = allUsers.filter(u => u.status === 'banned').length;
  const students = allUsers.filter(u => u.immigrationType === 'student').length;
  const workers  = allUsers.filter(u => u.immigrationType === 'worker').length;
  const pr       = allUsers.filter(u => u.immigrationType === 'pr').length;
  const admins   = allUsers.filter(u => u.role === 'admin').length;

  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  set('stat-total',    total);
  set('stat-active',   active);
  set('stat-banned',   banned);
  set('stat-students', students);
  set('stat-workers',  workers);
  set('stat-pr',       pr);
  set('stat-admins',   admins);
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
    if (['student','worker','pr'].includes(activeFilter))
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

// ── Avatar helper ─────────────────────────────────────────────────────────────
function avatarHTML(user, size = 40) {
  if (user.photoURL) {
    return `<img src="${user.photoURL}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;" alt="${user.name}">`;
  }
  const av = AVATARS.find(a => a.id === (user.avatarId || 'av1')) || AVATARS[0];
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" style="border-radius:50%;background:${av.bg}">${av.svg}</svg>`;
}

function immBadge(type) {
  const map = {
    student:    { label:'Student',    cls:'imm-student' },
    worker:     { label:'Worker',     cls:'imm-worker'  },
    pr:         { label:'PR',         cls:'imm-pr'      },
    visitor:    { label:'Visitor',    cls:'imm-visitor' },
    refugee:    { label:'Refugee',    cls:'imm-refugee' },
  };
  const d = map[type] || { label: type || 'Unknown', cls: 'imm-other' };
  return `<span class="imm-badge ${d.cls}">${d.label}</span>`;
}

function statusBadge(status) {
  const map = {
    active:     '<span class="status-badge status-active">Active</span>',
    banned:     '<span class="status-badge status-banned">Banned</span>',
    restricted: '<span class="status-badge status-restricted">Restricted</span>',
  };
  return map[status] || `<span class="status-badge">${status}</span>`;
}

function roleBadge(role) {
  return role === 'admin'
    ? '<span class="role-badge role-admin">Admin</span>'
    : '<span class="role-badge role-member">Member</span>';
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-CA', { year:'numeric', month:'short', day:'numeric' });
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
    <tr data-uid="${u.uid}" class="user-row ${u.status === 'banned' ? 'row-banned' : ''}">
      <td class="user-cell">
        <div class="user-cell-inner">
          ${avatarHTML(u, 36)}
          <div>
            <div class="user-name">${u.name || '—'}</div>
            <div class="user-email">${u.email}</div>
          </div>
        </div>
      </td>
      <td>
        <span class="country-cell">${u.countryFlag || '🌍'} ${u.country || '—'}</span>
      </td>
      <td>${immBadge(u.immigrationType)}</td>
      <td class="city-cell">${u.dreamCity || '—'}</td>
      <td>${statusBadge(u.status)}</td>
      <td>${roleBadge(u.role)}</td>
      <td class="date-cell">${formatDate(u.createdAt)}</td>
      <td>
        <div class="action-menu">
          <button class="action-btn" onclick="openUserModal('${u.uid}')" title="View details">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M2 12s3.636-8 10-8 10 8 10 8-3.636 8-10 8S2 12 2 12z"/></svg>
          </button>
          <button class="action-btn ${u.status==='banned'?'active-action':''}" onclick="toggleBan('${u.uid}','${u.status}')" title="${u.status==='banned'?'Unban':'Ban'} user">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </button>
          <button class="action-btn" onclick="toggleRestrict('${u.uid}','${u.status}')" title="Restrict account">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </button>
          <button class="action-btn" onclick="toggleRole('${u.uid}','${u.role}')" title="${u.role==='admin'?'Demote to member':'Promote to admin'}">
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
  if (newRole === 'admin' && !confirm('Promote this user to admin? They will have full dashboard access.')) return;
  await updateDoc(doc(db,'users',uid), { role: newRole, updatedAt: serverTimestamp() });
  adminToast(newRole === 'admin' ? 'Promoted to admin' : 'Demoted to member');
};

// ── User detail modal ─────────────────────────────────────────────────────────
window.openUserModal = (uid) => {
  const user = allUsers.find(u => u.uid === uid);
  if (!user) return;

  document.getElementById('modal-avatar').innerHTML  = avatarHTML(user, 64);
  document.getElementById('modal-name').textContent  = user.name || '—';
  document.getElementById('modal-email').textContent = user.email;
  document.getElementById('modal-country').textContent    = `${user.countryFlag || '🌍'} ${user.country || '—'}`;
  document.getElementById('modal-immtype').innerHTML  = immBadge(user.immigrationType);
  document.getElementById('modal-city').textContent   = user.dreamCity || '—';
  document.getElementById('modal-status').innerHTML   = statusBadge(user.status);
  document.getElementById('modal-role').innerHTML     = roleBadge(user.role);
  document.getElementById('modal-joined').textContent = formatDate(user.createdAt);
  document.getElementById('modal-seen').textContent   = formatDate(user.lastSeen);

  // Action buttons in modal
  document.getElementById('modal-ban-btn').textContent   = user.status === 'banned' ? 'Unban user' : 'Ban user';
  document.getElementById('modal-ban-btn').onclick       = () => { toggleBan(uid, user.status); closeModal(); };
  document.getElementById('modal-role-btn').textContent  = user.role === 'admin' ? 'Demote to member' : 'Promote to admin';
  document.getElementById('modal-role-btn').onclick      = () => { toggleRole(uid, user.role); closeModal(); };
  document.getElementById('modal-restrict-btn').onclick  = () => { toggleRestrict(uid, user.status); closeModal(); };

  document.getElementById('user-modal').classList.add('open');
};

window.closeModal = () => {
  document.getElementById('user-modal').classList.remove('open');
};
