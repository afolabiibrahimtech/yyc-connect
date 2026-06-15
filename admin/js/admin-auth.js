import { auth, db } from '../../js/firebase.js';
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

function setError(msg) {
  const el = document.getElementById('admin-error');
  if (el) el.textContent = msg;
}

function friendlyError(code) {
  const map = {
    'auth/invalid-credential':   'Incorrect email or password.',
    'auth/wrong-password':       'Incorrect password.',
    'auth/user-not-found':       'No account found.',
    'auth/too-many-requests':    'Too many attempts. Try again later.',
    'auth/invalid-email':        'Invalid email address.',
  };
  return map[code] || 'Sign-in failed. Please try again.';
}

export async function adminSignIn() {
  const email = document.getElementById('admin-email').value.trim();
  const pass  = document.getElementById('admin-pass').value;
  setError('');
  const btn = document.getElementById('admin-signin-btn');
  btn.textContent = 'Signing in...'; btn.disabled = true;
  try {
    const cred  = await signInWithEmailAndPassword(auth, email, pass);
    const snap  = await getDoc(doc(db, 'users', cred.user.uid));
    const role  = snap.data()?.role;
    if (role !== 'admin') {
      await fbSignOut(auth);
      setError('Access denied. This account does not have admin privileges.');
      btn.textContent = 'Sign in'; btn.disabled = false;
      return;
    }
    // auth state observer handles redirect
  } catch(e) {
    setError(friendlyError(e.code));
    btn.textContent = 'Sign in'; btn.disabled = false;
  }
}

export async function adminSignOut() {
  await fbSignOut(auth);
}

// ── Promote a user to admin (call from console or one-time setup) ─────────────
export async function promoteToAdmin(uid) {
  await updateDoc(doc(db, 'users', uid), { role: 'admin' });
}

// ── Auth guard — redirects if not signed in or not admin ─────────────────────
export function guardAdmin(onReady) {
  onAuthStateChanged(auth, async (user) => {
    const loginScreen = document.getElementById('admin-login');
    const dashboard   = document.getElementById('admin-dashboard');

    if (!user) {
      loginScreen.style.display = 'flex';
      dashboard.style.display   = 'none';
      return;
    }

    const snap = await getDoc(doc(db, 'users', user.uid));
    const data = snap.data();

    if (data?.role !== 'admin') {
      loginScreen.style.display = 'flex';
      dashboard.style.display   = 'none';
      setError('Access denied. Admin privileges required.');
      await fbSignOut(auth);
      return;
    }

    loginScreen.style.display = 'none';
    dashboard.style.display   = 'block';

    // Populate admin header
    const nameEl = document.getElementById('admin-user-name');
    if (nameEl) nameEl.textContent = data.name || user.email;

    onReady(user, data);
  });
}
