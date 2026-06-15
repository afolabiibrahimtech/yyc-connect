import { auth, db } from './firebase.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { seedIfEmpty, startListeners } from './data.js';
import { toast } from './ui.js';

const googleProvider = new GoogleAuthProvider();
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/dv933cgea/image/upload`;
const CLOUDINARY_PRESET = 'yyc-connect';

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
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch(e) {
    setError('si-error', friendlyError(e.code));
    btn.textContent = 'Sign in'; btn.disabled = false;
  }
}

export async function signUp() {
  const name       = document.getElementById('su-name').value.trim();
  const email      = document.getElementById('su-email').value.trim();
  const pass       = document.getElementById('su-pass').value;
  const country    = document.getElementById('su-country').value;
  const immType    = document.getElementById('su-immigration').value;
  const dreamCity  = document.getElementById('su-city').value;
  const customCity = document.getElementById('su-city-custom')?.value.trim();
  const photoFile  = document.getElementById('su-photo')?.files[0];
  const selectedAv = document.querySelector('.avatar-opt.selected')?.dataset.id || 'av1';
  setError('su-error','');
  if (!name)     { setError('su-error','Please enter your full name.'); return; }
  if (!country)  { setError('su-error','Please select your country.'); return; }
  if (!immType)  { setError('su-error','Please select your immigration type.'); return; }
  if (!dreamCity){ setError('su-error','Please select your dream city.'); return; }
  const btn = document.getElementById('su-btn');
  btn.textContent = 'Creating account...'; btn.disabled = true;
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
    setError('su-error', friendlyError(e.code));
    btn.textContent = 'Create account'; btn.disabled = false;
  }
}

export async function signInGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user   = result.user;
    const snap   = await getDoc(doc(db,'users',user.uid));
    if (!snap.exists()) {
      await setDoc(doc(db,'users',user.uid), {
        name: user.displayName||'', email: user.email,
        country:'', countryFlag:'🌍', immigrationType:'', dreamCity:'',
        photoURL: user.photoURL||'', avatarId:'av1',
        role:'member', status:'active',
        createdAt: serverTimestamp(), lastSeen: serverTimestamp(),
      });
    }
  } catch(e) { toast(friendlyError(e.code)); }
}

export async function signOut() {
  await fbSignOut(auth);
  toast('Signed out');
}

export function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    const authScreen = document.getElementById('auth-screen');
    const appShell   = document.getElementById('app');
    if (user) {
      if (authScreen) authScreen.classList.add('hidden');
      if (appShell)   appShell.style.display = 'block';
      const name     = user.displayName || user.email.split('@')[0];
      const initials = name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
      const map = { 'hero-name': name.split(' ')[0], 'user-avatar': initials,
        'profile-initials': initials, 'profile-name': name, 'profile-email': user.email };
      Object.entries(map).forEach(([id,val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      });
      if (user.photoURL) {
        const av = document.getElementById('user-avatar');
        if (av) { av.style.backgroundImage=`url(${user.photoURL})`; av.style.backgroundSize='cover'; av.textContent=''; }
      }
      // Ensure role and status always exist — fixes users who signed up before these fields were added
      await setDoc(doc(db,'users',user.uid), {
        lastSeen: serverTimestamp(),
        role:   (await getDoc(doc(db,'users',user.uid))).data()?.role   || 'member',
        status: (await getDoc(doc(db,'users',user.uid))).data()?.status || 'active',
      }, { merge: true });
      await seedIfEmpty();
      startListeners();
      if (window._onUserReady) window._onUserReady(user);
    } else {
      if (authScreen) authScreen.classList.remove('hidden');
      if (appShell)   appShell.style.display = 'none';
    }
  });
}
