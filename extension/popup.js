/**
 * TabStash v1.0 — Popup Controller
 * Pure vanilla JS. No dependencies.
 */

'use strict';

/* ============================================================
   Constants
   ============================================================ */

const MAX_FREE_SESSIONS = 5;
const STORAGE_KEY = 'tabstash_sessions';
const THEME_KEY = 'tabstash_theme';

const SESSION_COLORS = [
  { id: 'red',    hex: '#EF4444', label: 'Red'    },
  { id: 'orange', hex: '#F97316', label: 'Orange' },
  { id: 'yellow', hex: '#EAB308', label: 'Yellow' },
  { id: 'green',  hex: '#22C55E', label: 'Green'  },
  { id: 'blue',   hex: '#3B82F6', label: 'Blue'   },
  { id: 'purple', hex: '#8B5CF6', label: 'Purple' },
  { id: 'pink',   hex: '#EC4899', label: 'Pink'   },
  { id: 'gray',   hex: '#6B7280', label: 'Gray'   },
];

/* ============================================================
   State
   ============================================================ */

let sessions = [];
let currentSessionId = null;
let saveSelectedColor = 'blue';
let editSelectedColor = 'blue';
let importSelectedColor = 'green';
let dragState = null;

/* ============================================================
   DOM References
   ============================================================ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const views = {
  main:     $('#view-main'),
  save:     $('#view-save'),
  detail:   $('#view-detail'),
  edit:     $('#view-edit'),
  import:   $('#view-import'),
  settings: $('#view-settings'),
};

/* ============================================================
   Initialization
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  await loadTheme();
  await loadSessions();
  initColorPickers();
  bindEvents();
  renderSessionList();
});

/* ============================================================
   Theme
   ============================================================ */

async function loadTheme() {
  const result = await chrome.storage.local.get(THEME_KEY);
  const theme = result[THEME_KEY] || 'auto';
  applyTheme(theme);
  updateThemeButtons(theme);
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    // Auto — match system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
}

function updateThemeButtons(active) {
  $$('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === active);
  });
}

/* ============================================================
   Storage
   ============================================================ */

async function loadSessions() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  sessions = result[STORAGE_KEY] || [];
}

async function saveSessions() {
  await chrome.storage.local.set({ [STORAGE_KEY]: sessions });
}

/* ============================================================
   View Navigation
   ============================================================ */

function showView(name) {
  Object.values(views).forEach(v => v.classList.remove('active'));
  views[name].classList.add('active');
}

/* ============================================================
   Color Pickers
   ============================================================ */

function initColorPickers() {
  renderColorPicker($('#color-picker'), saveSelectedColor, (c) => { saveSelectedColor = c; });
  renderColorPicker($('#edit-color-picker'), editSelectedColor, (c) => { editSelectedColor = c; });
  renderColorPicker($('#import-color-picker'), importSelectedColor, (c) => { importSelectedColor = c; });
}

function renderColorPicker(container, selected, onChange) {
  container.innerHTML = '';
  SESSION_COLORS.forEach(color => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `color-option ${color.id === selected ? 'selected' : ''}`;
    el.style.backgroundColor = color.hex;
    el.title = color.label;
    el.dataset.colorId = color.id;
    el.addEventListener('click', () => {
      container.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      onChange(color.id);
    });
    container.appendChild(el);
  });
}

function getColorHex(id) {
  return (SESSION_COLORS.find(c => c.id === id) || SESSION_COLORS[4]).hex;
}

/* ============================================================
   Favicon Helper
   ============================================================ */

function getFaviconUrl(pageUrl) {
  try {
    const u = new URL(pageUrl);
    // Use Chrome's built-in favicon API (requires "favicon" permission in MV3)
    return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(u.href)}&size=32`;
  } catch {
    return null;
  }
}

function createFaviconImg(pageUrl) {
  const url = getFaviconUrl(pageUrl);
  if (!url) {
    const span = document.createElement('span');
    span.className = 'favicon-preview placeholder';
    span.textContent = '🌐';
    span.style.fontSize = '12px';
    return span;
  }
  const img = document.createElement('img');
  img.className = 'favicon-preview';
  img.src = url;
  img.alt = '';
  img.loading = 'lazy';
  img.onerror = () => { img.style.display = 'none'; };
  return img;
}

/* ============================================================
   Render: Session List (Main View)
   ============================================================ */

function renderSessionList(filter = '') {
  const list = $('#session-list');
  const empty = $('#empty-state');
  const counter = $('#session-counter');

  list.innerHTML = '';

  const query = filter.toLowerCase().trim();

  // Filter sessions and their tabs by query
  const filtered = sessions.map(session => {
    if (!query) return { session, matchingTabs: [] };
    const nameMatch = session.name.toLowerCase().includes(query);
    const matchingTabs = session.tabs.filter(t =>
      t.title.toLowerCase().includes(query) || t.url.toLowerCase().includes(query)
    );
    if (nameMatch || matchingTabs.length > 0) {
      return { session, matchingTabs };
    }
    return null;
  }).filter(Boolean);

  if (filtered.length === 0 && sessions.length === 0) {
    empty.classList.remove('hidden');
    counter.classList.add('hidden');
    return;
  }

  empty.classList.add('hidden');
  counter.classList.remove('hidden');

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state" style="padding:24px 16px;">
      <p class="empty-title">No matches found</p>
      <p class="empty-desc">Try a different search term.</p>
    </div>`;
  }

  filtered.forEach(({ session, matchingTabs }) => {
    const card = document.createElement('div');
    card.className = `session-card${matchingTabs.length > 0 && query ? ' search-highlight' : ''}`;
    card.style.setProperty('--session-color', getColorHex(session.color));
    card.dataset.sessionId = session.id;

    const tabCount = session.tabs.length;
    const previewTabs = session.tabs.slice(0, 8);
    const moreCount = tabCount - previewTabs.length;

    card.innerHTML = `
      <div class="session-card-header">
        <span class="color-dot" style="background:${getColorHex(session.color)}"></span>
        <span class="session-card-name">${escapeHtml(session.name)}</span>
        <span class="session-card-count">${tabCount} tab${tabCount !== 1 ? 's' : ''}</span>
        <div class="session-card-actions">
          <button class="icon-btn restore-btn" title="Restore in new window" data-action="restore-new">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="18" rx="2"/>
              <line x1="12" y1="9" x2="12" y2="15"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
            </svg>
          </button>
          <button class="icon-btn delete-btn" title="Delete session" data-action="delete">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="session-card-tabs-preview"></div>
    `;

    // Favicon previews
    const previewContainer = card.querySelector('.session-card-tabs-preview');
    previewTabs.forEach(tab => {
      previewContainer.appendChild(createFaviconImg(tab.url));
    });
    if (moreCount > 0) {
      const more = document.createElement('span');
      more.className = 'more-tabs-indicator';
      more.textContent = `+${moreCount}`;
      previewContainer.appendChild(more);
    }

    // Click card → detail view (but not if clicking actions)
    card.addEventListener('click', (e) => {
      if (e.target.closest('.session-card-actions')) return;
      openDetailView(session.id);
    });

    // Restore in new window
    card.querySelector('.restore-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      restoreSession(session.id, true);
    });

    // Delete
    card.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      confirmAction(
        `Delete "${escapeHtml(session.name)}"? This cannot be undone.`,
        () => deleteSession(session.id)
      );
    });

    list.appendChild(card);
  });

  // Update counter
  $('#counter-text').textContent = `${sessions.length}/${MAX_FREE_SESSIONS} sessions`;
  // Show/hide upgrade link
  $('#upgrade-link').style.display = sessions.length >= 3 ? '' : 'none';
}

/* ============================================================
   Render: Save View
   ============================================================ */

async function openSaveView() {
  if (sessions.length >= MAX_FREE_SESSIONS) {
    showToast(`Session limit reached (${MAX_FREE_SESSIONS}). Upgrade to Pro for unlimited sessions.`);
    return;
  }

  showView('save');

  // Reset form
  $('#session-name').value = '';
  renderColorPicker($('#color-picker'), saveSelectedColor, (c) => { saveSelectedColor = c; });
  $('#btn-confirm-save').disabled = true;
  $('#duplicate-warning').classList.add('hidden');

  // Load current tabs
  const tabs = await chrome.tabs.query({ currentWindow: true });
  renderSaveTabList(tabs);
  checkDuplicates(tabs);

  // Focus session name
  setTimeout(() => $('#session-name').focus(), 100);
}

function renderSaveTabList(tabs) {
  const list = $('#tab-list');
  list.innerHTML = '';

  tabs.forEach(tab => {
    const item = document.createElement('div');
    item.className = 'tab-item';

    const isDuplicate = isUrlDuplicate(tab.url);
    if (isDuplicate) item.classList.add('duplicate');

    const faviconUrl = getFaviconUrl(tab.url);
    const faviconHtml = faviconUrl
      ? `<img class="tab-item-favicon" src="${faviconUrl}" alt="" onerror="this.style.display='none'">`
      : `<span class="tab-item-favicon" style="display:flex;align-items:center;justify-content:center;font-size:12px">🌐</span>`;

    item.innerHTML = `
      <input type="checkbox" checked data-tab-id="${tab.id}" data-url="${escapeAttr(tab.url)}" data-title="${escapeAttr(tab.title || tab.url)}">
      ${faviconHtml}
      <div class="tab-item-info">
        <div class="tab-item-title">${escapeHtml(tab.title || tab.url)}</div>
        <div class="tab-item-url">${escapeHtml(truncateUrl(tab.url))}</div>
      </div>
      ${isDuplicate ? '<span class="duplicate-badge">DUP</span>' : ''}
    `;

    // Click row to toggle checkbox
    item.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const cb = item.querySelector('input[type="checkbox"]');
      cb.checked = !cb.checked;
      updateSaveButton();
    });

    item.querySelector('input').addEventListener('change', updateSaveButton);
    list.appendChild(item);
  });

  updateSaveButton();
}

function checkDuplicates(tabs) {
  const urls = tabs.map(t => normalizeUrl(t.url));
  const existingUrls = new Set();
  sessions.forEach(s => s.tabs.forEach(t => existingUrls.add(normalizeUrl(t.url))));

  const dupes = urls.filter(u => existingUrls.has(u));
  if (dupes.length > 0) {
    $('#duplicate-warning').classList.remove('hidden');
    $('#duplicate-text').textContent = `${dupes.length} tab${dupes.length > 1 ? 's are' : ' is'} already saved in other sessions.`;
  } else {
    $('#duplicate-warning').classList.add('hidden');
  }
}

function isUrlDuplicate(url) {
  const normalized = normalizeUrl(url);
  return sessions.some(s => s.tabs.some(t => normalizeUrl(t.url) === normalized));
}

function updateSaveButton() {
  const checked = $$('#tab-list input[type="checkbox"]:checked');
  const name = $('#session-name').value.trim();
  $('#btn-confirm-save').disabled = checked.length === 0 || name.length === 0;
}

async function confirmSave() {
  const name = $('#session-name').value.trim();
  if (!name) return;

  const checkedBoxes = $$('#tab-list input[type="checkbox"]:checked');
  if (checkedBoxes.length === 0) return;

  const tabs = Array.from(checkedBoxes).map(cb => ({
    url: cb.dataset.url,
    title: cb.dataset.title,
  }));

  const session = {
    id: generateId(),
    name,
    color: saveSelectedColor,
    tabs,
    createdAt: Date.now(),
    restoredAt: null,
  };

  sessions.unshift(session);
  await saveSessions();
  showView('main');
  renderSessionList();
  showToast(`Saved "${name}" with ${tabs.length} tab${tabs.length !== 1 ? 's' : ''}`);
}

/* ============================================================
   Render: Detail View
   ============================================================ */

function openDetailView(sessionId) {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return;

  currentSessionId = sessionId;
  showView('detail');

  $('#detail-color-dot').style.background = getColorHex(session.color);
  $('#detail-title').textContent = session.name;
  $('#detail-tab-count').textContent = `${session.tabs.length} tab${session.tabs.length !== 1 ? 's' : ''}`;

  renderDetailTabs(session);
  renderDetailMeta(session);
}

function renderDetailTabs(session) {
  const list = $('#detail-tab-list');
  list.innerHTML = '';

  session.tabs.forEach((tab, index) => {
    const item = document.createElement('div');
    item.className = 'detail-tab-item';
    item.draggable = true;
    item.dataset.index = index;

    const faviconUrl = getFaviconUrl(tab.url);
    const faviconHtml = faviconUrl
      ? `<img class="detail-tab-favicon" src="${faviconUrl}" alt="" onerror="this.textContent='🌐';this.style.fontSize='12px'">`
      : `<span class="detail-tab-favicon" style="display:flex;align-items:center;justify-content:center;font-size:12px">🌐</span>`;

    item.innerHTML = `
      <span class="drag-handle" title="Drag to reorder">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
          <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
          <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
        </svg>
      </span>
      ${faviconHtml}
      <div class="detail-tab-info">
        <div class="detail-tab-title">${escapeHtml(tab.title || tab.url)}</div>
        <div class="detail-tab-url">${escapeHtml(truncateUrl(tab.url))}</div>
      </div>
      <button class="detail-tab-delete" title="Remove tab">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    // Open tab on click (but not on drag handle or delete)
    item.querySelector('.detail-tab-info').addEventListener('click', () => {
      chrome.tabs.create({ url: tab.url, active: false });
    });
    item.querySelector('.detail-tab-info').style.cursor = 'pointer';

    // Delete tab
    item.querySelector('.detail-tab-delete').addEventListener('click', () => {
      deleteTabFromSession(session.id, index);
    });

    // Drag & drop
    item.addEventListener('dragstart', (e) => handleDragStart(e, index));
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('dragenter', handleDragEnter);
    item.addEventListener('dragleave', handleDragLeave);
    item.addEventListener('drop', (e) => handleDrop(e, session.id));
    item.addEventListener('dragend', handleDragEnd);

    list.appendChild(item);
  });
}

function renderDetailMeta(session) {
  const meta = $('#detail-meta');
  const created = new Date(session.createdAt).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
  const restored = session.restoredAt
    ? new Date(session.restoredAt).toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit'
      })
    : 'Never';

  meta.innerHTML = `
    <div class="detail-meta-row"><span>Saved:</span><span>${created}</span></div>
    <div class="detail-meta-row"><span>Last restored:</span><span>${restored}</span></div>
  `;
}

/* ============================================================
   Drag & Drop (Reorder Tabs in Session)
   ============================================================ */

function handleDragStart(e, index) {
  dragState = { fromIndex: index };
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(index));
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  e.preventDefault();
  const item = e.currentTarget;
  if (item.classList.contains('detail-tab-item')) {
    item.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

async function handleDrop(e, sessionId) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');

  if (!dragState) return;
  const fromIndex = dragState.fromIndex;
  const toIndex = parseInt(e.currentTarget.dataset.index, 10);

  if (fromIndex === toIndex) return;

  const session = sessions.find(s => s.id === sessionId);
  if (!session) return;

  // Reorder
  const [moved] = session.tabs.splice(fromIndex, 1);
  session.tabs.splice(toIndex, 0, moved);

  await saveSessions();
  renderDetailTabs(session);
}

function handleDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  $$('.detail-tab-item').forEach(el => el.classList.remove('drag-over'));
  dragState = null;
}

/* ============================================================
   Session Actions
   ============================================================ */

async function restoreSession(sessionId, newWindow) {
  const session = sessions.find(s => s.id === sessionId);
  if (!session || session.tabs.length === 0) return;

  const urls = session.tabs.map(t => t.url);

  if (newWindow) {
    await chrome.windows.create({ url: urls });
  } else {
    for (const url of urls) {
      await chrome.tabs.create({ url, active: false });
    }
  }

  // Update restoredAt
  session.restoredAt = Date.now();
  await saveSessions();

  showToast(`Restored "${session.name}" (${urls.length} tab${urls.length !== 1 ? 's' : ''})`);

  // Re-render if in detail view
  if (currentSessionId === sessionId && views.detail.classList.contains('active')) {
    renderDetailMeta(session);
  }
}

async function deleteSession(sessionId) {
  sessions = sessions.filter(s => s.id !== sessionId);
  await saveSessions();
  showView('main');
  renderSessionList();
  showToast('Session deleted');
}

async function deleteTabFromSession(sessionId, tabIndex) {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return;

  session.tabs.splice(tabIndex, 1);

  if (session.tabs.length === 0) {
    // Remove empty session
    sessions = sessions.filter(s => s.id !== sessionId);
    await saveSessions();
    showView('main');
    renderSessionList();
    showToast('Session removed (no tabs left)');
    return;
  }

  await saveSessions();
  openDetailView(sessionId); // Re-render
  showToast('Tab removed');
}

/* ============================================================
   Edit Session
   ============================================================ */

function openEditView() {
  const session = sessions.find(s => s.id === currentSessionId);
  if (!session) return;

  showView('edit');
  $('#edit-session-name').value = session.name;
  editSelectedColor = session.color;
  renderColorPicker($('#edit-color-picker'), editSelectedColor, (c) => { editSelectedColor = c; });
  setTimeout(() => $('#edit-session-name').focus(), 100);
}

async function confirmEdit() {
  const session = sessions.find(s => s.id === currentSessionId);
  if (!session) return;

  const name = $('#edit-session-name').value.trim();
  if (!name) return;

  session.name = name;
  session.color = editSelectedColor;
  await saveSessions();

  showToast('Session updated');
  openDetailView(currentSessionId);
}

/* ============================================================
   Import from OneTab
   ============================================================ */

function openImportView() {
  if (sessions.length >= MAX_FREE_SESSIONS) {
    showToast(`Session limit reached (${MAX_FREE_SESSIONS}). Upgrade to Pro for unlimited sessions.`);
    return;
  }

  showView('import');
  $('#import-name').value = 'Imported from OneTab';
  $('#import-text').value = '';
  $('#btn-confirm-import').disabled = true;
  importSelectedColor = 'green';
  renderColorPicker($('#import-color-picker'), importSelectedColor, (c) => { importSelectedColor = c; });
  setTimeout(() => $('#import-text').focus(), 100);
}

function parseOneTabExport(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const tabs = [];

  for (const line of lines) {
    // OneTab format: "URL | Title" or just "URL"
    const pipeIndex = line.indexOf(' | ');
    let url, title;

    if (pipeIndex > -1) {
      url = line.substring(0, pipeIndex).trim();
      title = line.substring(pipeIndex + 3).trim();
    } else {
      url = line.trim();
      title = url;
    }

    // Validate URL
    try {
      new URL(url);
      tabs.push({ url, title: title || url });
    } catch {
      // Skip invalid lines
    }
  }

  return tabs;
}

function updateImportButton() {
  const text = $('#import-text').value.trim();
  const name = $('#import-name').value.trim();
  const tabs = parseOneTabExport(text);
  $('#btn-confirm-import').disabled = tabs.length === 0 || !name;
}

async function confirmImport() {
  const name = $('#import-name').value.trim();
  const text = $('#import-text').value.trim();
  if (!name || !text) return;

  const tabs = parseOneTabExport(text);
  if (tabs.length === 0) {
    showToast('No valid URLs found in the pasted text.');
    return;
  }

  const session = {
    id: generateId(),
    name,
    color: importSelectedColor,
    tabs,
    createdAt: Date.now(),
    restoredAt: null,
  };

  sessions.unshift(session);
  await saveSessions();
  showView('main');
  renderSessionList();
  showToast(`Imported "${name}" with ${tabs.length} tab${tabs.length !== 1 ? 's' : ''}`);
}

/* ============================================================
   Settings View
   ============================================================ */

function openSettingsView() {
  showView('settings');
}

async function setTheme(theme) {
  await chrome.storage.local.set({ [THEME_KEY]: theme });
  applyTheme(theme);
  updateThemeButtons(theme);
}

function exportAllSessions() {
  const data = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    sessions: sessions.map(s => ({
      name: s.name,
      color: s.color,
      createdAt: new Date(s.createdAt).toISOString(),
      tabs: s.tabs.map(t => ({ url: t.url, title: t.title })),
    })),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tabstash-export-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Sessions exported');
}

/* ============================================================
   Confirm Dialog
   ============================================================ */

let confirmCallback = null;

function confirmAction(message, onConfirm) {
  const overlay = $('#confirm-overlay');
  $('#confirm-message').textContent = message;
  overlay.classList.remove('hidden');
  // Force reflow for transition
  void overlay.offsetHeight;
  overlay.classList.add('show');
  confirmCallback = onConfirm;
}

function closeConfirm() {
  const overlay = $('#confirm-overlay');
  overlay.classList.remove('show');
  setTimeout(() => overlay.classList.add('hidden'), 200);
  confirmCallback = null;
}

/* ============================================================
   Toast
   ============================================================ */

let toastTimer = null;

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  // Force reflow
  void toast.offsetHeight;
  toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 2500);
}

/* ============================================================
   Event Bindings
   ============================================================ */

function bindEvents() {
  // Main view
  $('#btn-save').addEventListener('click', openSaveView);
  $('#btn-import').addEventListener('click', openImportView);
  $('#btn-settings').addEventListener('click', openSettingsView);

  // Search
  const searchInput = $('#search-input');
  const searchClear = $('#search-clear');
  searchInput.addEventListener('input', () => {
    const val = searchInput.value;
    searchClear.classList.toggle('hidden', val.length === 0);
    renderSessionList(val);
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.add('hidden');
    renderSessionList();
    searchInput.focus();
  });

  // Upgrade link (no-op for now, just toast)
  $('#upgrade-link').addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Pro upgrade coming soon!');
  });

  // Save view
  $('#save-back').addEventListener('click', () => {
    showView('main');
    renderSessionList();
  });
  $('#session-name').addEventListener('input', updateSaveButton);
  $('#select-all').addEventListener('click', () => {
    $$('#tab-list input[type="checkbox"]').forEach(cb => { cb.checked = true; });
    updateSaveButton();
  });
  $('#select-none').addEventListener('click', () => {
    $$('#tab-list input[type="checkbox"]').forEach(cb => { cb.checked = false; });
    updateSaveButton();
  });
  $('#btn-confirm-save').addEventListener('click', confirmSave);

  // Detail view
  $('#detail-back').addEventListener('click', () => {
    showView('main');
    renderSessionList();
    currentSessionId = null;
  });
  $('#detail-edit').addEventListener('click', openEditView);
  $('#btn-restore-new').addEventListener('click', () => restoreSession(currentSessionId, true));
  $('#btn-restore-current').addEventListener('click', () => restoreSession(currentSessionId, false));

  // Edit view
  $('#edit-back').addEventListener('click', () => openDetailView(currentSessionId));
  $('#btn-confirm-edit').addEventListener('click', confirmEdit);

  // Import view
  $('#import-back').addEventListener('click', () => {
    showView('main');
    renderSessionList();
  });
  $('#import-text').addEventListener('input', updateImportButton);
  $('#import-name').addEventListener('input', updateImportButton);
  $('#btn-confirm-import').addEventListener('click', confirmImport);

  // Settings view
  $('#settings-back').addEventListener('click', () => {
    showView('main');
    renderSessionList();
  });
  $$('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => setTheme(btn.dataset.theme));
  });
  $('#btn-export-data').addEventListener('click', exportAllSessions);

  // Confirm dialog
  $('#confirm-cancel').addEventListener('click', closeConfirm);
  $('#confirm-ok').addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    closeConfirm();
  });
  $('#confirm-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeConfirm();
  });

  // Keyboard: Enter to save session name
  $('#session-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !$('#btn-confirm-save').disabled) confirmSave();
  });
  $('#edit-session-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmEdit();
  });

  // Keyboard: Escape goes back
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#confirm-overlay').classList.contains('hidden')) {
        closeConfirm();
        return;
      }
      if (views.save.classList.contains('active') ||
          views.import.classList.contains('active') ||
          views.settings.classList.contains('active')) {
        showView('main');
        renderSessionList();
      } else if (views.edit.classList.contains('active')) {
        openDetailView(currentSessionId);
      } else if (views.detail.classList.contains('active')) {
        showView('main');
        renderSessionList();
        currentSessionId = null;
      }
    }
  });
}

/* ============================================================
   Utility Functions
   ============================================================ */

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    // Remove trailing slash, hash, and normalize
    return u.origin + u.pathname.replace(/\/$/, '') + u.search;
  } catch {
    return url;
  }
}

function truncateUrl(url) {
  try {
    const u = new URL(url);
    let display = u.hostname + u.pathname;
    if (display.length > 60) display = display.substring(0, 57) + '…';
    return display;
  } catch {
    return url.length > 60 ? url.substring(0, 57) + '…' : url;
  }
}