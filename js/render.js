// ── render.js — all DOM rendering functions ───────────────────────────────────
import { saveFavorite } from './data.js';

const icons = {
  home:     `<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
  pin:      `<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>`,
  heart:    `<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>`,
  clock:    `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
  design:   `<circle cx="13.5" cy="6.5" r="0.5"/><circle cx="17.5" cy="10.5" r="0.5"/><circle cx="8.5" cy="7.5" r="0.5"/><circle cx="6.5" cy="12.5" r="0.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>`,
  frontend: `<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>`,
  dev:      `<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>`,
  briefcase:`<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>`,
};

function svg(paths, size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${paths}</svg>`;
}

export function emptyState(msg) {
  return `<div class="empty-state" style="padding:40px 20px;text-align:center">
    ${svg('<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>', 36)}
    <p style="font-size:13px;color:var(--muted);margin-top:10px">${msg}</p>
  </div>`;
}

// ── Housing card HTML ─────────────────────────────────────────────────────────
function housingCardHTML(l) {
  const tags   = (l.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
  const badges = [
    l.intlFriendly ? `<span class="hbadge green">Intl. Friendly</span>` : '',
    l.shortterm    ? `<span class="hbadge amber">Short-term OK</span>`  : '',
  ].filter(Boolean).join('');
  return `
    <div class="hcard">
      <div class="hcard-img">
        ${svg(icons.home, 40)}
        ${badges}
      </div>
      <div class="hcard-body">
        <div class="hcard-title">${l.title}</div>
        <div class="hcard-loc">${svg(icons.pin, 12)} ${l.neighbourhood || ''}${l.nearBVC ? ' · Near BVC' : ''}</div>
        <div class="hcard-price">$${(l.price||0).toLocaleString()}<span>/mo${l.utilities ? ' · Utilities incl.' : ''}</span></div>
        <div class="tags">${tags}</div>
        <div class="hcard-actions">
          <button class="btn btn-primary" onclick="window.open('${l.porchlightUrl || 'https://porchlights.pages.dev'}','_blank')">
            ${svg('<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>', 13)}
            View on Porchlight
          </button>
          <button class="btn btn-outline" data-fav="${l.id}" data-title="${l.title}">
            ${svg(icons.heart)}
          </button>
        </div>
      </div>
    </div>`;
}

// ── Listings — housing split panel (#housing-list) ────────────────────────────
export function renderListings(items) {
  const el = document.getElementById('housing-list');
  if (!el) return;

  // Update footer count
  const countEl = document.getElementById('housing-count');
  if (countEl) countEl.textContent = `${items.length} listing${items.length !== 1 ? 's' : ''} in Calgary`;

  if (!items.length) {
    el.innerHTML = emptyState('No listings found');
    return;
  }

  el.innerHTML = items.map(housingCardHTML).join('');

  // Wire favourite buttons
  el.querySelectorAll('[data-fav]').forEach(btn => {
    btn.addEventListener('click', () => saveFavorite(btn.dataset.fav, btn.dataset.title));
  });

  // Notify map to update markers
  if (window._onListingsRendered) window._onListingsRendered(items);
}

// ── Home preview — single featured card (#home-listing) ───────────────────────
export function renderHomeListing(items) {
  const el = document.getElementById('home-listing');
  if (!el) return;
  const featured = items.find(l => l.featured) || items[0];
  if (!featured) { el.innerHTML = emptyState('No listings yet'); return; }
  el.innerHTML = housingCardHTML(featured);
  el.querySelectorAll('[data-fav]').forEach(btn => {
    btn.addEventListener('click', () => saveFavorite(btn.dataset.fav, btn.dataset.title));
  });
}

// ── Jobs ──────────────────────────────────────────────────────────────────────
export function renderJobs(items) {
  const el = document.getElementById('jobs-list');
  if (!el) return;
  const countEl = document.getElementById('jobs-count-label');
  if (countEl) countEl.textContent = `${items.length} listing${items.length !== 1 ? 's' : ''} in Calgary`;
  if (!items.length) { el.innerHTML = emptyState('No jobs match your filters'); return; }

  const iconMap = { design: icons.design, frontend: icons.frontend, dev: icons.dev };
  el.innerHTML = items.map(j => {
    const iconPath = iconMap[j.type] || icons.briefcase;
    const tags = (j.tags || []).map(t => {
      const cls = t === 'New' ? 'new' : (j.remote && t.toLowerCase().includes('remote') ? 'remote' : '');
      return `<span class="jtag ${cls}">${t}</span>`;
    }).join('');
    return `
      <div class="jcard">
        <div class="jcard-header">
          <div style="display:flex;gap:10px;align-items:flex-start">
            <div class="jlogo">${svg(iconPath, 18)}</div>
            <div>
              <div class="jcard-title">${j.title}</div>
              <div class="jcard-co">${j.company} · Calgary</div>
            </div>
          </div>
          <div class="jsalary">${j.salary}</div>
        </div>
        <div class="jtags">
          ${j.remote ? '<span class="jtag remote">Remote</span>' : ''}
          ${tags}
        </div>
      </div>`;
  }).join('');
}

// ── Events ────────────────────────────────────────────────────────────────────
function eventCardHTML(e) {
  return `
    <div class="ecard">
      <div class="edate">
        <div class="day">${e.date?.day || '—'}</div>
        <div class="mon">${e.date?.mon || ''}</div>
      </div>
      <div>
        <div class="ecard-title">${e.title}</div>
        <div class="ecard-meta">${svg(icons.clock, 11)} ${e.time} · ${e.venue}${e.free ? ' · Free' : ''}</div>
        <span class="echip ${e.category || ''}">${(e.category||'').charAt(0).toUpperCase() + (e.category||'').slice(1)}</span>
      </div>
    </div>`;
}

export function renderEvents(items) {
  const el = document.getElementById('events-list');
  if (!el) return;
  el.innerHTML = items.length ? items.map(eventCardHTML).join('') : emptyState('No events found');
}

export function renderHomeEvents(items) {
  const el = document.getElementById('home-events');
  if (!el) return;
  el.innerHTML = items.slice(0, 2).map(eventCardHTML).join('');
}

// ── Quick count labels ────────────────────────────────────────────────────────
export function setQuickCounts({ jobs, events } = {}) {
  if (jobs     !== undefined) { const el = document.getElementById('job-count-label');   if(el) el.textContent = `${jobs} new listings`; }
  if (events   !== undefined) { const el = document.getElementById('event-count-label'); if(el) el.textContent = `${events} this week`; }
}
