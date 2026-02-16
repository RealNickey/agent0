// Agent0 New Tab Dashboard
// No external tracking — privacy-first

(function () {
  'use strict';

  // ===== Constants =====
  const DEFAULT_AGENT0_URL = 'http://localhost:3000';
  const STORAGE_KEYS = {
    CLOCK_FORMAT: 'clockFormat',
    THEME: 'theme',
    BACKGROUND: 'background',
    BLUR: 'blurIntensity',
    SHORTCUTS: 'shortcuts',
    AGENT0_URL: 'agent0Url',
  };

  const DEFAULT_SHORTCUTS = [
    { name: 'Agent0', url: 'http://localhost:3000', icon: '⚡' },
    { name: 'GitHub', url: 'https://github.com', icon: '' },
    { name: 'Gmail', url: 'https://mail.google.com', icon: '' },
    { name: 'YouTube', url: 'https://youtube.com', icon: '' },
    { name: 'Twitter', url: 'https://x.com', icon: '' },
  ];

  // ===== State =====
  let state = {
    clockFormat: '12',
    theme: 'dark',
    background: 'gradient-1',
    blurIntensity: 20,
    shortcuts: [...DEFAULT_SHORTCUTS],
    agent0Url: DEFAULT_AGENT0_URL,
  };

  let clockInterval = null;
  let editingShortcutIndex = -1; // -1 = adding new

  // ===== DOM refs =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ===== URL Validation =====
  function isValidUrl(str) {
    try {
      const url = new URL(str);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }

  function sanitizeText(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function getAgent0Url() {
    return state.agent0Url || DEFAULT_AGENT0_URL;
  }

  // ===== Clock =====
  function updateClock() {
    const now = new Date();
    const is24 = state.clockFormat === '24';

    let hours = now.getHours();
    let minutes = now.getMinutes();
    let suffix = '';

    if (!is24) {
      suffix = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12 || 12;
    }

    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}${suffix}`;
    const clockEl = $('#clock');
    if (clockEl) clockEl.textContent = timeStr;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    const dateStr = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    const dateEl = $('#date');
    if (dateEl) dateEl.textContent = dateStr;
  }

  function startClock() {
    updateClock();
    clockInterval = setInterval(updateClock, 1000);
  }

  // ===== Agent0 Navigation =====
  function openAgent0(prefillText) {
    const url = getAgent0Url();
    if (!isValidUrl(url)) return;

    if (prefillText) {
      // Store the prefill text so it can be picked up after navigation
      chrome.storage.local.set({
        agent0Prefill: {
          text: prefillText,
          timestamp: Date.now(),
        },
      }, () => {
        window.location.href = url;
      });
    } else {
      window.location.href = url;
    }
  }

  function openAgent0WithTool(toolMention) {
    openAgent0(toolMention);
  }

  // ===== Search =====
  function handleSearch(engine) {
    const input = $('#search-input');
    const query = (input?.value || '').trim();
    if (!query) {
      input?.focus();
      return;
    }

    if (engine === 'google') {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    } else {
      // Send to Agent0
      openAgent0(query);
    }
  }

  // ===== Shortcuts =====
  function getFaviconUrl(url) {
    try {
      const parsed = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`;
    } catch {
      return '';
    }
  }

  function renderShortcuts() {
    const grid = $('#shortcuts-grid');
    if (!grid) return;

    grid.innerHTML = '';

    state.shortcuts.forEach((shortcut, index) => {
      const tile = document.createElement('a');
      tile.className = 'shortcut-tile';
      tile.href = shortcut.url;
      tile.target = '_self';
      tile.rel = 'noopener';
      if (index === 0 && shortcut.url.includes('localhost:3000')) {
        tile.dataset.default = 'true';
      }

      const faviconContainer = document.createElement('div');
      faviconContainer.className = 'shortcut-favicon';

      if (shortcut.icon && shortcut.icon.length <= 2) {
        // Emoji icon
        faviconContainer.textContent = shortcut.icon;
      } else {
        const faviconUrl = getFaviconUrl(shortcut.url);
        if (faviconUrl) {
          const img = document.createElement('img');
          img.src = faviconUrl;
          img.alt = shortcut.name;
          img.loading = 'lazy';
          img.onerror = () => {
            img.remove();
            faviconContainer.textContent = shortcut.name.charAt(0).toUpperCase();
          };
          faviconContainer.appendChild(img);
        } else {
          faviconContainer.textContent = shortcut.name.charAt(0).toUpperCase();
        }
      }

      const name = document.createElement('span');
      name.className = 'shortcut-name';
      name.textContent = shortcut.name;

      // Remove button  
      const removeBtn = document.createElement('button');
      removeBtn.className = 'shortcut-remove';
      removeBtn.textContent = '✕';
      removeBtn.title = 'Remove';
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeShortcut(index);
      });

      tile.appendChild(removeBtn);
      tile.appendChild(faviconContainer);
      tile.appendChild(name);
      grid.appendChild(tile);
    });

    // Add shortcut button
    const addTile = document.createElement('button');
    addTile.className = 'shortcut-add-tile';
    addTile.innerHTML = '<span class="shortcut-add-icon">＋</span><span class="shortcut-add-label">Add</span>';
    addTile.addEventListener('click', () => openShortcutModal());
    grid.appendChild(addTile);
  }

  function removeShortcut(index) {
    // Don't remove the Agent0 default
    if (index === 0 && state.shortcuts[0]?.url?.includes('localhost:3000')) return;
    state.shortcuts.splice(index, 1);
    saveSettings();
    renderShortcuts();
  }

  function openShortcutModal(index) {
    editingShortcutIndex = typeof index === 'number' ? index : -1;
    const modal = $('#shortcut-modal');
    const title = $('#shortcut-modal-title');
    const nameInput = $('#shortcut-name');
    const urlInput = $('#shortcut-url');

    if (editingShortcutIndex >= 0) {
      title.textContent = 'Edit Shortcut';
      nameInput.value = state.shortcuts[editingShortcutIndex]?.name || '';
      urlInput.value = state.shortcuts[editingShortcutIndex]?.url || '';
    } else {
      title.textContent = 'Add Shortcut';
      nameInput.value = '';
      urlInput.value = 'https://';
    }

    modal.classList.remove('hidden');
    nameInput.focus();
  }

  function closeShortcutModal() {
    $('#shortcut-modal')?.classList.add('hidden');
    editingShortcutIndex = -1;
  }

  function saveShortcut() {
    const nameInput = $('#shortcut-name');
    const urlInput = $('#shortcut-url');
    const name = (nameInput?.value || '').trim();
    const url = (urlInput?.value || '').trim();

    if (!name) {
      nameInput?.focus();
      return;
    }
    if (!isValidUrl(url)) {
      urlInput?.focus();
      return;
    }

    if (editingShortcutIndex >= 0) {
      state.shortcuts[editingShortcutIndex] = { name, url, icon: '' };
    } else {
      state.shortcuts.push({ name, url, icon: '' });
    }

    saveSettings();
    renderShortcuts();
    closeShortcutModal();
  }

  // ===== Theme / Background =====
  function applyTheme() {
    document.body.classList.toggle('theme-light', state.theme === 'light');
  }

  function applyBackground() {
    // Remove all bg classes
    const bgClasses = ['bg-gradient-1', 'bg-gradient-2', 'bg-gradient-3', 'bg-gradient-4', 'bg-solid-dark', 'bg-solid-navy'];
    bgClasses.forEach((cls) => document.body.classList.remove(cls));
    document.body.classList.add(`bg-${state.background}`);
  }

  function applyBlur() {
    document.documentElement.style.setProperty('--glass-blur', `${state.blurIntensity}px`);
  }

  function applyAllVisuals() {
    applyTheme();
    applyBackground();
    applyBlur();
  }

  // ===== Settings Panel =====
  function openSettings() {
    const overlay = $('#settings-overlay');
    overlay?.classList.remove('hidden');

    // Sync UI state
    $$('[data-format]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.format === state.clockFormat);
    });
    $$('[data-theme]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.theme === state.theme);
    });
    $$('[data-bg]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.bg === state.background);
    });

    const blurSlider = $('#blur-slider');
    const blurValue = $('#blur-value');
    if (blurSlider) blurSlider.value = state.blurIntensity;
    if (blurValue) blurValue.textContent = `${state.blurIntensity}px`;

    const urlInput = $('#agent0-url-input');
    if (urlInput) urlInput.value = state.agent0Url;
  }

  function closeSettings() {
    $('#settings-overlay')?.classList.add('hidden');
  }

  // ===== Storage =====
  function saveSettings() {
    const data = {};
    data[STORAGE_KEYS.CLOCK_FORMAT] = state.clockFormat;
    data[STORAGE_KEYS.THEME] = state.theme;
    data[STORAGE_KEYS.BACKGROUND] = state.background;
    data[STORAGE_KEYS.BLUR] = state.blurIntensity;
    data[STORAGE_KEYS.SHORTCUTS] = state.shortcuts;
    data[STORAGE_KEYS.AGENT0_URL] = state.agent0Url;

    try {
      chrome.storage.sync.set(data);
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }

  function loadSettings(callback) {
    const keys = Object.values(STORAGE_KEYS);
    try {
      chrome.storage.sync.get(keys, (result) => {
        if (result[STORAGE_KEYS.CLOCK_FORMAT]) state.clockFormat = result[STORAGE_KEYS.CLOCK_FORMAT];
        if (result[STORAGE_KEYS.THEME]) state.theme = result[STORAGE_KEYS.THEME];
        if (result[STORAGE_KEYS.BACKGROUND]) state.background = result[STORAGE_KEYS.BACKGROUND];
        if (result[STORAGE_KEYS.BLUR] !== undefined) state.blurIntensity = result[STORAGE_KEYS.BLUR];
        if (result[STORAGE_KEYS.SHORTCUTS]) state.shortcuts = result[STORAGE_KEYS.SHORTCUTS];
        if (result[STORAGE_KEYS.AGENT0_URL]) state.agent0Url = result[STORAGE_KEYS.AGENT0_URL];

        // Ensure Agent0 is always first shortcut
        if (!state.shortcuts.length || !state.shortcuts[0]?.url?.includes('localhost:3000')) {
          state.shortcuts.unshift(DEFAULT_SHORTCUTS[0]);
        }

        callback?.();
      });
    } catch (e) {
      console.warn('Failed to load settings:', e);
      callback?.();
    }
  }

  // ===== Event Binding =====
  function bindEvents() {
    // Open Agent0 buttons
    $('#open-agent0-btn')?.addEventListener('click', () => openAgent0());
    $('#promo-open-agent0')?.addEventListener('click', () => openAgent0());

    // Settings
    $('#settings-btn')?.addEventListener('click', openSettings);
    $('#close-settings')?.addEventListener('click', closeSettings);
    $('#settings-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeSettings();
    });

    // Clock format toggles
    $$('[data-format]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.clockFormat = btn.dataset.format;
        $$('[data-format]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        updateClock();
        saveSettings();
      });
    });

    // Theme toggles
    $$('[data-theme]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.theme = btn.dataset.theme;
        $$('[data-theme]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        applyTheme();
        applyBackground(); // Re-apply for light theme gradient variants
        saveSettings();
      });
    });

    // Background options
    $$('[data-bg]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.background = btn.dataset.bg;
        $$('[data-bg]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        applyBackground();
        saveSettings();
      });
    });

    // Blur slider
    const blurSlider = $('#blur-slider');
    blurSlider?.addEventListener('input', () => {
      state.blurIntensity = parseInt(blurSlider.value, 10);
      const blurValue = $('#blur-value');
      if (blurValue) blurValue.textContent = `${state.blurIntensity}px`;
      applyBlur();
      saveSettings();
    });

    // Agent0 URL input
    const urlInput = $('#agent0-url-input');
    urlInput?.addEventListener('change', () => {
      const val = urlInput.value.trim();
      if (isValidUrl(val)) {
        state.agent0Url = val;
        saveSettings();
      } else {
        urlInput.value = state.agent0Url;
      }
    });

    // Search
    $('#search-agent0')?.addEventListener('click', () => handleSearch('agent0'));
    $('#search-google')?.addEventListener('click', () => handleSearch('google'));
    $('#search-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch('agent0');
      }
    });

    // Tool tiles
    $$('.tool-tile').forEach((tile) => {
      tile.addEventListener('click', () => {
        const tool = tile.dataset.tool;
        if (tool) openAgent0WithTool(tool);
      });
    });

    // Shortcut modal
    $('#add-shortcut-btn')?.addEventListener('click', () => openShortcutModal());
    $('#close-shortcut-modal')?.addEventListener('click', closeShortcutModal);
    $('#cancel-shortcut')?.addEventListener('click', closeShortcutModal);
    $('#save-shortcut')?.addEventListener('click', saveShortcut);
    $('#shortcut-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeShortcutModal();
    });

    // Enter to save shortcut
    $('#shortcut-url')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveShortcut();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Escape closes modals
      if (e.key === 'Escape') {
        if (!$('#shortcut-modal')?.classList.contains('hidden')) {
          closeShortcutModal();
        } else if (!$('#settings-overlay')?.classList.contains('hidden')) {
          closeSettings();
        }
      }
    });
  }

  // ===== Init =====
  function init() {
    loadSettings(() => {
      applyAllVisuals();
      startClock();
      renderShortcuts();
      bindEvents();
    });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
