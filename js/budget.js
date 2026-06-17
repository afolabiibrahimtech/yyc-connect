// ── Budget calculator — per-user, saved to Firestore ──────────────────────────
import { db, auth } from './firebase.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const fields = ['rent', 'food', 'transit', 'winter', 'misc'];
const DEFAULTS = { rent: 1599, food: 250, transit: 110, winter: 150, misc: 80 };

let saveTimer = null;

// ── Update displayed values + total ───────────────────────────────────────────
export function updateBudget() {
  let total = 0;
  for (const id of fields) {
    const input = document.getElementById('br-' + id);
    const label = document.getElementById('bv-' + id);
    if (!input || !label) continue;
    const v = parseInt(input.value, 10);
    label.textContent = '$' + v.toLocaleString();
    total += v;
  }
  const totalEl = document.getElementById('budget-total');
  if (totalEl) totalEl.textContent = '$' + total.toLocaleString();
  return total;
}

// ── Debounced save to the current user's own Firestore doc ───────────────────
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveBudgetToFirestore, 800);
}

async function saveBudgetToFirestore() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const values = {};
  for (const id of fields) {
    const input = document.getElementById('br-' + id);
    if (input) values[id] = parseInt(input.value, 10);
  }

  try {
    await setDoc(doc(db, 'users', uid, 'progress', 'budget'), {
      values,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch(e) {
    console.warn('Budget save failed:', e.message);
  }
}

// ── Load this user's saved budget, or fall back to defaults ──────────────────
async function loadUserBudget() {
  const uid = auth.currentUser?.uid;
  let values = DEFAULTS;

  if (uid) {
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'progress', 'budget'));
      if (snap.exists() && snap.data().values) {
        values = { ...DEFAULTS, ...snap.data().values };
      }
    } catch(e) {
      console.warn('Budget load failed, using defaults:', e.message);
    }
  }

  for (const id of fields) {
    const input = document.getElementById('br-' + id);
    if (input && values[id] != null) input.value = values[id];
  }
  updateBudget();
}

// ── Init — wire sliders, load per-user values ─────────────────────────────────
export function initBudget() {
  for (const id of fields) {
    const input = document.getElementById('br-' + id);
    if (!input) continue;
    input.addEventListener('input', () => {
      updateBudget();
      scheduleSave();
      if (typeof window._refreshBudgetCard === 'function') window._refreshBudgetCard();
    });
  }
  loadUserBudget();
}

// ── Re-load when auth state changes (e.g. different user signs in) ───────────
export function reloadBudgetForUser() {
  loadUserBudget();
}

// ── Fetch this user's saved budget total without touching the DOM sliders ────
// Used by the Home quick-access card so it reflects the calculator even
// before the user has visited the Resources tab in this session.
export async function getUserBudgetTotal() {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;

  try {
    const snap = await getDoc(doc(db, 'users', uid, 'progress', 'budget'));
    if (snap.exists() && snap.data().values) {
      const values = { ...DEFAULTS, ...snap.data().values };
      const total = fields.reduce((sum, id) => sum + (values[id] || 0), 0);
      return total;
    }
  } catch(e) {
    console.warn('getUserBudgetTotal failed:', e.message);
  }
  return null; // no saved budget yet
}
