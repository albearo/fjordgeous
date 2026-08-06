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
