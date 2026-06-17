import { auth, db } from './firebase.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  linkWithCredential,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  signOut as fbSignOut,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  doc, getDoc, getDocFromServer, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { toast } from './ui.js';

const googleProvider = new GoogleAuthProvider();
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/dv933cgea/image/upload`;
const CLOUDINARY_PRESET = 'yyc-connect';

// ── Email ban check ────────────────────────────────────────────────────────────
// bannedEmails/{sanitizedEmail} → { email, reason, bannedAt, bannedBy }
// Email used as part of the doc ID (lowercased, sanitized) for fast direct lookup
// without needing a query — keeps this cheap and works even while signed out.
export function sanitizeEmailKey(email) {
  return email.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
}

export async function checkEmailBanned(email) {
  if (!email) return null;
  try {
    const snap = await getDoc(doc(db, 'bannedEmails', sanitizeEmailKey(email)));
    if (snap.exists()) {
      return snap.data(); // { email, reason, bannedAt, ... }
    }
  } catch(e) {
    // If the ban check itself fails (e.g. offline), fail open rather than
    // locking everyone out due to a network blip.
    console.warn('Ban check failed:', e.message);
  }
  return null;
}

export const AVATARS = [
  { id:'av1',  label:'Sunny',  bg:'#FBBF24', svg:`<circle cx="50" cy="38" r="22" fill="#FBBF24"/><ellipse cx="50" cy="75" rx="20" ry="14" fill="#FBBF24"/><circle cx="43" cy="35" r="3" fill="#0D1B2A"/><circle cx="57" cy="35" r="3" fill="#0D1B2A"/><path d="M43 45 Q50 52 57 45" stroke="#0D1B2A" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M30 28 Q50 10 70 28" stroke="#92400E" stroke-width="4" fill="none" stroke-linecap="round"/>` },
  { id:'av2',  label:'Zara',   bg:'#F87171', svg:`<circle cx="50" cy="38" r="22" fill="#FBBF24" opacity="0.85"/><ellipse cx="50" cy="75" rx="20" ry="14" fill="#EF4444"/><circle cx="43" cy="35" r="3" fill="#0D1B2A"/><circle cx="57" cy="35" r="3" fill="#0D1B2A"/><path d="M43 46 Q50 53 57 46" stroke="#0D1B2A" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M28 26 C35 14 50 12 65 18 C72 22 74 30 70 28" stroke="#7C3AED" stroke-width="5" fill="none" stroke-linecap="round"/>` },
  { id:'av3',  label:'Kai',    bg:'#34D399', svg:`<circle cx="50" cy="38" r="22" fill="#D97706" opacity="0.9"/><ellipse cx="50" cy="75" rx="20" ry="14" fill="#065F46"/><circle cx="43" cy="35" r="3" fill="#fff"/><circle cx="57" cy="35" r="3" fill="#fff"/><path d="M44 46 Q50 52 56 46" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="33" y="16" width="34" height="10" rx="5" fill="#1E3A5F"/>` },
  { id:'av4',  label:'Priya',  bg:'#818CF8', svg:`<circle cx="50" cy="38" r="22" fill="#FBBF24" opacity="0.75"/><ellipse cx="50" cy="75" rx="20" ry="14" fill="#4C1D95"/><circle cx="43" cy="35" r="3" fill="#0D1B2A"/><circle cx="57" cy="35" r="3" fill="#0D1B2A"/><path d="M43 46 Q50 54 57 46" stroke="#0D1B2A" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M28 28 Q50 8 72 28 L68 22 Q50 4 32 22Z" fill="#0D1B2A"/>` },
  { id:'av5',  label:'Leo',    bg:'#F472B6', svg:`<circle cx="50" cy="38" r="22" fill="#FCD9B0"/><ellipse cx="50" cy="75" rx="20" ry="14" fill="#BE185D"/><circle cx="43" cy="35" r="3" fill="#374151"/><circle cx="57" cy="35" r="3" fill="#374151"/><path d="M44 46 Q50 51 56 46" stroke="#374151" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M30 30 Q40 16 50 20 Q60 16 70 30" stroke="#F59E0B" stroke-width="5" fill="none"/>` },
  { id:'av6',  label:'Amara',  bg:'#38BDF8', svg:`<circle cx="50" cy="38" r="22" fill="#92400E" opacity="0.85"/><ellipse cx="50" cy="75" rx="20" ry="14" fill="#0369A1"/><circle cx="43" cy="35" r="3" fill="#fff"/><circle cx="57" cy="35" r="3" fill="#fff"/><path d="M43 47 Q50 54 57 47" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M28 28 Q50 10 72 28 Q66 20 50 16 Q34 20 28 28Z" fill="#1C1917"/>` },
  { id:'av7',  label:'Jin',    bg:'#A3E635', svg:`<circle cx="50" cy="38" r="22" fill="#FDE68A"/><ellipse cx="50" cy="75" rx="20" ry="14" fill="#3F6212"/><circle cx="43" cy="34" r="3.5" fill="#1C1917"/><circle cx="57" cy="34" r="3.5" fill="#1C1917"/><path d="M44 46 Q50 50 56 46" stroke="#1C1917" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="30" y="14" width="40" height="14" rx="4" fill="#1C1917"/>` },
  { id:'av8',  label:'Sofia',  bg:'#FB923C', svg:`<circle cx="50" cy="38" r="22" fill="#FCD9B0"/><ellipse cx="50" cy="75" rx="20" ry="14" fill="#C2410C"/><circle cx="43" cy="35" r="3" fill="#374151"/><circle cx="57" cy="35" r="3" fill="#374151"/><path d="M43 46 Q50 53 57 46" stroke="#374151" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M28 32 Q34 14 50 16 Q66 14 72 32" stroke="#DC2626" stroke-width="5" fill="none" stroke-linecap="round"/>` },
  { id:'av9',  label:'Omar',   bg:'#C084FC', svg:`<circle cx="50" cy="38" r="22" fill="#D97706" opacity="0.8"/><ellipse cx="50" cy="75" rx="20" ry="14" fill="#6B21A8"/><circle cx="43" cy="35" r="3" fill="#fff"/><circle cx="57" cy="35" r="3" fill="#fff"/><path d="M44 47 Q50 53 56 47" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="28" y="14" width="44" height="16" rx="8" fill="#1C1917"/>` },
  { id:'av10', label:'Yuki',   bg:'#2DD4BF', svg:`<circle cx="50" cy="38" r="22" fill="#FEF3C7"/><ellipse cx="50" cy="75" rx="20" ry="14" fill="#0F766E"/><circle cx="43" cy="35" r="3" fill="#1C1917"/><circle cx="57" cy="35" r="3" fill="#1C1917"/><path d="M44 46 Q50 50 56 46" stroke="#1C1917" stroke-width="2" fill="none"/><path d="M30 30 L50 16 L70 30 L65 24 L50 12 L35 24Z" fill="#1C1917"/>` },
  { id:'av11', label:'Diego',  bg:'#F9A8D4', svg:`<circle cx="50" cy="38" r="22" fill="#FBBF24" opacity="0.7"/><ellipse cx="50" cy="75" rx="20" ry="14" fill="#9F1239"/><circle cx="43" cy="35" r="3" fill="#0D1B2A"/><circle cx="57" cy="35" r="3" fill="#0D1B2A"/><path d="M43 47 Q50 55 57 47" stroke="#0D1B2A" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M32 28 Q36 16 50 18 Q64 16 68 28" stroke="#78350F" stroke-width="5" fill="none"/>` },
  { id:'av12', label:'Nia',    bg:'#6EE7B7', svg:`<circle cx="50" cy="38" r="22" fill="#7C2D12" opacity="0.9"/><ellipse cx="50" cy="75" rx="20" ry="14" fill="#064E3B"/><circle cx="43" cy="34" r="3.5" fill="#FEF3C7"/><circle cx="57" cy="34" r="3.5" fill="#FEF3C7"/><path d="M43 47 Q50 54 57 47" stroke="#FEF3C7" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M28 28 Q50 6 72 28 L68 20 Q50 2 32 20Z" fill="#451A03"/>` },
];

export const ALBERTA_CITIES = [
  'Calgary','Edmonton','Red Deer','Lethbridge','Medicine Hat',
  'Fort McMurray','Grande Prairie','Airdrie','Banff','Canmore',
  'Cochrane','Okotoks','Sherwood Park','St. Albert','Camrose','other'
];

export const COUNTRIES = [
  {name:'Afghanistan',flag:'🇦🇫'},{name:'Australia',flag:'🇦🇺'},{name:'Bangladesh',flag:'🇧🇩'},
  {name:'Brazil',flag:'🇧🇷'},{name:'Canada',flag:'🇨🇦'},{name:'China',flag:'🇨🇳'},
  {name:'Colombia',flag:'🇨🇴'},{name:'Egypt',flag:'🇪🇬'},{name:'Ethiopia',flag:'🇪🇹'},
  {name:'France',flag:'🇫🇷'},{name:'Germany',flag:'🇩🇪'},{name:'Ghana',flag:'🇬🇭'},
  {name:'India',flag:'🇮🇳'},{name:'Indonesia',flag:'🇮🇩'},{name:'Iran',flag:'🇮🇷'},
  {name:'Iraq',flag:'🇮🇶'},{name:'Jamaica',flag:'🇯🇲'},{name:'Japan',flag:'🇯🇵'},
  {name:'Kenya',flag:'🇰🇪'},{name:'Mexico',flag:'🇲🇽'},{name:'Morocco',flag:'🇲🇦'},
  {name:'Nepal',flag:'🇳🇵'},{name:'Nigeria',flag:'🇳🇬'},{name:'Pakistan',flag:'🇵🇰'},
  {name:'Philippines',flag:'🇵🇭'},{name:'Romania',flag:'🇷🇴'},{name:'Saudi Arabia',flag:'🇸🇦'},
  {name:'Senegal',flag:'🇸🇳'},{name:'Somalia',flag:'🇸🇴'},{name:'South Korea',flag:'🇰🇷'},
  {name:'Spain',flag:'🇪🇸'},{name:'Sri Lanka',flag:'🇱🇰'},{name:'Sudan',flag:'🇸🇩'},
  {name:'Syria',flag:'🇸🇾'},{name:'Tanzania',flag:'🇹🇿'},{name:'Turkey',flag:'🇹🇷'},
  {name:'Uganda',flag:'🇺🇬'},{name:'Ukraine',flag:'🇺🇦'},{name:'United Kingdom',flag:'🇬🇧'},
  {name:'United States',flag:'🇺🇸'},{name:'Venezuela',flag:'🇻🇪'},{name:'Vietnam',flag:'🇻🇳'},
  {name:'Zimbabwe',flag:'🇿🇼'},{name:'Other',flag:'🌍'},
];

function friendlyError(code) {
  const map = {
    'auth/invalid-email':'Please enter a valid email.',
    'auth/wrong-password':'Incorrect password.',
    'auth/invalid-credential':'Incorrect email or password.',
    'auth/user-not-found':'No account found with this email.',
    'auth/email-already-in-use':'An account with this email already exists.',
    'auth/weak-password':'Password must be at least 6 characters.',
    'auth/too-many-requests':'Too many attempts. Try again later.',
    'auth/popup-closed-by-user':'Sign-in window was closed.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

export async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_PRESET);
  const res = await fetch(CLOUDINARY_URL, { method:'POST', body:fd });
  const data = await res.json();
  if (!data.secure_url) throw new Error('Upload failed');
  return data.secure_url;
}

export async function signIn() {
  const email = document.getElementById('si-email').value.trim();
  const pass  = document.getElementById('si-pass').value;
  setError('si-error','');
  const btn = document.getElementById('si-btn');
  btn.textContent = 'Signing in...'; btn.disabled = true;

  const ban = await checkEmailBanned(email);
  if (ban) {
    setError('si-error', 'This account has been locked. Contact support if you believe this is a mistake.');
    btn.textContent = 'Sign in'; btn.disabled = false;
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch(e) {
    setError('si-error', friendlyError(e.code));
    btn.textContent = 'Sign in'; btn.disabled = false;
  }
}

export function signupGoToStep2() {
  const name    = document.getElementById('su-name').value.trim();
  const email   = document.getElementById('su-email').value.trim();
  const pass    = document.getElementById('su-pass').value;
  const confirm = document.getElementById('su-pass-confirm').value;
  setError('su-error-1', '');

  if (!name)              { setError('su-error-1', 'Please enter your full name.'); return; }
  if (!email)             { setError('su-error-1', 'Please enter your email.'); return; }
  if (!pass || pass.length < 6) { setError('su-error-1', 'Password must be at least 6 characters.'); return; }
  if (pass !== confirm)   { setError('su-error-1', 'Passwords do not match.'); return; }

  document.getElementById('su-step-1').style.display = 'none';
  document.getElementById('su-step-2').style.display = 'block';
  document.getElementById('su-dot-1').classList.remove('active');
  document.getElementById('su-dot-2').classList.add('active');
}

export function signupGoToStep1() {
  document.getElementById('su-step-2').style.display = 'none';
  document.getElementById('su-step-1').style.display = 'block';
  document.getElementById('su-dot-2').classList.remove('active');
  document.getElementById('su-dot-1').classList.add('active');
}

export async function signUp() {
  const name       = document.getElementById('su-name').value.trim();
  const email      = document.getElementById('su-email').value.trim();
  const pass       = document.getElementById('su-pass').value;
  const country    = document.getElementById('su-country').value;
  const immType    = document.getElementById('su-immigration').value;
  const dreamCity  = document.getElementById('su-city').value;
  const customCity = document.getElementById('su-city-other')?.value.trim();
  const photoFile  = document.getElementById('su-photo')?.files[0];
  const selectedAv = document.querySelector('#su-av-grid .av-btn.selected')?.dataset.id || 'av1';
  setError('su-error-2','');
  if (!country)  { setError('su-error-2','Please select your country.'); return; }
  if (!immType)  { setError('su-error-2','Please select your immigration type.'); return; }
  if (!dreamCity){ setError('su-error-2','Please select your dream city.'); return; }
  const btn = document.getElementById('su-btn');
  btn.textContent = 'Creating account...'; btn.disabled = true;

  const ban = await checkEmailBanned(email);
  if (ban) {
    setError('su-error-2', 'This email has been locked from creating an account. Contact support if you believe this is a mistake.');
    btn.textContent = 'Create account'; btn.disabled = false;
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const uid  = cred.user.uid;
    let photoURL = '';
    if (photoFile) {
      toast('Uploading photo...');
      photoURL = await uploadToCloudinary(photoFile);
    }
    await updateProfile(cred.user, { displayName: name, photoURL: photoURL || '' });
    const countryObj = COUNTRIES.find(c => c.name === country) || { name: country, flag:'🌍' };
    const finalCity  = dreamCity === 'other' ? (customCity || 'Alberta') : dreamCity;
    await setDoc(doc(db,'users',uid), {
      name, email,
      country: countryObj.name, countryFlag: countryObj.flag,
      immigrationType: immType,
      dreamCity: finalCity,
      photoURL, avatarId: photoURL ? '' : selectedAv,
      role: 'member', status: 'active',
      createdAt: serverTimestamp(), lastSeen: serverTimestamp(),
    });
  } catch(e) {
    setError('su-error-2', friendlyError(e.code));
    btn.textContent = 'Create account'; btn.disabled = false;
  }
}

export async function signInGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user   = result.user;

    const ban = await checkEmailBanned(user.email);
    if (ban) {
      await fbSignOut(auth);
      toast('This account has been locked. Contact support if you believe this is a mistake.');
      return;
    }

    // Use getDocFromServer (not getDoc) to bypass Firestore's local cache.
    // If this device had a previous session for this exact UID that was
    // later deleted by an admin, the local cache can still hold the old
    // "doc exists" answer until it resyncs — which would wrongly skip
    // onboarding for what should be treated as a brand-new account.
    let snap;
    try {
      snap = await getDocFromServer(doc(db,'users',user.uid));
    } catch(e) {
      snap = await getDoc(doc(db,'users',user.uid));
    }
    if (!snap.exists()) {
      await setDoc(doc(db,'users',user.uid), {
        name: user.displayName||'', email: user.email,
        country:'', countryFlag:'🌍', immigrationType:'', dreamCity:'',
        photoURL: user.photoURL||'', avatarId:'av1',
        role:'member', status:'active',
        onboardingComplete: false,
        createdAt: serverTimestamp(), lastSeen: serverTimestamp(),
      });
    }
  } catch(e) { toast(friendlyError(e.code)); }
}

export async function signOut() {
  await fbSignOut(auth);
  toast('Signed out');
}

// ── Let a Google-only user add a password, so they can sign in either way ────
export async function setPasswordForAccount(newPassword) {
  const user = auth.currentUser;
  if (!user || !user.email) {
    return { ok: false, error: 'Not signed in.' };
  }

  try {
    const credential = EmailAuthProvider.credential(user.email, newPassword);
    await linkWithCredential(user, credential);
    return { ok: true };
  } catch(e) {
    if (e.code === 'auth/provider-already-linked' || e.code === 'auth/credential-already-in-use') {
      return { ok: false, error: 'A password is already set for this account.' };
    }
    if (e.code === 'auth/weak-password') {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }
    return { ok: false, error: friendlyError(e.code) };
  }
}

// ── Check whether the current user already has a password sign-in method ─────
export async function hasPasswordProvider() {
  const user = auth.currentUser;
  if (!user) return false;
  return user.providerData.some(p => p.providerId === 'password');
}

// ── Periodic ban check while a session is active ──────────────────────────────
// Call startBanPolling(email) right after a successful sign-in and
// stopBanPolling() on sign-out. Wired into the real auth listener in
// index.html (this used to live inside an initAuth() function here that
// was never actually called — removed to avoid confusion).
let _banPollTimer = null;

export function startBanPolling(email) {
  stopBanPolling();
  _banPollTimer = setInterval(async () => {
    const ban = await checkEmailBanned(email);
    if (ban) {
      stopBanPolling();
      await fbSignOut(auth);
      showLockedOutScreen();
    }
  }, 60000); // every 60 seconds
}

export function stopBanPolling() {
  if (_banPollTimer) { clearInterval(_banPollTimer); _banPollTimer = null; }
}

// ── Google onboarding — mandatory password + profile setup for new sign-ups ──
let _onboardingUser = null;

export function showGoogleOnboarding(user, userData) {
  _onboardingUser = user;
  const passScreen    = document.getElementById('google-onboard-pass');
  const profileScreen = document.getElementById('google-onboard-profile');

  // Pre-fill name from Google so the user can confirm or edit it rather
  // than starting from a blank field.
  const nameInput = document.getElementById('gob-name');
  if (nameInput && !nameInput.value) nameInput.value = user.displayName || '';

  // Show their Google account photo as a starting preview, since they
  // haven't uploaded a custom one or picked an avatar yet.
  if (user.photoURL) {
    const preview = document.getElementById('gob-photo-preview');
    const img     = document.getElementById('gob-photo-img');
    const icon    = document.getElementById('gob-photo-icon');
    const lbl     = document.getElementById('gob-photo-lbl');
    if (preview && img && icon && lbl) {
      img.src = user.photoURL;
      preview.style.display = 'block';
      icon.style.display    = 'none';
      lbl.textContent       = 'Using your Google photo — tap to change';
    }
  }

  // If they already have a password provider linked (e.g. resumed flow after
  // setting password but before finishing profile), skip straight to profile.
  const hasPassword = user.providerData.some(p => p.providerId === 'password');
  if (hasPassword) {
    if (passScreen)    passScreen.style.display = 'none';
    if (profileScreen) profileScreen.style.display = 'flex';
  } else {
    if (passScreen)    passScreen.style.display = 'flex';
    if (profileScreen) profileScreen.style.display = 'none';
  }
}

export function hideGoogleOnboarding() {
  document.getElementById('google-onboard-pass')?.style.setProperty('display', 'none');
  document.getElementById('google-onboard-profile')?.style.setProperty('display', 'none');
  _onboardingUser = null;
}

export async function submitGoogleOnboardPassword() {
  const pass    = document.getElementById('gob-pass').value;
  const confirm = document.getElementById('gob-pass-confirm').value;
  setError('gob-pass-error', '');

  if (!pass || pass.length < 6) { setError('gob-pass-error', 'Password must be at least 6 characters.'); return; }
  if (pass !== confirm)         { setError('gob-pass-error', 'Passwords do not match.'); return; }

  const btn = document.getElementById('gob-pass-btn');
  btn.textContent = 'Saving...'; btn.disabled = true;

  const result = await setPasswordForAccount(pass);
  btn.textContent = 'Continue'; btn.disabled = false;

  if (!result.ok) {
    setError('gob-pass-error', result.error);
    return;
  }

  document.getElementById('google-onboard-pass').style.display = 'none';
  document.getElementById('google-onboard-profile').style.display = 'flex';
}

export async function submitGoogleOnboardProfile() {
  const name        = document.getElementById('gob-name').value.trim();
  const country     = document.getElementById('gob-country').value;
  const immType     = document.getElementById('gob-immigration').value;
  const dreamCity    = document.getElementById('gob-city').value;
  const customCity  = document.getElementById('gob-city-other')?.value.trim();
  const photoFile   = document.getElementById('gob-photo')?.files[0];
  const selectedAv  = document.querySelector('#gob-av-grid .av-btn.selected')?.dataset.id || null;
  setError('gob-profile-error', '');

  if (!name)     { setError('gob-profile-error', 'Please enter your name.'); return; }
  if (!country)  { setError('gob-profile-error', 'Please select your country.'); return; }
  if (!immType)  { setError('gob-profile-error', 'Please select your immigration type.'); return; }
  if (!dreamCity){ setError('gob-profile-error', 'Please select your dream city.'); return; }

  const btn = document.getElementById('gob-profile-btn');
  btn.textContent = 'Saving...'; btn.disabled = true;

  const user = _onboardingUser || auth.currentUser;
  if (!user) { setError('gob-profile-error', 'Session expired — please sign in again.'); return; }

  try {
    const countryObj = COUNTRIES.find(c => c.name === country) || { name: country, flag:'🌍' };
    const finalCity  = dreamCity === 'other' ? (customCity || 'Alberta') : dreamCity;

    // Photo priority: a freshly uploaded photo wins, then a chosen avatar
    // (which clears any photo so the avatar actually shows), and only if
    // neither was picked do we keep whatever Google originally provided.
    let photoURL = user.photoURL || '';
    let avatarId = '';
    if (photoFile) {
      toast('Uploading photo...');
      photoURL = await uploadToCloudinary(photoFile);
      avatarId = '';
    } else if (selectedAv) {
      photoURL = '';
      avatarId = selectedAv;
    }

    await updateProfile(user, { displayName: name, photoURL: photoURL || user.photoURL || '' });

    await setDoc(doc(db,'users',user.uid), {
      name,
      country: countryObj.name, countryFlag: countryObj.flag,
      immigrationType: immType,
      dreamCity: finalCity,
      photoURL,
      avatarId,
      onboardingComplete: true,
    }, { merge: true });

    hideGoogleOnboarding();
    document.getElementById('app').style.display = 'block';
    if (window._onUserReady) window._onUserReady(user);
  } catch(e) {
    setError('gob-profile-error', friendlyError(e.code));
    btn.textContent = 'Finish setting up'; btn.disabled = false;
  }
}

// ── Locked-out screen ──────────────────────────────────────────────────────────
export function showLockedOutScreen() {
  const appShell    = document.getElementById('app');
  const authScreen  = document.getElementById('auth-screen');
  if (appShell)   appShell.style.display = 'none';
  if (authScreen) authScreen.classList.add('hidden');

  let lockScreen = document.getElementById('locked-out-screen');
  if (!lockScreen) {
    lockScreen = document.createElement('div');
    lockScreen.id = 'locked-out-screen';
    lockScreen.style.cssText = `
      position:fixed;inset:0;z-index:600;background:#0D1B2A;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      padding:32px 24px;text-align:center;font-family:'Inter',sans-serif;`;
    lockScreen.innerHTML = `
      <div style="width:64px;height:64px;border-radius:50%;background:rgba(220,38,38,0.12);border:1px solid rgba(220,38,38,0.3);display:flex;align-items:center;justify-content:center;margin-bottom:20px">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      </div>
      <div style="font-family:'Sora',sans-serif;font-size:20px;font-weight:700;color:#fff;margin-bottom:10px">Account locked</div>
      <p style="font-size:14px;color:rgba(255,255,255,0.55);max-width:340px;line-height:1.6;margin-bottom:24px">
        This account has been locked by an administrator and can no longer access YYC Connect. If you believe this is a mistake, please contact support.
      </p>
      <button onclick="window.location.reload()" style="padding:11px 24px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif">
        Reload page
      </button>`;
    document.body.appendChild(lockScreen);
  }
  lockScreen.style.display = 'flex';
}
