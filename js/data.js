import { db, auth } from './firebase.js';
import {
  collection, getDocs, getDoc, doc, setDoc, addDoc,
  onSnapshot, serverTimestamp, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  renderListings, renderHomeListing,
  renderJobs,
  renderEvents, renderHomeEvents,
  setQuickCounts
} from './render.js';
import { toast } from './ui.js';

export let allListings = [];
export let allJobs     = [];
export let allEvents   = [];

const PORCHLIGHT = 'https://porchlights.pages.dev';

// ── Seed data ─────────────────────────────────────────────────────────────────
export async function seedIfEmpty() {
  const snap = await getDocs(collection(db, 'listings'));
  if (!snap.empty) return;

  const listings = [
    {
      title: 'Modern Studio – Beltline',
      neighbourhood: 'Beltline',
      address: '1240 12 Ave SW, Calgary, AB',
      price: 850, type: 'rent',
      nearBVC: true, furnished: true, shortterm: false,
      intlFriendly: true, utilities: true,
      beds: 0, baths: 1,
      lat: 51.0369, lng: -114.0853,
      tags: ['WiFi', 'Laundry', 'CTrain 3 min'],
      porchlightUrl: `${PORCHLIGHT}/index.html`,
      featured: true,
    },
    {
      title: '1BR Apartment – Sunnyside',
      neighbourhood: 'Sunnyside',
      address: '316 10 St NW, Calgary, AB',
      price: 1100, type: 'rent',
      nearBVC: false, furnished: false, shortterm: true,
      intlFriendly: true, utilities: false,
      beds: 1, baths: 1,
      lat: 51.0566, lng: -114.0875,
      tags: ['WiFi', 'Pets OK', 'Balcony'],
      porchlightUrl: `${PORCHLIGHT}/index.html`,
      featured: true,
    },
    {
      title: 'Shared Room – East Village',
      neighbourhood: 'East Village',
      address: '550 Riverfront Ave SE, Calgary, AB',
      price: 600, type: 'rent',
      nearBVC: false, furnished: true, shortterm: false,
      intlFriendly: true, utilities: true,
      beds: 1, baths: 1,
      lat: 51.0458, lng: -114.0469,
      tags: ['Roommate match', 'Furnished', 'Bills incl.'],
      porchlightUrl: `${PORCHLIGHT}/index.html`,
      featured: false,
    },
    {
      title: '2BR Condo – Downtown Core',
      neighbourhood: 'Downtown',
      address: '701 3 St SW, Calgary, AB',
      price: 1400, type: 'rent',
      nearBVC: true, furnished: false, shortterm: false,
      intlFriendly: false, utilities: false,
      beds: 2, baths: 2,
      lat: 51.0447, lng: -114.0719,
      tags: ['Gym', 'Parking', 'City views'],
      porchlightUrl: `${PORCHLIGHT}/index.html`,
      featured: true,
    },
    {
      title: 'Studio – Inglewood',
      neighbourhood: 'Inglewood',
      address: '1302 9 Ave SE, Calgary, AB',
      price: 780, type: 'rent',
      nearBVC: false, furnished: true, shortterm: true,
      intlFriendly: true, utilities: true,
      beds: 0, baths: 1,
      lat: 51.0401, lng: -114.0299,
      tags: ['WiFi', 'Furnished', 'Short-term OK'],
      porchlightUrl: `${PORCHLIGHT}/index.html`,
      featured: false,
    },
    {
      title: '1BR Near Bow Valley College',
      neighbourhood: 'Downtown East',
      address: '332 6 Ave SE, Calgary, AB',
      price: 920, type: 'rent',
      nearBVC: true, furnished: true, shortterm: false,
      intlFriendly: true, utilities: true,
      beds: 1, baths: 1,
      lat: 51.0437, lng: -114.0582,
      tags: ['Walk to BVC', 'WiFi', 'Utilities incl.'],
      porchlightUrl: `${PORCHLIGHT}/index.html`,
      featured: true,
    },
  ];

  const jobs = [
    { title:'Junior UI/UX Designer', company:'Attain Design', salary:'$55K/yr', type:'design', remote:true, level:'entry', tags:['Figma','Hybrid','New'] },
    { title:'Frontend Developer', company:'Platform Calgary', salary:'$70K/yr', type:'frontend', remote:true, level:'mid', tags:['React','TypeScript','Remote'] },
    { title:'Part-time Dev Support', company:'Bow Valley College ITS', salary:'$22/hr', type:'frontend', remote:false, level:'entry', tags:['On Campus','Student OK','New'] },
    { title:'Product Designer', company:'Benevity', salary:'$65K/yr', type:'design', remote:false, level:'mid', tags:['UX Research','Figma','Hybrid'] },
    { title:'React Native Developer', company:'TWG Calgary', salary:'$80K/yr', type:'frontend', remote:true, level:'mid', tags:['React Native','Remote'] },
    { title:'Junior Software Developer', company:'Symend', salary:'$60K/yr', type:'dev', remote:false, level:'entry', tags:['Python','Entry Level','New'] },
  ];

  const events = [
    { title:'BVC International Student Orientation', date:{day:18,mon:'Jun'}, time:'10:00 AM', venue:'Main Campus, BVC', category:'campus', free:true },
    { title:'Calgary Tech Newcomers Meetup', date:{day:21,mon:'Jun'}, time:'5:30 PM', venue:'Platform Calgary', category:'tech', free:true },
    { title:"Multicultural Food Fair – Prince's Island", date:{day:24,mon:'Jun'}, time:'2:00 PM', venue:"Prince's Island Park", category:'cultural', free:false },
    { title:'Winter Prep Workshop – CTrain & Cold', date:{day:28,mon:'Jun'}, time:'3:00 PM', venue:'Library Central', category:'winter', free:true },
    { title:'Filipino Cultural Night', date:{day:30,mon:'Jun'}, time:'6:00 PM', venue:'Genesis Centre', category:'cultural', free:true },
  ];

  for (const l of listings) await addDoc(collection(db,'listings'), {...l, createdAt:serverTimestamp()});
  for (const j of jobs)     await addDoc(collection(db,'jobs'),     {...j, createdAt:serverTimestamp()});
  for (const e of events)   await addDoc(collection(db,'events'),   {...e, createdAt:serverTimestamp()});

  // Seed settlement tasks
  const settleRef  = doc(db, 'settings', 'settlement');
  const settleSnap = await getDocs(collection(db, 'settings'));
  const settleDoc  = settleSnap.docs.find(d => d.id === 'settlement');
  if (!settleDoc) {
    await setDoc(settleRef, {
      tasks: [
        { id:'sin',     label:'SIN card',     studentOnly:false },
        { id:'health',  label:'Health card',  studentOnly:false },
        { id:'banking', label:'Bank account', studentOnly:false },
        { id:'housing', label:'Housing',      studentOnly:false },
        { id:'sim',     label:'SIM card',     studentOnly:false },
        { id:'library', label:'Library card', studentOnly:true  },
      ],
      updatedAt: serverTimestamp(),
    });
  }
  console.log('[YYC Connect] Firestore seeded');
}

// ── Real-time listeners ────────────────────────────────────────────────────────
export function startListeners() {
  onSnapshot(collection(db,'listings'), snap => {
    allListings = snap.docs.map(d => ({id:d.id,...d.data()}));
    renderListings(allListings);
    renderHomeListing(allListings);
    setQuickCounts({listings: allListings.length});
  });
  onSnapshot(collection(db,'jobs'), snap => {
    allJobs = snap.docs.map(d => ({id:d.id,...d.data()}));
    renderJobs(allJobs);
    setQuickCounts({jobs: allJobs.length});
  });
  onSnapshot(collection(db,'events'), snap => {
    allEvents = snap.docs.map(d => ({id:d.id,...d.data()}));
    renderEvents(allEvents);
    renderHomeEvents(allEvents);
    setQuickCounts({events: allEvents.length});
  });
}

// ── Save favourite ─────────────────────────────────────────────────────────────
export async function saveFavorite(listingId, title) {
  const user = auth.currentUser;
  if (!user) { toast('Sign in to save favourites'); return; }
  await setDoc(doc(db,'users',user.uid,'favorites',listingId), {
    listingId, title, savedAt: serverTimestamp(),
  });
  toast('Saved to your favourites');
}
