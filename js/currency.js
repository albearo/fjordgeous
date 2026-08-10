const CurrencyWidget = (function () {
  const CACHE_KEY = 'currencyRatesCache';
  const CURRENCIES = { SEK: 'Swedish krona', DKK: 'Danish krone', NOK: 'Norwegian krone' };
  const TIPPING_NOTES = {
    SEK: "🇸🇪 Tipping isn't expected in Sweden — service is included. Rounding up or 5–10% for great service is a nice touch, not a requirement.",
    DKK: "🇩🇰 Service is included by law in Denmark. Tipping isn't expected, though rounding up is common for good service.",
    NOK: "🇳🇴 Tipping isn't customary in Norway — menu prices already reflect fair wages. A round-up or 5–10% for excellent service is appreciated but optional."
  };

  function loadCache() {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY)) || null;
    } catch (e) {
      return null;
    }
  }

  function saveCache(rates) {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, fetchedAt: Date.now() }));
  }

  async function fetchRates() {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error('Rate fetch failed');
    const data = await res.json();
    if (data.result !== 'success') throw new Error('Rate fetch unsuccessful');
    const rates = { SEK: data.rates.SEK, DKK: data.rates.DKK, NOK: data.rates.NOK };
    saveCache(rates);
    return rates;
  }

  function formatAge(ts) {
    const mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return `${Math.round(hrs / 24)} day(s) ago`;
  }

  function mount(container) {
    let rates = null;
    let fetchedAt = null;
    const cache = loadCache();
    if (cache) { rates = cache.rates; fetchedAt = cache.fetchedAt; }

    container.innerHTML = `
      <h3 style="margin-top:0;">💱 Currency Converter</h3>
      <div class="widget-row">
        <input type="number" id="cc-amount" placeholder="Amount" value="100" min="0" inputmode="decimal">
        <select id="cc-currency">
          ${Object.keys(CURRENCIES).map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <span>→ USD</span>
      </div>
      <div class="currency-result" id="cc-result">—</div>
      <div class="stale-note" id="cc-stale">Loading rates…</div>
      <div class="item-notes" id="cc-tip"></div>
    `;

    const amountEl = container.querySelector('#cc-amount');
    const currencyEl = container.querySelector('#cc-currency');
    const resultEl = container.querySelector('#cc-result');
    const staleEl = container.querySelector('#cc-stale');
    const tipEl = container.querySelector('#cc-tip');

    function recompute() {
      tipEl.textContent = TIPPING_NOTES[currencyEl.value] || '';
      if (!rates) {
        resultEl.textContent = '—';
        return;
      }
      const amount = parseFloat(amountEl.value) || 0;
      const cur = currencyEl.value;
      const usd = amount / rates[cur];
      resultEl.textContent = `$${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      staleEl.textContent = fetchedAt
        ? `Rates as of ${formatAge(fetchedAt)} (1 USD ≈ ${rates[cur].toFixed(2)} ${cur})`
        : '';
    }

    amountEl.addEventListener('input', recompute);
    currencyEl.addEventListener('change', recompute);

    recompute();

    fetchRates()
      .then(r => { rates = r; fetchedAt = Date.now(); recompute(); })
      .catch(() => {
        if (!rates) staleEl.textContent = 'No connection and no cached rates yet.';
        else recompute();
      });
  }

  return { mount };
})();

window.CurrencyWidget = CurrencyWidget;
