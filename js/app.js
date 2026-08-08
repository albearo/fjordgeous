const STATUS_LABELS = { booked: 'Booked', planned: 'Planned', optional: 'Optional' };
const TYPE_ICONS = {
  transit: '🚆', lodging: '🛏️', dining: '🍽️', museum: '🏛️', walking: '🚶',
  event: '🎉', logistics: '🧳'
};
const TYPE_LABELS = {
  museum: 'Museum', walking: 'Walking', dining: 'Dining', transit: 'Transit',
  lodging: 'Lodging', event: 'Event', logistics: 'Logistics'
};
const TRANSIT_MODE_ICONS = {
  flight: 'assets/illustrations/plane.png',
  train: 'assets/illustrations/train.png',
  boat: 'assets/illustrations/viking-ship.png'
};

let currentFilter = 'all';
let currentTypeFilter = 'all';

function mapsSearchUrl(loc) {
  if (!loc) return null;
  return `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
}

function renderItem(item) {
  const modeIcon = item.type === 'transit' ? TRANSIT_MODE_ICONS[item.mode] : null;
  const icon = TYPE_ICONS[item.type] || '📍';
  const titleIcon = modeIcon
    ? `<img class="transit-icon" src="${modeIcon}" alt="" />`
    : icon;
  const loc = item.locationId ? getLocation(item.locationId) : null;
  const fact = item.locationId ? getFacts(item.locationId) : null;
  const mapsUrl = mapsSearchUrl(loc);

  let links = '';
  if (item.ticketFile) {
    links += `<a href="assets/tickets/${item.ticketFile}" target="_blank" rel="noopener">🎫 Ticket</a>`;
  }
  if (mapsUrl) {
    links += `<a href="${mapsUrl}" target="_blank" rel="noopener">🗺️ Map</a>`;
  }

  const mascot = item.type === 'dining'
    ? 'assets/illustrations/cardamom-bun.png'
    : 'assets/illustrations/viking.png';

  let factsHtml = '';
  if (fact) {
    factsHtml = `<details class="item-facts">
      <summary class="link-btn" style="cursor:pointer;">📚 Fjun Fjacts</summary>
      <div class="fact-bubble">
        <img class="fact-mascot" src="${mascot}" alt="" />
        <div class="fact-speech">
          ${fact.history ? `<p>${fact.history}</p>` : ''}
          ${fact.funFact ? `<p><strong>Fun fact:</strong> ${fact.funFact}</p>` : ''}
        </div>
      </div>
    </details>`;
  }

  return `
    <div class="item status-${item.status} type-${item.type}" data-status="${item.status}">
      <div class="item-top">
        <span class="item-title">${titleIcon} ${item.title}</span>
        ${item.time ? `<span class="item-time">${item.time}</span>` : ''}
      </div>
      <span class="badge status-${item.status}">${STATUS_LABELS[item.status] || item.status}</span>
      ${item.notes ? `<div class="item-notes">${item.notes}</div>` : ''}
      ${links ? `<div class="item-links">${links}</div>` : ''}
      ${factsHtml}
    </div>
  `;
}

function renderDayCard(day, opts = {}) {
  let items = day.items;
  if (currentFilter !== 'all') items = items.filter(i => i.status === currentFilter);
  if (currentTypeFilter !== 'all') items = items.filter(i => i.type === currentTypeFilter);
  if (opts.filterHide && items.length === 0) return '';
  const cityNotesHtml = day.cityNotes ? `
    <div class="city-notes">
      <strong>City notes</strong>
      <ul>${day.cityNotes.map(n => `<li>${n}</li>`).join('')}</ul>
    </div>` : '';

  return `
    <div class="card">
      <div class="day-header">
        <span class="day-num">DAY ${day.day}</span>
        <span class="day-date">${day.weekday}, ${formatDate(day.date)}</span>
      </div>
      <span class="day-city">${day.city}</span>
      <div class="day-title">${day.title}</div>
      <div class="day-summary">${day.summary}</div>
      ${cityNotesHtml}
      ${items.map(renderItem).join('') || '<p class="empty-state">Nothing matches this filter for today.</p>'}
    </div>
  `;
}

function formatDate(iso) {
  const d = parseISODate(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function renderFilterRow() {
  const filters = ['all', 'booked', 'planned', 'optional'];
  const labels = { all: 'All', booked: 'Booked', planned: 'Planned', optional: 'Optional' };
  return `<div class="filter-row">
    ${filters.map(f => `<button class="filter-chip ${currentFilter === f ? 'active' : ''}" data-filter="${f}">${labels[f]}</button>`).join('')}
  </div>`;
}

function renderTypeFilterRow() {
  const types = ['all', 'museum', 'walking', 'dining', 'transit', 'lodging', 'event', 'logistics'];
  return `<div class="filter-row">
    ${types.map(t => `<button class="filter-chip ${currentTypeFilter === t ? 'active' : ''}" data-type-filter="${t}">${t === 'all' ? 'All' : (TYPE_ICONS[t] + ' ' + TYPE_LABELS[t])}</button>`).join('')}
  </div>`;
}

function attachFilterHandlers(container) {
  container.querySelectorAll('.filter-chip[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      renderActiveTab();
    });
  });
  container.querySelectorAll('.filter-chip[data-type-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTypeFilter = btn.dataset.typeFilter;
      renderActiveTab();
    });
  });
}

function findTodayDay() {
  const today = todayAtMidnight();
  return TripData.itinerary.days.find(d => parseISODate(d.date).getTime() === today.getTime());
}

function renderTodayTab() {
  const today = todayAtMidnight();
  const days = TripData.itinerary.days;
  const first = parseISODate(days[0].date);
  const last = parseISODate(days[days.length - 1].date);
  const activeDay = findTodayDay();

  let html = '<div id="geo-fact-mount"></div>';

  if (activeDay) {
    html += renderFilterRow();
    html += renderTypeFilterRow();
    html += renderDayCard(activeDay);
  } else if (today < first) {
    const diffDays = Math.round((first - today) / 86400000);
    html += `<div class="card">
      <h2>${diffDays} day${diffDays === 1 ? '' : 's'} to go! ✈️</h2>
      <p class="item-notes">Trip runs ${TripData.itinerary.trip.dateRange}. First stop: <strong>${days[0].city}</strong>.</p>
    </div>`;
    html += renderDayCard(days[0]);
  } else if (today > last) {
    html += `<div class="card"><h2>Hej då! 👋</h2><p class="item-notes">The trip has wrapped up. Thanks for the memories — tap Itinerary to relive any day.</p></div>`;
  } else {
    html += `<div class="card"><p class="empty-state">No itinerary day matches today's date exactly — check the Itinerary tab.</p></div>`;
  }

  document.getElementById('main-content').innerHTML = html;
  attachFilterHandlers(document.getElementById('main-content'));
  if (window.GeoFacts) window.GeoFacts.mount(document.getElementById('geo-fact-mount'));
}

function renderItineraryTab() {
  let html = renderFilterRow();
  html += renderTypeFilterRow();
  html += TripData.itinerary.days.map(d => renderDayCard(d, { filterHide: true })).join('');
  document.getElementById('main-content').innerHTML = html;
  attachFilterHandlers(document.getElementById('main-content'));
}

function renderMapTab() {
  const byCity = {};
  TripData.locations.forEach(loc => {
    byCity[loc.city] = byCity[loc.city] || [];
    byCity[loc.city].push(loc);
  });

  let html = `
    <div class="card">
      <h3 style="margin-top:0;">Saved Map</h3>
      <p class="item-notes">Embeds your Google My Map when you have signal. <a href="#" id="map-embed-link" class="link-btn">Set embed link</a></p>
      <div id="map-embed-mount"></div>
    </div>
  `;

  html += '<div class="section-title">Offline Pin List</div>';
  Object.keys(byCity).forEach(city => {
    html += `<div class="card"><h3 style="margin-top:0;">${city}</h3>`;
    byCity[city].forEach(loc => {
      html += `<div class="pin-list-item">
        <span>${TYPE_ICONS[loc.category] || '📍'} ${loc.name}</span>
        <a href="${mapsSearchUrl(loc)}" target="_blank" rel="noopener" class="link-btn">Open</a>
      </div>`;
    });
    html += `</div>`;
  });

  document.getElementById('main-content').innerHTML = html;

  const DEFAULT_MAP_EMBED = 'https://www.google.com/maps/d/embed?mid=1jlr1rl0KPuddThF-m4XZQC2AafPRbLs';
  const embedSrc = localStorage.getItem('mapEmbedSrc') || DEFAULT_MAP_EMBED;
  const mount = document.getElementById('map-embed-mount');
  if (embedSrc) {
    mount.innerHTML = `<iframe class="map-embed" src="${embedSrc}" loading="lazy"></iframe>`;
  }
  document.getElementById('map-embed-link').addEventListener('click', (e) => {
    e.preventDefault();
    const url = prompt('Paste your Google My Maps EMBED src URL (Menu → Share → Embed on my site → copy the src="..." value):', embedSrc || '');
    if (url) {
      localStorage.setItem('mapEmbedSrc', url);
      renderMapTab();
    }
  });
}

function renderWidgetsTab() {
  const reading = TripData.itinerary.readingList || [];
  const html = `
    <div class="card" id="currency-widget-mount"></div>
    <div class="card" id="weather-widget-mount"></div>
    <div class="card" id="fika-widget-mount"></div>
    <div class="card" id="election-widget-mount"></div>
    <div class="card" id="news-widget-mount"></div>
    <div class="section-title">Political Background Reading</div>
    <div class="card">
      ${reading.map(r => `<div class="reading-item"><a href="${r.url}" target="_blank" rel="noopener">${r.title}</a><div class="source">${r.source}</div></div>`).join('')}
    </div>
  `;
  document.getElementById('main-content').innerHTML = html;
  const safeMount = (fn, containerId) => {
    try { fn(document.getElementById(containerId)); }
    catch (e) {
      console.warn('Widget failed to mount:', containerId, e);
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = '<p class="empty-state">Couldn\'t load this widget.</p>';
    }
  };
  if (window.CurrencyWidget) safeMount(window.CurrencyWidget.mount, 'currency-widget-mount');
  if (window.LiveData) {
    safeMount(window.LiveData.mountWeather, 'weather-widget-mount');
  }
  if (window.FikaWidget) safeMount(window.FikaWidget.mount, 'fika-widget-mount');
  if (window.LiveData) {
    safeMount(window.LiveData.mountElection, 'election-widget-mount');
    safeMount(window.LiveData.mountNews, 'news-widget-mount');
  }
}

function renderInfoTab() {
  const trip = TripData.itinerary.trip;
  let html = `
    <div class="card">
      <h2 style="margin-top:0;">${trip.title}</h2>
      <p class="item-notes">${trip.dateRange}<br>${trip.route}</p>
    </div>
    <div class="section-title">About This App</div>
    <div class="card">
      <p class="item-notes">Install this to your home screen for the full offline experience — open the browser share/menu and choose "Add to Home Screen". Once installed, the itinerary, tickets, maps list, and history facts all work with no signal. Currency, weather, election polling and news need a connection to refresh, but show the last-known values offline.</p>
    </div>
    <div class="card">
      <p class="item-notes">This app remembers the passphrase on this device so it won't ask again. Tap below before handing your phone to someone else.</p>
      <button class="big-tab-toggle" id="lock-app-btn">🔒 Lock this app</button>
    </div>
  `;
  document.getElementById('main-content').innerHTML = html;
  const lockBtn = document.getElementById('lock-app-btn');
  if (lockBtn) lockBtn.addEventListener('click', () => window.CryptoGate.lock());
}

const TAB_RENDERERS = {
  today: renderTodayTab,
  itinerary: renderItineraryTab,
  map: renderMapTab,
  widgets: renderWidgetsTab,
  info: renderInfoTab
};

let activeTab = 'today';

function renderActiveTab() {
  TAB_RENDERERS[activeTab]();
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      currentFilter = 'all';
      currentTypeFilter = 'all';
      renderActiveTab();
      window.scrollTo(0, 0);
    });
  });
}

function updateCountdownBadge() {
  const today = todayAtMidnight();
  const days = TripData.itinerary.days;
  const first = parseISODate(days[0].date);
  const last = parseISODate(days[days.length - 1].date);
  const badge = document.getElementById('countdown-badge');
  const activeDay = findTodayDay();
  if (activeDay) {
    badge.textContent = `Day ${activeDay.day}/${days.length}`;
  } else if (today < first) {
    const diff = Math.round((first - today) / 86400000);
    badge.textContent = `T-${diff}`;
  } else if (today > last) {
    badge.textContent = 'Done ✓';
  } else {
    badge.textContent = '—';
  }
}

TripData.ready.then(() => {
  setupTabs();
  updateCountdownBadge();
  renderActiveTab();
}).catch(err => {
  document.getElementById('main-content').innerHTML = `<div class="card"><p>Could not load trip data: ${err.message}</p></div>`;
});
