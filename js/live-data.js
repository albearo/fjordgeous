const LiveData = (function () {
  const WEATHER_CACHE_KEY = 'weatherCache';
  const ELECTION_CACHE_KEY = 'electionCache';

  const CITIES = [
    { name: 'Stockholm', lat: 59.3293, lng: 18.0686 },
    { name: 'Copenhagen', lat: 55.6761, lng: 12.5683 },
    { name: 'Oslo', lat: 59.9139, lng: 10.7522 },
    { name: 'Flåm', lat: 60.8633, lng: 7.1136 },
    { name: 'Bergen', lat: 60.3913, lng: 5.3221 }
  ];

  const NEWS_LINKS = [
    { city: 'Sweden', name: 'The Local Sweden', url: 'https://www.thelocal.se' },
    { city: 'Sweden', name: 'SVT Nyheter (English filter via Google Translate)', url: 'https://www.svt.se/nyheter/' },
    { city: 'Denmark', name: 'The Local Denmark', url: 'https://www.thelocal.dk' },
    { city: 'Denmark', name: 'CPH Post', url: 'https://cphpost.dk' },
    { city: 'Norway', name: 'The Local Norway', url: 'https://www.thelocal.no' },
    { city: 'Norway', name: 'The Norway Post', url: 'https://www.norwaypost.no' }
  ];

  const WMO = {
    0: '☀️ Clear', 1: '🌤️ Mostly clear', 2: '⛅ Partly cloudy', 3: '☁️ Overcast',
    45: '🌫️ Fog', 48: '🌫️ Fog', 51: '🌦️ Drizzle', 53: '🌦️ Drizzle', 55: '🌧️ Drizzle',
    61: '🌧️ Light rain', 63: '🌧️ Rain', 65: '🌧️ Heavy rain',
    71: '🌨️ Light snow', 73: '🌨️ Snow', 75: '❄️ Heavy snow',
    80: '🌦️ Showers', 81: '🌧️ Showers', 82: '⛈️ Violent showers',
    95: '⛈️ Thunderstorm'
  };

  function loadCache(key) {
    try { return JSON.parse(localStorage.getItem(key)) || null; } catch (e) { return null; }
  }
  function saveCache(key, data) {
    localStorage.setItem(key, JSON.stringify({ data, fetchedAt: Date.now() }));
  }
  function formatAge(ts) {
    const mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return `${Math.round(hrs / 24)}d ago`;
  }

  async function fetchWeatherFor(city) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('weather fetch failed');
    const json = await res.json();
    return {
      temp: Math.round(json.current.temperature_2m),
      code: json.current.weather_code
    };
  }

  function mountWeather(container) {
    const cache = loadCache(WEATHER_CACHE_KEY);
    let weatherData = cache ? cache.data : {};
    let fetchedAt = cache ? cache.fetchedAt : null;

    function render() {
      container.innerHTML = `
        <h3 style="margin-top:0;">🌦️ Weather</h3>
        <div class="weather-row">
          ${CITIES.map(c => {
            const w = weatherData[c.name];
            return `<div class="weather-city">
              <div class="wc-name">${c.name}</div>
              <div class="wc-temp">${w ? w.temp + '°F' : '—'}</div>
              <div class="wc-cond">${w ? (WMO[w.code] || '') : ''}</div>
            </div>`;
          }).join('')}
        </div>
        <div class="stale-note">${fetchedAt ? `As of ${formatAge(fetchedAt)}` : 'No cached data yet'}</div>
      `;
    }
    render();

    Promise.all(CITIES.map(c => fetchWeatherFor(c).then(w => ({ city: c.name, w })).catch(() => null)))
      .then(results => {
        results.forEach(r => { if (r) weatherData[r.city] = r.w; });
        if (results.some(r => r)) {
          fetchedAt = Date.now();
          saveCache(WEATHER_CACHE_KEY, weatherData);
        }
        render();
      });
  }

  async function fetchElectionSummary() {
    const candidates = [
      'Opinion polling for the next Swedish general election',
      'Opinion polling for the 2026 Swedish general election',
      'Next Swedish general election'
    ];
    for (const title of candidates) {
      try {
        const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.extract) return { title: json.title, extract: json.extract, url: json.content_urls?.desktop?.page };
        }
      } catch (e) { /* try next candidate */ }
    }
    throw new Error('no candidate page found');
  }

  function mountElection(container) {
    const cache = loadCache(ELECTION_CACHE_KEY);
    let data = cache ? cache.data : null;
    let fetchedAt = cache ? cache.fetchedAt : null;

    function render() {
      container.innerHTML = `
        <h3 style="margin-top:0;">🗳️ Swedish election 2026</h3>
        ${data ? `
          <p class="item-notes">${data.extract}</p>
          <div class="stale-note">As of ${formatAge(fetchedAt)} — <a href="${data.url}" target="_blank" rel="noopener">Wikipedia</a></div>
        ` : `<p class="item-notes">Best-effort summary — will fetch when online.</p>`}
        <div class="item-links" style="margin-top:8px;">
          <a href="https://en.wikipedia.org/wiki/Opinion_polling_for_the_next_Swedish_general_election" target="_blank" rel="noopener">Live polling (Wikipedia)</a>
          <a href="https://www.pollofpolls.eu/SE" target="_blank" rel="noopener">Poll of Polls</a>
          <a href="https://www.thelocal.se/tag/swedish-election-2026" target="_blank" rel="noopener">The Local: Election coverage</a>
        </div>
      `;
    }
    render();

    fetchElectionSummary()
      .then(d => { data = d; fetchedAt = Date.now(); saveCache(ELECTION_CACHE_KEY, d); render(); })
      .catch(() => { render(); });
  }

  function mountNews(container) {
    const byCountry = {};
    NEWS_LINKS.forEach(l => { byCountry[l.city] = byCountry[l.city] || []; byCountry[l.city].push(l); });
    container.innerHTML = `
      <h3 style="margin-top:0;">📰 Local news</h3>
      ${Object.keys(byCountry).map(country => `
        <div style="margin-bottom:8px;">
          <strong style="font-size:0.85rem;">${country}</strong>
          <div class="item-links" style="margin-top:4px;">
            ${byCountry[country].map(l => `<a href="${l.url}" target="_blank" rel="noopener">${l.name}</a>`).join('')}
          </div>
        </div>
      `).join('')}
      <div class="stale-note">Opens live in your browser — needs a connection.</div>
    `;
  }

  return { mountWeather, mountElection, mountNews, CITIES };
})();

window.LiveData = LiveData;
