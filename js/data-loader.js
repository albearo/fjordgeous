const TRIP_CITIES = {
  'Stockholm': { country: 'Sweden', lat: 59.3293, lng: 18.0686 },
  'Copenhagen': { country: 'Denmark', lat: 55.6761, lng: 12.5683 },
  'Oslo': { country: 'Norway', lat: 59.9139, lng: 10.7522 },
  'Flåm': { country: 'Norway', lat: 60.8633, lng: 7.1136 },
  'Gudvangen': { country: 'Norway' },
  'Voss': { country: 'Norway' },
  'Bergen': { country: 'Norway', lat: 60.3913, lng: 5.3221 }
};

function cityCountry(city) {
  const c = TRIP_CITIES[city];
  return c ? c.country : null;
}

const TripData = {
  itinerary: null,
  locations: null,
  facts: null,
  ready: null
};

TripData.ready = (async function loadData() {
  const bundle = await CryptoGate.getData();
  TripData.itinerary = bundle.itinerary;
  TripData.locations = bundle.locations.locations;
  TripData.locationsById = {};
  TripData.locations.forEach(loc => { TripData.locationsById[loc.id] = loc; });
  TripData.facts = bundle.facts;
  return TripData;
})();

function getLocation(id) {
  return TripData.locationsById ? TripData.locationsById[id] : null;
}

function getFacts(id) {
  return TripData.facts ? TripData.facts[id] : null;
}

function parseISODate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function todayAtMidnight() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
