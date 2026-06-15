import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDBlQ0e_7NFE_-T-mVW5rHC8nIEk-xxz4M",
  authDomain: "yyc-connect-ae38a.firebaseapp.com",
  projectId: "yyc-connect-ae38a",
  storageBucket: "yyc-connect-ae38a.firebasestorage.app",
  messagingSenderId: "751603777137",
  appId: "1:751603777137:web:69f7d88c298863b6c965d0",
  measurementId: "G-3LJY4F53T2"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
