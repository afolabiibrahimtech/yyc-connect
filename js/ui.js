// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ── Section navigation ────────────────────────────────────────────────────────
const SECTIONS = ['home', 'housing', 'jobs', 'events', 'resources', 'profile'];

export function showSec(id) {
  SECTIONS.forEach(s => {
    document.getElementById('sec-' + s)?.classList.toggle('active', s === id);
  });

  // Top tab nav
  document.querySelectorAll('.snav-tab').forEach((tab, i) => {
    tab.classList.toggle('active', SECTIONS[i] === id);
  });

  // Bottom nav (no profile tab in bottom nav)
  const bnMap = { home: 'bn-home', housing: 'bn-housing', jobs: 'bn-jobs', events: 'bn-events', resources: 'bn-resources' };
  if (bnMap[id]) setBottomNav(bnMap[id]);
}

export function setBottomNav(id) {
  document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

// ── Auth tab toggle ───────────────────────────────────────────────────────────
export function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && tab === 'signin') || (i === 1 && tab === 'signup'));
  });
  document.getElementById('signin-form').style.display = tab === 'signin' ? 'block' : 'none';
  document.getElementById('signup-form').style.display = tab === 'signup' ? 'block' : 'none';

  // Always reset the sign-up wizard back to step 1 when switching to it,
  // so stale step-2 state from a previous visit doesn't linger.
  if (tab === 'signup') {
    const step1 = document.getElementById('su-step-1');
    const step2 = document.getElementById('su-step-2');
    const dot1  = document.getElementById('su-dot-1');
    const dot2  = document.getElementById('su-dot-2');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    if (dot1)  dot1.classList.add('active');
    if (dot2)  dot2.classList.remove('active');
  }
}

// ── Toggle buttons (settings) ─────────────────────────────────────────────────
export function initToggles() {
  document.querySelectorAll('.toggle').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('on'));
  });
}
