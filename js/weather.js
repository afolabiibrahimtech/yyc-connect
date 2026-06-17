// ── weather.js — Real Calgary weather + 7-day forecast via Open-Meteo ─────────

const CALGARY_LAT = 51.0447;
const CALGARY_LNG = -114.0719;

// WMO weather codes mapped to icon names (rendered as SVG, see weatherIconSVG)
const WMO = {
  0:  { label:'Clear sky',          icon:'sun' },
  1:  { label:'Mainly clear',       icon:'sun-cloud' },
  2:  { label:'Partly cloudy',      icon:'cloud-sun' },
  3:  { label:'Overcast',           icon:'cloud' },
  45: { label:'Foggy',              icon:'fog' },
  48: { label:'Icy fog',            icon:'fog' },
  51: { label:'Light drizzle',      icon:'drizzle' },
  53: { label:'Drizzle',            icon:'drizzle' },
  55: { label:'Heavy drizzle',      icon:'rain' },
  61: { label:'Light rain',         icon:'rain' },
  63: { label:'Rain',               icon:'rain' },
  65: { label:'Heavy rain',         icon:'rain-heavy' },
  71: { label:'Light snow',         icon:'snow' },
  73: { label:'Snow',               icon:'snow' },
  75: { label:'Heavy snow',         icon:'snow-heavy' },
  77: { label:'Snow grains',        icon:'snow' },
  80: { label:'Light showers',      icon:'drizzle' },
  81: { label:'Showers',            icon:'rain' },
  82: { label:'Heavy showers',      icon:'storm' },
  85: { label:'Snow showers',       icon:'snow' },
  86: { label:'Heavy snow showers', icon:'snow-heavy' },
  95: { label:'Thunderstorm',       icon:'storm' },
  96: { label:'Thunderstorm+hail',  icon:'storm' },
  99: { label:'Thunderstorm+hail',  icon:'storm' },
};

function wmo(code) { return WMO[code] || { label:'Unknown', icon:'cloud' }; }

// ── SVG icon renderer ──────────────────────────────────────────────────────────
export function weatherIconSVG(name, size = 20) {
  const s = size;
  const icons = {
    sun: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><line x1="12" y1="2" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22"/><line x1="4.2" y1="4.2" x2="6" y2="6"/><line x1="18" y1="18" x2="19.8" y2="19.8"/><line x1="2" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22" y2="12"/><line x1="4.2" y1="19.8" x2="6" y2="18"/><line x1="18" y1="6" x2="19.8" y2="4.2"/></svg>`,
    'sun-cloud': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="9" r="3.2"/><line x1="8" y1="2.5" x2="8" y2="4.3"/><line x1="2.5" y1="9" x2="4.3" y2="9"/><line x1="3.5" y1="4" x2="4.8" y2="5.2"/><path d="M9 16.5h9a3.5 3.5 0 000-7 5.2 5.2 0 00-9.9-1.6"/></svg>`,
    'cloud-sun': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="17" cy="7" r="2.8"/><line x1="17" y1="1.5" x2="17" y2="3" stroke-width="1.6"/><line x1="22" y1="7" x2="23" y2="7" stroke-width="1.6"/><path d="M3 17h11a3.8 3.8 0 000-7.6 5.6 5.6 0 00-10.6-1.7A4.2 4.2 0 003 17z"/></svg>`,
    cloud: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h12a4 4 0 000-8 6 6 0 00-11.3-1.8A4.5 4.5 0 005 17z"/></svg>`,
    fog: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 11h10a4 4 0 000-8 6 6 0 00-10.5-2.2"/><line x1="3" y1="16" x2="21" y2="16"/><line x1="5" y1="20" x2="19" y2="20"/></svg>`,
    drizzle: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 13h12a4 4 0 000-8 6 6 0 00-11.3-1.8A4.5 4.5 0 005 13z"/><line x1="9" y1="18" x2="8" y2="21"/><line x1="14" y1="18" x2="13" y2="21"/></svg>`,
    rain: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h12a4 4 0 000-8 6 6 0 00-11.3-1.8A4.5 4.5 0 005 12z"/><line x1="8" y1="17" x2="7" y2="21"/><line x1="12" y1="17" x2="11" y2="21"/><line x1="16" y1="17" x2="15" y2="21"/></svg>`,
    'rain-heavy': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 11h12a4 4 0 000-8 6 6 0 00-11.3-1.8A4.5 4.5 0 005 11z"/><line x1="6" y1="16" x2="4.5" y2="21"/><line x1="10" y1="16" x2="8.5" y2="21"/><line x1="14" y1="16" x2="12.5" y2="21"/><line x1="18" y1="16" x2="16.5" y2="21"/></svg>`,
    snow: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h12a4 4 0 000-8 6 6 0 00-11.3-1.8A4.5 4.5 0 005 12z"/><line x1="8" y1="17" x2="8" y2="21"/><line x1="8" y1="17" x2="6.5" y2="19"/><line x1="8" y1="17" x2="9.5" y2="19"/><line x1="14" y1="17" x2="14" y2="21"/><line x1="14" y1="17" x2="12.5" y2="19"/><line x1="14" y1="17" x2="15.5" y2="19"/></svg>`,
    'snow-heavy': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 11h12a4 4 0 000-8 6 6 0 00-11.3-1.8A4.5 4.5 0 005 11z"/><line x1="7" y1="16" x2="7" y2="21"/><line x1="7" y1="16" x2="5.5" y2="18.5"/><line x1="7" y1="16" x2="8.5" y2="18.5"/><line x1="12" y1="16" x2="12" y2="21"/><line x1="12" y1="16" x2="10.5" y2="18.5"/><line x1="12" y1="16" x2="13.5" y2="18.5"/><line x1="17" y1="16" x2="17" y2="21"/><line x1="17" y1="16" x2="15.5" y2="18.5"/><line x1="17" y1="16" x2="18.5" y2="18.5"/></svg>`,
    storm: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11h12a4 4 0 000-8 6 6 0 00-11.3-1.8A4.5 4.5 0 005 11z"/><polyline points="12 16 9.5 20 12.5 20 10.5 24" stroke-width="2"/></svg>`,
  };
  return icons[name] || icons.cloud;
}

// ── Smart seasonal alert ──────────────────────────────────────────────────────
function seasonalAlert(temp, code, month) {
  const hasSnow  = [71,73,75,77,85,86].includes(code);
  const hasRain  = [51,53,55,61,63,65,80,81,82].includes(code);
  const isStormy = [95,96,99].includes(code);
  const isClear  = code <= 3;
  const isWinter = month >= 11 || month <= 2;
  const isPreWin = month === 10;
  const isSpring = month >= 3 && month <= 4;
  const isSummer = month >= 6 && month <= 8;

  if (isWinter && temp < -20)
    return '🥶 Extreme cold warning — limit time outdoors, risk of frostbite within minutes.';
  if (isWinter && hasSnow && temp < -10)
    return '❄️ Heavy winter conditions — black ice risk high, roads may be closed.';
  if (isWinter && hasSnow)
    return '🌨️ Snowfall in Calgary — wear waterproof boots, allow extra travel time.';
  if (isWinter && temp < -10)
    return '🧥 Cold day — heavy coat, gloves and hat essential. Use the +15 walkway network downtown.';
  if (isWinter && isClear)
    return '☀️ Clear winter day — cold but sunny. A great day to explore the +15 indoor walkways.';
  if (isPreWin)
    return '🍂 Winter is coming to Calgary — get your winter jacket, boots and ice scraper ready.';
  if (isSpring && hasSnow)
    return '🌨️ Late-season snow — totally normal for Calgary in spring. It won\'t stick long!';
  if (isSpring && isClear && temp > 10)
    return '🌸 Beautiful spring day — the Bow River Pathway is perfect for a walk today.';
  if (isSummer && temp > 30)
    return '🌡️ Hot day — stay hydrated! Prince\'s Island Park and Eau Claire are great spots to cool down.';
  if (isSummer && isStormy)
    return '⛈️ Thunderstorm warning — Calgary storms can be severe. Stay indoors until it passes.';
  if (isSummer && isClear) {
    const tips = [
      '☀️ Great Calgary summer day — perfect for the Bow River Pathway or Kensington shops.',
      '☀️ Sunny and warm — check out Heritage Park or the Calgary Zoo today.',
      '☀️ Beautiful day — 17th Ave SW is buzzing with cafés and patios.',
    ];
    return tips[Math.floor(Math.random()*tips.length)];
  }
  if (hasRain)
    return '🌧️ Rainy day — the CTrain is free in the downtown core. Great day for the library or a café.';
  if (temp > 0 && temp < 10)
    return '💨 Cool and breezy — Calgary wind makes it feel colder. A light jacket is a must.';
  return null;
}

// ── Fetch current + 7-day forecast ───────────────────────────────────────────
let _weatherCache = null;

export async function fetchCalgaryWeather() {
  if (_weatherCache && Date.now() - _weatherCache.fetchedAt < 30 * 60 * 1000) {
    return _weatherCache;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast`
      + `?latitude=${CALGARY_LAT}&longitude=${CALGARY_LNG}`
      + `&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m`
      + `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum`
      + `&temperature_unit=celsius&timezone=America%2FDenver&forecast_days=7`;

    const res  = await fetch(url);
    if (!res.ok) throw new Error('Weather unavailable');
    const data = await res.json();

    const current = {
      temp:     Math.round(data.current.temperature_2m),
      code:     data.current.weathercode,
      wind:     Math.round(data.current.windspeed_10m),
      humidity: data.current.relative_humidity_2m,
      label:    wmo(data.current.weathercode).label,
      icon:     wmo(data.current.weathercode).icon,
      month:    new Date().getMonth() + 1,
    };

    const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const forecast = data.daily.time.map((date, i) => ({
      date,
      day:   DAYS[new Date(date).getDay()],
      code:  data.daily.weathercode[i],
      high:  Math.round(data.daily.temperature_2m_max[i]),
      low:   Math.round(data.daily.temperature_2m_min[i]),
      rain:  data.daily.precipitation_sum[i],
      label: wmo(data.daily.weathercode[i]).label,
      icon:  wmo(data.daily.weathercode[i]).icon,
    }));

    _weatherCache = { current, forecast, fetchedAt: Date.now() };
    return _weatherCache;
  } catch(e) {
    console.warn('Weather fetch failed:', e.message);
    return null;
  }
}

// ── Update topbar pill ────────────────────────────────────────────────────────
export async function initWeather() {
  const data = await fetchCalgaryWeather();
  if (!data) return;

  const { current } = data;

  // Topbar pill — icon + temp text
  const pillText = document.getElementById('weather-pill-text');
  if (pillText) pillText.textContent = `${current.temp}°C`;

  const pillIconWrap = document.getElementById('weather-pill-icon');
  if (pillIconWrap) pillIconWrap.innerHTML = weatherIconSVG(current.icon, 13);

  // Alert banners
  const alertText = seasonalAlert(current.temp, current.code, current.month);
  if (alertText) {
    document.querySelectorAll('.alert p').forEach(el => { el.innerHTML = alertText; });
  }
}

// ── Open weather modal ────────────────────────────────────────────────────────
export async function openWeatherModal() {
  const modal = document.getElementById('weather-modal');
  if (modal) modal.classList.add('open');

  const data = await fetchCalgaryWeather();
  const body = document.getElementById('weather-modal-body');
  if (!body) return;

  if (!data) {
    body.innerHTML = `<div style="padding:40px;text-align:center;color:var(--muted)">Weather unavailable. Check back later.</div>`;
    return;
  }

  const { current, forecast } = data;
  const alertText = seasonalAlert(current.temp, current.code, current.month);
  const today = new Date();

  body.innerHTML = `
    <!-- Current conditions -->
    <div class="weather-current-card">
      <div style="color:#fff">${weatherIconSVG(current.icon, 52)}</div>
      <div>
        <div class="weather-current-temp">${current.temp}°C</div>
        <div class="weather-current-label">${current.label}</div>
        <div class="weather-current-details">Wind ${current.wind} km/h · Humidity ${current.humidity}%</div>
        <div class="weather-current-details" style="margin-top:2px">${today.toLocaleDateString('en-CA',{weekday:'long',month:'long',day:'numeric'})}</div>
      </div>
    </div>

    ${alertText ? `<div class="weather-alert-card">${alertText}</div>` : ''}

    <!-- 7-day forecast -->
    <div style="padding:12px 20px 4px;font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px">7-Day Forecast</div>
    ${forecast.map((day, i) => `
      <div class="weather-day">
        <div class="weather-day-name">${i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : day.day.slice(0,3)}</div>
        <div class="weather-day-icon" style="color:var(--navy)">${weatherIconSVG(day.icon, 22)}</div>
        <div class="weather-day-desc">${day.label}${day.rain > 0 ? ` · ${day.rain}mm` : ''}</div>
        <div class="weather-day-temps">
          <div class="weather-day-high">${day.high}°</div>
          <div class="weather-day-low">${day.low}°</div>
        </div>
      </div>`).join('')}

    <div style="padding:12px 20px;font-size:11px;color:var(--muted);text-align:center">
      Powered by Open-Meteo · Calgary, AB (51.04°N 114.07°W)
    </div>`;
}

export function closeWeatherModal() {
  document.getElementById('weather-modal')?.classList.remove('open');
}
