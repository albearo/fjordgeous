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
      return `
        <div class="fika-entry" data-id="${c.id}">
          ${c.photo ? `<img class="fika-photo" src="${c.photo}" alt="" />` : ''}
          <div class="fika-entry-body">
            <div class="fika-entry-top">
              <strong>${c.pastry || 'Pastry'}</strong>
              <button class="fika-delete" data-id="${c.id}" title="Delete">✕</button>
            </div>
            <div class="fika-entry-cafe">${c.cafe || ''} · ${formatDate(c.ts)}</div>
            ${starRow(c.rating, false)}
            ${c.review ? `<p class="item-notes">${c.review}</p>` : ''}
          </div>
        </div>
      `;
    }

    function renderListAndExport() {
      const listMount = document.getElementById('fika-list-mount');
      listMount.innerHTML = checkins.length === 0
        ? '<p class="empty-state">No check-ins yet — first pastry, first entry!</p>'
        : checkins.slice().reverse().map(entryHtml).join('');
      listMount.querySelectorAll('.fika-delete').forEach(btn => {
        btn.addEventListener('click', () => {
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
        const cafe = document.getElementById('fika-cafe').value.trim();
        const pastry = document.getElementById('fika-pastry').value.trim();
        const review = document.getElementById('fika-review').value.trim();
        if (!cafe && !pastry) return;
        checkins.push({
          id: uid(),
          ts: Date.now(),
          cafe, pastry, review,
          rating: pendingRating,
          photo: pendingPhoto
        });
        saveCheckins(checkins);
        formOpen = false;
        pendingPhoto = null;
        pendingRating = 0;
        renderForm();
        document.getElementById('fika-toggle-btn').textContent = '+ Check in a fika';
        renderListAndExport();
      });
    }

    function renderShell() {
      container.innerHTML = `
        <div class="fact-bubble" style="margin-bottom:10px;">
          <img class="fact-mascot" src="assets/illustrations/cardamom-bun.png" alt="" />
          <div class="fact-speech">
            <p><strong>Cardi B says:</strong> found a good bun? Check it in! ☕🧁</p>
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
