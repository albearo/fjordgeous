const CryptoGate = (function () {
  const STORAGE_KEY = 'unlockedBundleV2';

  function b64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function loadCache() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { return null; }
  }

  function saveCache(version, passphrase, data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version, passphrase, data }));
  }

  async function deriveKey(passphrase, salt, iterations) {
    const baseKey = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
  }

  async function tryDecrypt(passphrase, encBundle) {
    const salt = b64ToBytes(encBundle.salt);
    const iv = b64ToBytes(encBundle.iv);
    const ciphertext = b64ToBytes(encBundle.ciphertext);
    const key = await deriveKey(passphrase, salt, encBundle.iterations);
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(plainBuf));
  }

  function showLockScreen(onSubmit) {
    const overlay = document.createElement('div');
    overlay.id = 'lock-screen';
    overlay.innerHTML = `
      <div class="lock-card">
        <div class="lock-emoji">🔒</div>
        <h2>Fjordgeous</h2>
        <p>Enter the trip passphrase</p>
        <input type="password" id="lock-input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" />
        <button id="lock-submit" class="lock-submit-btn">Unlock</button>
        <div id="lock-error" class="lock-error"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#lock-input');
    const btn = overlay.querySelector('#lock-submit');
    const errorEl = overlay.querySelector('#lock-error');
    input.focus();

    function submit() {
      if (!input.value) return;
      btn.disabled = true;
      errorEl.textContent = '';
      onSubmit(input.value).then((ok) => {
        if (ok) {
          overlay.remove();
        } else {
          errorEl.textContent = 'Incorrect passphrase — try again.';
          input.value = '';
          input.focus();
          btn.disabled = false;
        }
      });
    }
    btn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  }

  function getData() {
    return new Promise((resolve, reject) => {
      const cache = loadCache();

      fetch('data/bundle.enc.json').then(r => r.json()).then(async (encBundle) => {
        // Same content we already have decrypted on this device — use it, no prompt.
        if (cache && cache.version === encBundle.version) {
          resolve(cache.data);
          return;
        }

        // Content changed since last unlock. If we still have the passphrase
        // cached on this device, re-decrypt silently — no need to re-prompt.
        if (cache && cache.passphrase) {
          try {
            const data = await tryDecrypt(cache.passphrase, encBundle);
            saveCache(encBundle.version, cache.passphrase, data);
            resolve(data);
            return;
          } catch (e) { /* cached passphrase no longer works, fall through to prompt */ }
        }

        // No usable cache at all — ask for the passphrase.
        showLockScreen(async (passphrase) => {
          try {
            const data = await tryDecrypt(passphrase, encBundle);
            saveCache(encBundle.version, passphrase, data);
            resolve(data);
            return true;
          } catch (e) {
            return false;
          }
        });
      }).catch((err) => {
        // Offline and nothing cached yet — nothing we can do.
        if (cache) { resolve(cache.data); return; }
        reject(err);
      });
    });
  }

  function lock() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }

  return { getData, lock };
})();

window.CryptoGate = CryptoGate;
