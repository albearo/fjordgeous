const GeoFacts = (function () {
  const RADIUS_METERS = 500;
  const PREF_KEY = 'geoFactsEnabled';
  let watchId = null;
  let containerRef = null;
  let lastMatchedId = null;

  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function findNearest(lat, lng) {
    if (!TripData.locations) return null;
    let best = null;
    let bestDist = Infinity;
    TripData.locations.forEach(loc => {
      const d = haversine(lat, lng, loc.lat, loc.lng);
      if (d < bestDist) { bestDist = d; best = loc; }
    });
    return best && bestDist <= RADIUS_METERS ? { loc: best, dist: bestDist } : null;
  }

  function renderIdle(container, enabled) {
    container.innerHTML = `
      <div class="card">
        <h3 style="margin-top:0;">📍 Nearby facts</h3>
        <p class="item-notes">${enabled ? 'Watching your location for nearby history and fun facts.' : 'Turn this on to surface history and fun facts automatically as you walk around.'}</p>
        <button class="big-tab-toggle" id="geo-toggle-btn">${enabled ? 'Turn off' : 'Enable nearby facts'}</button>
      </div>
    `;
    container.querySelector('#geo-toggle-btn').addEventListener('click', () => {
      const nowEnabled = localStorage.getItem(PREF_KEY) === '1';
      setEnabled(!nowEnabled);
      renderIdle(container, !nowEnabled);
      if (!nowEnabled) startWatching(); else stopWatching();
    });
  }

  function renderMatch(container, match) {
    const fact = getFacts(match.loc.id);
    container.innerHTML = `
      <div class="geo-fact-banner">
        <h3>📍 You're near ${match.loc.name}</h3>
        ${fact && fact.history ? `<p>${fact.history}</p>` : ''}
        ${fact && fact.funFact ? `<p><strong>Fun fact:</strong> ${fact.funFact}</p>` : ''}
        <button class="big-tab-toggle" id="geo-dismiss-btn">Dismiss</button>
      </div>
    `;
    container.querySelector('#geo-dismiss-btn').addEventListener('click', () => {
      lastMatchedId = match.loc.id;
      renderIdle(container, true);
    });
  }

  function onPosition(pos) {
    if (!containerRef) return;
    const match = findNearest(pos.coords.latitude, pos.coords.longitude);
    if (match && match.loc.id !== lastMatchedId) {
      renderMatch(containerRef, match);
    } else if (!match) {
      lastMatchedId = null;
    }
  }

  function startWatching() {
    if (!navigator.geolocation || watchId !== null) return;
    watchId = navigator.geolocation.watchPosition(onPosition, () => {}, {
      enableHighAccuracy: false,
      maximumAge: 60000,
      timeout: 20000
    });
  }

  function stopWatching() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  }

  function setEnabled(v) {
    localStorage.setItem(PREF_KEY, v ? '1' : '0');
  }

  function mount(container) {
    containerRef = container;
    const enabled = localStorage.getItem(PREF_KEY) === '1';
    renderIdle(container, enabled);
    if (enabled) startWatching();
  }

  return { mount };
})();

window.GeoFacts = GeoFacts;
