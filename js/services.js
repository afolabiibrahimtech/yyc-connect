// ── services.js — Local Services Directory: static info + live OSM map ───────
// Uses Overpass API (OpenStreetMap) — completely free, no API key required

const CALGARY_CENTER = [51.0447, -114.0719];

// ── User location state ───────────────────────────────────────────────────────
let userLocation = null; // [lat, lng] once granted

export function getActiveCenter() {
  return userLocation || CALGARY_CENTER;
}

export async function requestUserLocation() {
  if (!('geolocation' in navigator)) {
    return { ok: false, reason: 'unsupported' };
  }
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLocation = [pos.coords.latitude, pos.coords.longitude];
        _cache = {}; // clear cache — results now centered differently
        resolve({ ok: true, coords: userLocation });
      },
      (err) => {
        resolve({ ok: false, reason: err.code === 1 ? 'denied' : 'error' });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  });
}

export function clearUserLocation() {
  userLocation = null;
  _cache = {};
}

// ── Static curated info (CTrain, hours, settlement orgs) ─────────────────────
export const CTRAIN_LINES = [
  { name: 'Red Line',  route: 'Tuscany ↔ Somerset-Bridlewood', color: '#C8102E' },
  { name: 'Blue Line', route: 'Crowfoot ↔ Saddletowne',         color: '#003DA5' },
];

export const SETTLEMENT_AGENCIES = [
  {
    name: 'Centre for Newcomers',
    desc: 'Free settlement services, language classes, employment support for all newcomers',
    address: '#900, 910 7 Ave SW, Calgary',
    phone: '403-265-2624',
    url: 'https://centrefornewcomers.ca',
  },
  {
    name: 'Calgary Catholic Immigration Society (CCIS)',
    desc: 'Settlement services, ESL classes, youth programs, employment services',
    address: '4011 17 Ave SE, Calgary',
    phone: '403-262-2006',
    url: 'https://ccisab.ca',
  },
  {
    name: 'Immigrant Services Calgary',
    desc: 'Settlement support, family programs, mental health services for newcomers',
    address: '1111 Olympic Way SE, Calgary',
    phone: '403-265-1120',
    url: 'https://immigrantservicescalgary.ca',
  },
];

export const ESL_PROGRAMS = [
  { name: 'Bow Valley College — ESL/LINC', desc: 'Free Language Instruction for Newcomers (LINC) — government funded', url: 'https://bowvalleycollege.ca' },
  { name: 'Mount Royal University — Continuing Ed', desc: 'Paid English language programs, academic prep', url: 'https://mtroyal.ca' },
  { name: 'Centre for Newcomers — LINC classes', desc: 'Free LINC levels 1–7, childcare available during classes', url: 'https://centrefornewcomers.ca' },
];

// ── Service categories for live map search ────────────────────────────────────
export const SERVICE_CATEGORIES = [
  { id: 'clinic',     label: 'Walk-in clinics',  icon: 'clinic',   osmTag: 'amenity=clinic' },
  { id: 'pharmacy',   label: 'Pharmacies',        icon: 'pharmacy', osmTag: 'amenity=pharmacy' },
  { id: 'bank',       label: 'Banks',             icon: 'bank',     osmTag: 'amenity=bank' },
  { id: 'grocery',    label: 'Grocery stores',    icon: 'grocery',  osmTag: 'shop=supermarket' },
  { id: 'library',    label: 'Libraries',         icon: 'library',  osmTag: 'amenity=library' },
  { id: 'worship',    label: 'Places of worship', icon: 'worship',  osmTag: 'amenity=place_of_worship' },
  { id: 'ctrain',     label: 'CTrain stations',   icon: 'train',    osmTag: 'railway=station' },
];

// ── Icon SVGs ──────────────────────────────────────────────────────────────────
function categoryIconSVG(id, size = 18, color = 'currentColor') {
  const icons = {
    clinic:   `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.29 1.51 4.04 3 5.5l7 7z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="10" y1="11" x2="14" y2="11"/></svg>`,
    pharmacy: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M19 9V6a2 2 0 00-2-2H7a2 2 0 00-2 2v3"/><path d="M3 9h18l-1 11a2 2 0 01-2 2H6a2 2 0 01-2-2L3 9z"/><line x1="12" y1="12" x2="12" y2="17"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/></svg>`,
    bank:     `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><line x1="3" y1="21" x2="21" y2="21"/><line x1="5" y1="21" x2="5" y2="10"/><line x1="9" y1="21" x2="9" y2="10"/><line x1="15" y1="21" x2="15" y2="10"/><line x1="19" y1="21" x2="19" y2="10"/><polygon points="12 3 21 9 3 9"/></svg>`,
    grocery:  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>`,
    library:  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>`,
    worship:  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M12 2v6"/><path d="M9 5h6"/><path d="M5 22V12a7 7 0 0114 0v10"/><line x1="2" y1="22" x2="22" y2="22"/></svg>`,
    train:    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><rect x="4" y="3" width="16" height="13" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="M8 19l-2 3"/><path d="M16 19l2 3"/></svg>`,
  };
  return icons[id] || icons.clinic;
}

export { categoryIconSVG };

// ── Overpass API query ────────────────────────────────────────────────────────
async function queryOverpass(osmTag, radiusM = 4000) {
  const [lat, lng] = getActiveCenter();
  const [key, val] = osmTag.split('=');
  const query = `
    [out:json][timeout:15];
    (
      node["${key}"="${val}"](around:${radiusM},${lat},${lng});
      way["${key}"="${val}"](around:${radiusM},${lat},${lng});
    );
    out center 30;
  `;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
    });
    if (!res.ok) throw new Error('Overpass error');
    const data = await res.json();
    return (data.elements || []).map(el => ({
      id:   el.id,
      name: el.tags?.name || 'Unnamed',
      lat:  el.lat || el.center?.lat,
      lng:  el.lon || el.center?.lon,
      address: [el.tags?.['addr:housenumber'], el.tags?.['addr:street']].filter(Boolean).join(' ') || null,
      phone: el.tags?.phone || el.tags?.['contact:phone'] || null,
      website: el.tags?.website || el.tags?.['contact:website'] || null,
    })).filter(p => p.lat && p.lng && p.name !== 'Unnamed');
  } catch(e) {
    console.warn('Overpass query failed:', e.message);
    return [];
  }
}

// ── Map state ──────────────────────────────────────────────────────────────────
let servicesMap = null;
let servicesMarkersLayer = null;
let servicesMapInitialised = false;
let currentCategory = 'clinic';
let _cache = {};

export async function initServicesMap() {
  if (!window.L) { console.warn('Leaflet not loaded'); return; }
  const container = document.getElementById('services-map');
  if (!container) return;

  if (!servicesMapInitialised) {
    servicesMap = window.L.map('services-map', {
      center: getActiveCenter(),
      zoom: userLocation ? 14 : 12,
      zoomControl: true,
      scrollWheelZoom: false,
    });
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(servicesMap);
    servicesMarkersLayer = window.L.layerGroup().addTo(servicesMap);
    servicesMapInitialised = true;
  } else if (userLocation) {
    servicesMap.setView(userLocation, 14);
  }

  await loadCategory(currentCategory);
}

function serviceIcon(catId) {
  const colors = {
    clinic:'#DC2626', pharmacy:'#059669', bank:'#1E40AF',
    grocery:'#EA580C', library:'#7C3AED', worship:'#B45309', train:'#0369A1',
  };
  const color = colors[catId] || '#475569';
  const html = `<div style="background:${color};width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid #fff">${categoryIconSVG(catId, 15, '#fff')}</div>`;
  return window.L.divIcon({ html, className: '', iconAnchor: [15, 15] });
}

export async function loadCategory(catId) {
  currentCategory = catId;
  const cat = SERVICE_CATEGORIES.find(c => c.id === catId);
  if (!cat || !servicesMap) return;

  const listEl = document.getElementById('services-list');
  if (listEl) listEl.innerHTML = `<div class="services-loading"><div class="ai-spinner"></div>Finding ${cat.label.toLowerCase()}...</div>`;

  let places = _cache[catId];
  if (!places) {
    places = await queryOverpass(cat.osmTag);
    _cache[catId] = places;
  }

  // Update markers
  servicesMarkersLayer.clearLayers();

  // User location marker (blue dot) if available
  if (userLocation) {
    const youIcon = window.L.divIcon({
      html: `<div style="width:16px;height:16px;border-radius:50%;background:#3B82F6;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,0.25)"></div>`,
      className: '', iconAnchor: [8, 8],
    });
    const youMarker = window.L.marker(userLocation, { icon: youIcon, zIndexOffset: 1000 });
    youMarker.bindPopup('<div style="font-family:Inter,sans-serif;font-size:12px;font-weight:600">📍 You are here</div>', { closeButton: false });
    servicesMarkersLayer.addLayer(youMarker);
  }

  places.slice(0, 25).forEach(p => {
    const marker = window.L.marker([p.lat, p.lng], { icon: serviceIcon(catId) });
    marker.bindPopup(`
      <div style="font-family:'Inter',sans-serif;min-width:180px">
        <div style="font-family:'Sora',sans-serif;font-weight:600;font-size:13px;margin-bottom:4px">${p.name}</div>
        ${p.address ? `<div style="font-size:11px;color:#64748B;margin-bottom:2px">${p.address}</div>` : ''}
        ${p.phone ? `<div style="font-size:11px;color:#64748B">${p.phone}</div>` : ''}
      </div>`, { maxWidth: 220, closeButton: false });
    servicesMarkersLayer.addLayer(marker);
  });

  if (places.length) {
    const group = window.L.featureGroup(servicesMarkersLayer.getLayers());
    servicesMap.fitBounds(group.getBounds().pad(0.15));
  }

  // Sort by distance from user if location available
  let sortedPlaces = places;
  if (userLocation) {
    sortedPlaces = places.map(p => ({
      ...p,
      distKm: haversineKm(userLocation[0], userLocation[1], p.lat, p.lng),
    })).sort((a, b) => a.distKm - b.distKm);
  }

  // Update list
  if (listEl) {
    if (!sortedPlaces.length) {
      listEl.innerHTML = `<div class="services-empty">No ${cat.label.toLowerCase()} found nearby. Try another category.</div>`;
    } else {
      listEl.innerHTML = sortedPlaces.slice(0, 12).map(p => `
        <div class="service-item" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}&query_place_id=&center=${p.lat},${p.lng}', '_blank')" role="button" tabindex="0" title="Open in Google Maps">
          <div class="service-item-icon">${categoryIconSVG(catId, 16, 'var(--navy)')}</div>
          <div class="service-item-info">
            <div class="service-item-name">${p.name}</div>
            <div class="service-item-addr">${[p.address, p.distKm != null ? `${p.distKm.toFixed(1)} km away` : null].filter(Boolean).join(' · ')}</div>
          </div>
          ${p.phone ? `<a href="tel:${p.phone}" class="service-item-action" title="Call" onclick="event.stopPropagation()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg></a>` : ''}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" class="service-item-arrow"><polyline points="9 18 15 12 9 6"/></svg>
        </div>`).join('');
    }
  }

  // Update active pill
  document.querySelectorAll('.svc-cat-pill').forEach(p =>
    p.classList.toggle('active', p.dataset.cat === catId));
}

// ── Haversine distance in km ──────────────────────────────────────────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export function refreshServicesMap() {
  if (servicesMap) setTimeout(() => servicesMap.invalidateSize(), 100);
}
