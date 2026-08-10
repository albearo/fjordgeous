const FikaWidget = (function () {
  const STORAGE_KEY = 'fikaCheckins';
  const MAX_PHOTO_DIMENSION = 900;
  const JPEG_QUALITY = 0.72;

  function loadCheckins() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { return []; }
  }
  function saveCheckins(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function formatDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function resizePhoto(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => { img.src = reader.result; };
      reader.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > MAX_PHOTO_DIMENSION) {
          height = Math.round(height * (MAX_PHOTO_DIMENSION / width));
          width = MAX_PHOTO_DIMENSION;
        } else if (height > MAX_PHOTO_DIMENSION) {
          width = Math.round(width * (MAX_PHOTO_DIMENSION / height));
          height = MAX_PHOTO_DIMENSION;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      img.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function currentCityGuess() {
    try {
      const day = typeof findTodayDay === 'function' ? findTodayDay() : null;
      return day ? day.city : '';
    } catch (e) { return ''; }
  }

  const QUIPS_GENERAL = [
    'Got buns, hon?',
    'I knead the deets!',
    'Fika or fik-meh?',
    'Cardamom? More like cardaYUM!',
    "Hope this one wasn't crumby!",
    'Upper crust or totally crumby?',
    'Did it rise to the occasion?',
    'Dough not pastry gatekeep!',
    'Espresso yourself, how was it?',
    'You brew you!',
    "Let's roll!",
    "Let's get this bread, brø.",
    'Be honest, is Cinnabon better?',
    'Did you lika the fika?',
    "Don't sugarcoat it… unless it's sugarcoated!",
    'So? Was it fikanomenal?',
    'I hope it was bun-derful!',
    'Bready to review?',
    'Scandi-map-ia for a fika!'
  ];
  const QUIPS_BY_COUNTRY = {
    'Sweden': ['Swede success or a total flop?'],
    'Denmark': ['Hygge success or hygge letdown?', 'Did you Copen-happen to love it?'],
    'Norway': ["There's Norway you don't have an opinion!"]
  };
  const QUIPS_BERGEN = ['Did it leave you Bergen for more?!'];

  function randomQuip() {
    const city = currentCityGuess();
    const country = cityCountry(city);
    let pool = QUIPS_GENERAL.slice();
    if (country && QUIPS_BY_COUNTRY[country]) pool = pool.concat(QUIPS_BY_COUNTRY[country]);
    if (city === 'Bergen') pool = pool.concat(QUIPS_BERGEN);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function starRow(rating, interactive) {
    let html = `<div class="star-row${interactive ? ' star-row-input' : ''}" data-rating="${rating}">`;
    for (let i = 1; i <= 5; i++) {
      html += `<span class="star${i <= rating ? ' star-filled' : ''}" data-star="${i}">★</span>`;
    }
    html += `</div>`;
    return html;
  }

  function mount(container) {
    let checkins = loadCheckins();
    let formOpen = false;
    let pendingPhoto = null;
    let pendingRating = 0;

    function entryHtml(c) {
      const summaryText = [c.cafe, c.city].filter(Boolean).join(', ') || 'Unnamed fika';
      return `
        <details class="fika-entry" data-id="${c.id}">
          <summary class="fika-entry-summary">
            <span class="fika-entry-summary-text">${summaryText}</span>
            <button class="fika-delete" data-id="${c.id}" title="Delete">✕</button>
          </summary>
          <div class="fika-entry-body">
            ${c.photo ? `<img class="fika-photo" src="${c.photo}" alt="" />` : ''}
            <div class="fika-entry-detail">
              <strong>${c.pastry || 'Pastry'}</strong>
              <div class="fika-entry-cafe">${summaryText} · ${formatDate(c.ts)}</div>
              ${starRow(c.rating, false)}
              ${c.review ? `<p class="item-notes">${c.review}</p>` : ''}
            </div>
          </div>
        </details>
      `;
    }

    function renderListAndExport() {
      const listMount = document.getElementById('fika-list-mount');
      listMount.innerHTML = checkins.length === 0
        ? '<p class="empty-state">No check-ins yet — first pastry, first entry!</p>'
        : checkins.slice().reverse().map(entryHtml).join('');
      listMount.querySelectorAll('.fika-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          checkins = checkins.filter(c => c.id !== btn.dataset.id);
          saveCheckins(checkins);
          renderListAndExport();
        });
      });

      const exportMount = document.getElementById('fika-export-mount');
      exportMount.innerHTML = checkins.length > 0
        ? `<div class="item-links" style="margin-top:10px;"><a href="#" id="fika-export-link">⬇️ Export all check-ins (for after the trip)</a></div>`
        : '';
      const exportLink = document.getElementById('fika-export-link');
      if (exportLink) {
        exportLink.addEventListener('click', (e) => { e.preventDefault(); exportAll(); });
      }
    }

    function updatePhotoRow() {
      const row = document.getElementById('fika-photo-row');
      if (!row) return;
      row.innerHTML = `
        <label class="link-btn" style="cursor:pointer;">
          📷 ${pendingPhoto ? 'Change photo' : 'Add photo'}
          <input type="file" accept="image/*" capture="environment" id="fika-photo-input" style="display:none;" />
        </label>
        ${pendingPhoto ? `<img class="fika-photo-preview" src="${pendingPhoto}" alt="" />` : ''}
      `;
      document.getElementById('fika-photo-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        pendingPhoto = await resizePhoto(file);
        updatePhotoRow();
      });
    }

    function renderForm() {
      const formMount = document.getElementById('fika-form-mount');
      if (!formOpen) { formMount.innerHTML = ''; return; }
      formMount.innerHTML = `
        <div class="fika-form">
          <input type="text" id="fika-cafe" placeholder="Cafe / place" />
          <input type="text" id="fika-city" placeholder="City" value="${currentCityGuess()}" />
          <input type="text" id="fika-pastry" placeholder="What did you eat?" />
          <div class="star-row star-row-input" id="fika-star-row" data-rating="0">
            ${[1, 2, 3, 4, 5].map(i => `<span class="star" data-star="${i}">★</span>`).join('')}
          </div>
          <textarea id="fika-review" placeholder="How was it?" rows="2"></textarea>
          <div class="fika-photo-row" id="fika-photo-row"></div>
          <button class="lock-submit-btn" id="fika-save-btn">Save check-in</button>
        </div>
      `;
      updatePhotoRow();

      document.getElementById('fika-star-row').addEventListener('click', (e) => {
        const star = e.target.closest('.star');
        if (!star) return;
        pendingRating = parseInt(star.dataset.star, 10);
        document.querySelectorAll('#fika-star-row .star').forEach(s => {
          s.classList.toggle('star-filled', parseInt(s.dataset.star, 10) <= pendingRating);
        });
      });

      document.getElementById('fika-save-btn').addEventListener('click', () => {
        const cafeEl = document.getElementById('fika-cafe');
        const pastryEl = document.getElementById('fika-pastry');
        const reviewEl = document.getElementById('fika-review');
        const cityEl = document.getElementById('fika-city');
        const cafe = cafeEl.value.trim();
        const city = cityEl.value.trim();
        const pastry = pastryEl.value.trim();
        const review = reviewEl.value.trim();
        if (!cafe && !pastry) return;
        checkins.push({
          id: uid(),
          ts: Date.now(),
          cafe, city, pastry, review,
          rating: pendingRating,
          photo: pendingPhoto
        });
        saveCheckins(checkins);

        // Keep the form open (and city filled in) so a multi-stop fika
        // crawl doesn't require re-opening the form for every entry.
        cafeEl.value = '';
        pastryEl.value = '';
        reviewEl.value = '';
        pendingPhoto = null;
        pendingRating = 0;
        updatePhotoRow();
        document.querySelectorAll('#fika-star-row .star').forEach(s => s.classList.remove('star-filled'));

        const saveBtn = document.getElementById('fika-save-btn');
        saveBtn.textContent = 'Saved ✓';
        setTimeout(() => { if (saveBtn) saveBtn.textContent = 'Save check-in'; }, 1200);

        renderListAndExport();
      });
    }

    function renderShell() {
      container.innerHTML = `
        <h3 style="margin-top:0;">☕ Fika Critika</h3>
        <div class="fact-bubble" style="margin-bottom:10px;">
          <img class="fact-mascot" src="assets/illustrations/cardamom-bun.png" alt="" />
          <div class="fact-speech">
            <p>${randomQuip()}</p>
          </div>
        </div>
        <button class="big-tab-toggle" id="fika-toggle-btn">+ Check in a fika</button>
        <div id="fika-form-mount"></div>
        <div id="fika-list-mount"></div>
        <div id="fika-export-mount"></div>
      `;

      document.getElementById('fika-toggle-btn').addEventListener('click', (e) => {
        formOpen = !formOpen;
        if (!formOpen) { pendingPhoto = null; pendingRating = 0; }
        e.target.textContent = formOpen ? '– Close' : '+ Check in a fika';
        renderForm();
      });

      renderListAndExport();
    }

    renderShell();
  }

  function exportAll() {
    const checkins = loadCheckins();
    const blob = new Blob([JSON.stringify(checkins, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fika-checkins.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return { mount, exportAll };
})();

window.FikaWidget = FikaWidget;
