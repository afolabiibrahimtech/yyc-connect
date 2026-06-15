// ── Leaflet map for housing listings ──────────────────────────────────────────
// Leaflet is loaded via CDN <script> in index.html — available as window.L

const CALGARY_CENTER = [51.0447, -114.0719];
const CALGARY_ZOOM   = 12;

let mapInstance   = null;
let markersLayer  = null;
let mapInitialised = false;

// ── Custom pin icon ───────────────────────────────────────────────────────────
function priceIcon(price) {
  const label = `$${(price/1000).toFixed(price%1000===0?0:1)}k`;
  const html = `
    <div style="
      background:#0D1B2A;color:#F5A623;
      font-family:'Sora',sans-serif;font-size:11px;font-weight:700;
      padding:5px 9px;border-radius:20px;white-space:nowrap;
      box-shadow:0 2px 8px rgba(0,0,0,0.25);
      border:2px solid #F5A623;
      position:relative;
    ">
      ${label}
      <div style="
        position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);
        width:0;height:0;
        border-left:5px solid transparent;
        border-right:5px solid transparent;
        border-top:7px solid #F5A623;
      "></div>
    </div>`;
  return window.L.divIcon({ html, className:'', iconAnchor:[28,36] });
}

// ── Popup HTML ────────────────────────────────────────────────────────────────
function popupHTML(listing) {
  const tags = (listing.tags||[]).slice(0,3).map(t=>`<span class="map-popup-tag">${t}</span>`).join('');
  return `
    <div class="map-popup">
      <div class="map-popup-price">$${listing.price.toLocaleString()}<span style="font-size:11px;font-weight:400;color:#64748B">/mo</span></div>
      <div class="map-popup-title">${listing.title} · ${listing.neighbourhood}</div>
      <div class="map-popup-tags">${tags}</div>
      <button class="map-popup-btn" onclick="window.open('${listing.porchlightUrl}','_blank')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        View on Porchlight
      </button>
    </div>`;
}

// ── Initialise map ────────────────────────────────────────────────────────────
export function initMap(listings) {
  if (!window.L) { console.warn('Leaflet not loaded'); return; }
  const container = document.getElementById('listings-map');
  if (!container) return;

  if (!mapInitialised) {
    mapInstance = window.L.map('listings-map', {
      center: CALGARY_CENTER,
      zoom:   CALGARY_ZOOM,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapInstance);

    markersLayer = window.L.layerGroup().addTo(mapInstance);
    mapInitialised = true;
  }

  updateMapMarkers(listings);
}

// ── Update markers when listings change/filter ────────────────────────────────
export function updateMapMarkers(listings) {
  if (!mapInstance || !markersLayer) return;
  markersLayer.clearLayers();

  const valid = listings.filter(l => l.lat && l.lng);
  valid.forEach(l => {
    const marker = window.L.marker([l.lat, l.lng], { icon: priceIcon(l.price) });
    marker.bindPopup(popupHTML(l), { maxWidth: 240, closeButton: false });
    markersLayer.addLayer(marker);
  });

  // Fit bounds if markers exist
  if (valid.length) {
    const group = window.L.featureGroup(markersLayer.getLayers());
    mapInstance.fitBounds(group.getBounds().pad(0.2));
  }
}

// ── Invalidate map size after tab switch (fixes grey tiles) ──────────────────
export function refreshMap() {
  if (mapInstance) setTimeout(() => mapInstance.invalidateSize(), 100);
}
