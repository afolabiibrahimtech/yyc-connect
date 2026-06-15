import { allListings, allJobs, allEvents } from './data.js';
import { renderListings, renderJobs, renderEvents } from './render.js';

// ── Active filter state ───────────────────────────────────────────────────────
const state = { housing: 'all', jobs: 'all', events: 'all' };

// ── Housing ───────────────────────────────────────────────────────────────────
export function filterHousing() {
  const q = (document.getElementById('housing-search')?.value || '').toLowerCase();
  let res = allListings.filter(l => {
    const text = [l.title, l.neighbourhood, ...(l.tags || [])].join(' ').toLowerCase();
    return text.includes(q);
  });
  switch (state.housing) {
    case 'bvc':      res = res.filter(l => l.nearBVC);        break;
    case 'under900': res = res.filter(l => l.price < 900);    break;
    case 'furnished':res = res.filter(l => l.furnished);      break;
    case 'shortterm':res = res.filter(l => l.shortterm);      break;
    case 'intl':     res = res.filter(l => l.intlFriendly);   break;
  }
  renderListings(res);
  if (window._onListingsFiltered) window._onListingsFiltered(res);
}

// ── Jobs ──────────────────────────────────────────────────────────────────────
export function filterJobs() {
  const q = (document.getElementById('job-search')?.value || '').toLowerCase();
  let res = allJobs.filter(j => {
    const text = [j.title, j.company, ...(j.tags || [])].join(' ').toLowerCase();
    return text.includes(q);
  });
  switch (state.jobs) {
    case 'design':   res = res.filter(j => j.type === 'design');   break;
    case 'frontend': res = res.filter(j => j.type === 'frontend'); break;
    case 'parttime': res = res.filter(j =>
      (j.tags || []).some(t => /part|campus/i.test(t)));           break;
    case 'remote':   res = res.filter(j => j.remote);              break;
    case 'entry':    res = res.filter(j => j.level === 'entry');   break;
  }
  renderJobs(res);
  const lbl = document.getElementById('jobs-count-label');
  if (lbl) lbl.textContent = `${res.length} listings in Calgary`;
}

// ── Events ────────────────────────────────────────────────────────────────────
export function filterEvents() {
  let res = allEvents;
  switch (state.events) {
    case 'free':    res = res.filter(e => e.free);                break;
    default:
      if (state.events !== 'all') {
        res = res.filter(e => e.category === state.events);
      }
  }
  renderEvents(res);
}

// ── Pill click delegation ─────────────────────────────────────────────────────
export function initFilters() {
  document.addEventListener('click', e => {
    const pill = e.target.closest('.fpill');
    if (!pill) return;
    const bar = pill.closest('.filter-bar');
    if (!bar) return;

    bar.querySelectorAll('.fpill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');

    const f = pill.dataset.filter;
    switch (bar.id) {
      case 'housing-filters': state.housing = f; filterHousing(); break;
      case 'job-filters':     state.jobs    = f; filterJobs();    break;
      case 'event-filters':   state.events  = f; filterEvents();  break;
    }
  });

  // Live search inputs
  document.getElementById('housing-search')?.addEventListener('input', filterHousing);
  document.getElementById('job-search')?.addEventListener('input', filterJobs);
}
