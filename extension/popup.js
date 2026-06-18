/**
 * TabStash v1.1.0 — Popup Controller
 * Pure vanilla JS. No dependencies.
 */

'use strict';

/* ============================================================
   Constants
   ============================================================ */

const MAX_FREE_SESSIONS = 5;
const STORAGE_KEY = 'tabstash_sessions';
const FOLDERS_KEY = 'tabstash_folders';
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
let folders = [];
let currentSessionId = null;
let saveSelectedColor = 'blue';
let editSelectedColor = 'blue';
let importSelectedColor = 'green';
let dragState = null;
let folderMenuSessionId = null;

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
  folders:  $('#view-folders'),
};

/* ============================================================
   Initialization
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  await loadTheme();
  await loadSessions();
  await loadFolders();
  initColorPickers();
  bindEvents();
  renderSessionList();
  await checkAutoOpenSave();
});

async function checkAutoOpenSave() {
  try {
    const result = await chrome.storage.local.get('tabstash_open_save');
    if (result.tabstash_open_save) {
      await chrome.storage.local.remove('tabstash_open_save');
      openSaveView();
    }
  } catch (e) { /* ignore */ }
}

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

async function loadFolders() {
  const result = await chrome.storage.local.get(FOLDERS_KEY);
  folders = result[FOLDERS_KEY] || [];
}

async function saveFolders() {
  await chrome.storage.local.set({ [FOLDERS_KEY]: folders });
}

/* ============================================================
   View Navigation
   ============================================================ */

function showView(name) {
  Object.values(views).forEach(v => v.classList.remove('active'));
  views[name].classList.add('active');
}

/* ============================================================
   Folder Helpers
   ============================================================ */

function getFolderName(folderId) {
  if (!folderId) return null;
  const folder = folders.find(f => f.id === folderId);
  return folder ? folder.name : null;
}

function populateFolderSelect(selectEl, selectedFolderId) {
  selectEl.innerHTML = '<option value="">None (Uncategorized)</option>';
  folders.forEach(folder => {
    const opt = document.createElement('option');
    opt.value = folder.id;
    opt.textContent = folder.name;
    if (folder.id === selectedFolderId) opt.selected = true;
    selectEl.appendChild(opt);
  });
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
   Render: Session List (Main View) — with Folders
   ============================================================ */

function renderSessionList(filter) {
  if (filter === undefined) filter = '';
  const list = $('#session-list');
  const empty = $('#empty-state');
  const counter = $('#session-counter');

  list.innerHTML = '';

  const query = filter.toLowerCase().trim();

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
    list.innerHTML = '<div class="empty-state" style="padding:24px 16px;">' +
      '<p class="empty-title">No matches found</p>' +
      '<p class="empty-desc">Try a different search term.</p></div>';
    updateCounter();
    return;
  }

  // Group by folder
  const uncategorized = [];
  const folderGroups = new Map();

  filtered.forEach(item => {
    const fid = item.session.folderId || '';
    if (!fid) {
      uncategorized.push(item);
    } else {
      if (!folderGroups.has(fid)) folderGroups.set(fid, []);
      folderGroups.get(fid).push(item);
    }
  });

  // Render uncategorized sessions first
  uncategorized.forEach(item => {
    list.appendChild(createSessionCard(item.session, item.matchingTabs, query));
  });

  // Render each folder group
  folders.forEach(folder => {
    const items = folderGroups.get(folder.id);
    if (!items || items.length === 0) return;

    const group = document.createElement('div');
    group.className = 'folder-group';
    group.dataset.folderId = folder.id;

    const header = document.createElement('div');
    header.className = 'folder-group-header';
    header.innerHTML =
      '<svg class="folder-group-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>' +
      '</svg>' +
      '<span class="folder-group-name">' + escapeHtml(folder.name) + '</span>' +
      '<span class="folder-group-count">' + items.length + '</span>' +
      '<svg class="folder-group-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<polyline points="6 9 12 15 18 9"/>' +
      '</svg>';

    const body = document.createElement('div');
    body.className = 'folder-group-body';
    items.forEach(item => {
      body.appendChild(createSessionCard(item.session, item.matchingTabs, query));
    });

    header.addEventListener('click', () => {
      group.classList.toggle('collapsed');
    });

    group.appendChild(header);
    group.appendChild(body);
    list.appendChild(group);
  });

  updateCounter();
}

function updateCounter() {
  $('#counter-text').textContent = sessions.length + '/' + MAX_FREE_SESSIONS + ' sessions';
  $('#upgrade-link').style.display = sessions.length >= 3 ? '' : 'none';
}

function createSessionCard(session, matchingTabs, query) {
  const card = document.createElement('div');
  card.className = 'session-card' + (matchingTabs.length > 0 && query ? ' search-highlight' : '');
  card.style.setProperty('--session-color', getColorHex(session.color));
  card.dataset.sessionId = session.id;

  const tabCount = session.tabs.length;
  const previewTabs = session.tabs.slice(0, 8);
  const moreCount = tabCount - previewTabs.length;

  // Build header
  const headerDiv = document.createElement('div');
  headerDiv.className = 'session-card-header';

  const dot = document.createElement('span');
  dot.className = 'color-dot';
  dot.style.background = getColorHex(session.color);

  const nameSpan = document.createElement('span');
  nameSpan.className = 'session-card-name';
  nameSpan.textContent = session.name;

  const countSpan = document.createElement('span');
  countSpan.className = 'session-card-count';
  countSpan.textContent = tabCount + ' tab' + (tabCount !== 1 ? 's' : '');

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'session-card-actions';

  // Move to folder button
  const folderBtn = document.createElement('button');
  folderBtn.className = 'icon-btn folder-move-btn';
  folderBtn.title = 'Move to folder';
  folderBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';

  // Restore button
  const restoreBtn = document.createElement('button');
  restoreBtn.className = 'icon-btn restore-btn';
  restoreBtn.title = 'Restore in new window';
  restoreBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="12" y1="9" x2="12" y2="15"/><line x1="9" y1="12" x2="15" y2="12"/></svg>';

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'icon-btn delete-btn';
  deleteBtn.title = 'Delete session';
  deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';

  actionsDiv.appendChild(folderBtn);
  actionsDiv.appendChild(restoreBtn);
  actionsDiv.appendChild(deleteBtn);

  headerDiv.appendChild(dot);
  headerDiv.appendChild(nameSpan);
  headerDiv.appendChild(countSpan);
  headerDiv.appendChild(actionsDiv);

  // Tab previews
  const previewDiv = document.createElement('div');
  previewDiv.className = 'session-card-tabs-preview';
  previewTabs.forEach(tab => {
    previewDiv.appendChild(createFaviconImg(tab.url));
  });
  if (moreCount > 0) {
    const more = document.createElement('span');
    more.className = 'more-tabs-indicator';
    more.textContent = '+' + moreCount;
    previewDiv.appendChild(more);
  }

  card.appendChild(headerDiv);
  card.appendChild(previewDiv);

  // Events
  card.addEventListener('click', (e) => {
    if (e.target.closest('.session-card-actions')) return;
    openDetailView(session.id);
  });

  folderBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openFolderMenu(session.id, folderBtn);
  });

  restoreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    restoreSession(session.id, true);
  });

  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    confirmAction(
      'Delete "' + escapeHtml(session.name) + '"? This cannot be undone.',
      () => deleteSession(session.id)
    );
  });

  return card;
}

/* ============================================================
   Folder Context Menu (Move to Folder)
   ============================================================ */

function openFolderMenu(sessionId, anchorEl) {
  folderMenuSessionId = sessionId;
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return;

  const overlay = $('#folder-menu-overlay');
  const menu = $('#folder-menu');
  const itemsContainer = $('#folder-menu-items');
  itemsContainer.innerHTML = '';

  // Uncategorized option
  const uncatBtn = document.createElement('button');
  uncatBtn.className = 'folder-menu-item' + (!session.folderId ? ' active' : '');
  uncatBtn.textContent = 'Uncategorized';
  uncatBtn.addEventListener('click', () => moveToFolder(sessionId, ''));
  itemsContainer.appendChild(uncatBtn);

  // Folder options
  folders.forEach(folder => {
    const btn = document.createElement('button');
    btn.className = 'folder-menu-item' + (session.folderId === folder.id ? ' active' : '');
    btn.textContent = folder.name;
    btn.addEventListener('click', () => moveToFolder(sessionId, folder.id));
    itemsContainer.appendChild(btn);
  });

  overlay.classList.remove('hidden');

  const rect = anchorEl.getBoundingClientRect();
  menu.style.top = Math.min(rect.bottom + 4, 500) + 'px';
  menu.style.right = Math.max(document.body.clientWidth - rect.right, 8) + 'px';
  menu.style.left = 'auto';
}

function closeFolderMenu() {
  $('#folder-menu-overlay').classList.add('hidden');
  folderMenuSessionId = null;
}

async function moveToFolder(sessionId, folderId) {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return;

  session.folderId = folderId || '';
  await saveSessions();
  closeFolderMenu();
  renderSessionList($('#search-input').value);

  const folderName = getFolderName(folderId);
  showToast(folderName ? 'Moved to "' + folderName + '"' : 'Moved to Uncategorized');
}

/* ============================================================
   Render: Save View
   ============================================================ */

async function openSaveView() {
  if (sessions.length >= MAX_FREE_SESSIONS) {
    showToast('Session limit reached (' + MAX_FREE_SESSIONS + '). Upgrade to Pro for unlimited sessions.');
    return;
  }

  showView('save');

  $('#session-name').value = '';
  renderColorPicker($('#color-picker'), saveSelectedColor, (c) => { saveSelectedColor = c; });
  populateFolderSelect($('#save-folder-select'), '');
  $('#btn-confirm-save').disabled = true;
  $('#duplicate-warning').classList.add('hidden');

  const tabs = await chrome.tabs.query({ currentWindow: true });
  renderSaveTabList(tabs);
  checkDuplicates(tabs);

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
      ? '<img class="tab-item-favicon" src="' + faviconUrl + '" alt="" onerror="this.style.display=\'none\'">'
      : '<span class="tab-item-favicon" style="display:flex;align-items:center;justify-content:center;font-size:12px">🌐</span>';

    item.innerHTML =
      '<input type="checkbox" checked data-tab-id="' + tab.id + '" data-url="' + escapeAttr(tab.url) + '" data-title="' + escapeAttr(tab.title || tab.url) + '">' +
      faviconHtml +
      '<div class="tab-item-info">' +
        '<div class="tab-item-title">' + escapeHtml(tab.title || tab.url) + '</div>' +
        '<div class="tab-item-url">' + escapeHtml(truncateUrl(tab.url)) + '</div>' +
      '</div>' +
      (isDuplicate ? '<span class="duplicate-badge">DUP</span>' : '');

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

/* ============================================================
   Duplicate Detection
   ============================================================ */

function checkDuplicates(tabs) {
  const checkedUrls = tabs.map(t => normalizeUrl(t.url));

  const urlSessionMap = new Map();
  sessions.forEach(s => {
    s.tabs.forEach(t => {
      const norm = normalizeUrl(t.url);
      if (!urlSessionMap.has(norm)) urlSessionMap.set(norm, new Set());
      urlSessionMap.get(norm).add(s.name);
    });
  });

  const dupeDetails = new Map();
  checkedUrls.forEach(url => {
    const names = urlSessionMap.get(url);
    if (names) {
      names.forEach(name => {
        dupeDetails.set(name, (dupeDetails.get(name) || 0) + 1);
      });
    }
  });

  if (dupeDetails.size > 0) {
    let totalDupes = 0;
    dupeDetails.forEach(count => { totalDupes += count; });

    let message;
    if (dupeDetails.size === 1) {
      const entry = [...dupeDetails.entries()][0];
      message = entry[1] + ' tab' + (entry[1] > 1 ? 's' : '') + ' already saved in "' + entry[0] + '"';
    } else {
      message = totalDupes + ' tab' + (totalDupes > 1 ? 's are' : ' is') + ' already saved in other sessions';
    }

    $('#duplicate-warning').classList.remove('hidden');
    $('#duplicate-text').textContent = message;
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

  const folderId = $('#save-folder-select').value || '';

  const session = {
    id: generateId(),
    name: name,
    color: saveSelectedColor,
    folderId: folderId,
    tabs: tabs,
    createdAt: Date.now(),
    restoredAt: null,
  };

  sessions.unshift(session);
  await saveSessions();
  showView('main');
  renderSessionList();
  showToast('Saved "' + name + '" with ' + tabs.length + ' tab' + (tabs.length !== 1 ? 's' : ''));
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
  $('#detail-tab-count').textContent = session.tabs.length + ' tab' + (session.tabs.length !== 1 ? 's' : '');

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
      ? '<img class="detail-tab-favicon" src="' + faviconUrl + '" alt="" onerror="this.textContent=\'🌐\';this.style.fontSize=\'12px\'">'
      : '<span class="detail-tab-favicon" style="display:flex;align-items:center;justify-content:center;font-size:12px">🌐</span>';

    item.innerHTML =
      '<span class="drag-handle" title="Drag to reorder">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">' +
          '<circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>' +
          '<circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>' +
          '<circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>' +
        '</svg>' +
      '</span>' +
      faviconHtml +
      '<div class="detail-tab-info">' +
        '<div class="detail-tab-title">' + escapeHtml(tab.title || tab.url) + '</div>' +
        '<div class="detail-tab-url">' + escapeHtml(truncateUrl(tab.url)) + '</div>' +
      '</div>' +
      '<button class="detail-tab-delete" title="Remove tab">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<line x1="18" y1="6" x2="6" y2="18"/>' +
          '<line x1="6" y1="6" x2="18" y2="18"/>' +
        '</svg>' +
      '</button>';

    item.querySelector('.detail-tab-info').addEventListener('click', () => {
      chrome.tabs.create({ url: tab.url, active: false });
    });
    item.querySelector('.detail-tab-info').style.cursor = 'pointer';

    item.querySelector('.detail-tab-delete').addEventListener('click', () => {
      deleteTabFromSession(session.id, index);
    });

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

  const folderName = getFolderName(session.folderId);
  const folderHtml = folderName
    ? '<div class="detail-meta-row"><span>Folder:</span><span>' + escapeHtml(folderName) + '</span></div>'
    : '';

  meta.innerHTML = folderHtml +
    '<div class="detail-meta-row"><span>Saved:</span><span>' + created + '</span></div>' +
    '<div class="detail-meta-row"><span>Last restored:</span><span>' + restored + '</span></div>';
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

  session.restoredAt = Date.now();
  await saveSessions();

  showToast(`Restored "${session.name}" (${urls.length} tab${urls.length !== 1 ? 's' : ''})`);

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
    sessions = sessions.filter(s => s.id !== sessionId);
    await saveSessions();
    showView('main');
    renderSessionList();
    showToast('Session removed (no tabs left)');
    return;
  }

  await saveSessions();
  openDetailView(sessionId);
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
  populateFolderSelect($('#edit-folder-select'), session.folderId || '');
  setTimeout(() => $('#edit-session-name').focus(), 100);
}

async function confirmEdit() {
  const session = sessions.find(s => s.id === currentSessionId);
  if (!session) return;

  const name = $('#edit-session-name').value.trim();
  if (!name) return;

  session.name = name;
  session.color = editSelectedColor;
  const folderSelect = $('#edit-folder-select');
  if (folderSelect) {
    session.folderId = folderSelect.value || null;
  }
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
    const pipeIndex = line.indexOf(' | ');
    let url, title;

    if (pipeIndex > -1) {
      url = line.substring(0, pipeIndex).trim();
      title = line.substring(pipeIndex + 3).trim();
    } else {
      url = line.trim();
      title = url;
    }

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
    folderId: null,
  };

  sessions.unshift(session);
  await saveSessions();
  showView('main');
  renderSessionList();
  showToast(`Imported "${name}" with ${tabs.length} tab${tabs.length !== 1 ? 's' : ''}`);
}

/* ============================================================
   Folders Management
   ============================================================ */

function openFoldersView() {
  showView('folders');
  renderFoldersList();
}

function renderFoldersList() {
  const container = $('#folder-list');
  const emptyMsg = $('#folder-empty');
  if (!container) return;

  if (folders.length === 0) {
    container.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = '';
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';

  container.innerHTML = folders.map(f => {
    const count = sessions.filter(s => s.folderId === f.id).length;
    return `
      <div class="folder-item" data-id="${f.id}">
        <span class="folder-icon">📁</span>
        <span class="folder-name">${escapeHtml(f.name)}</span>
        <span class="folder-count">${count}</span>
        <button class="folder-rename-btn" data-id="${f.id}" title="Rename">✏️</button>
        <button class="folder-delete-btn" data-id="${f.id}" title="Delete">🗑️</button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.folder-rename-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const fId = btn.dataset.id;
      const folder = folders.find(f => f.id === fId);
      if (!folder) return;
      const newName = prompt('Rename folder:', folder.name);
      if (newName && newName.trim()) {
        folder.name = newName.trim();
        saveFolders();
        renderFoldersList();
      }
    });
  });

  container.querySelectorAll('.folder-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const fId = btn.dataset.id;
      confirmAction('Delete this folder? Sessions inside will become uncategorized.', async () => {
        sessions.forEach(s => { if (s.folderId === fId) s.folderId = null; });
        folders = folders.filter(f => f.id !== fId);
        await saveFolders();
        await saveSessions();
        renderFoldersList();
      });
    });
  });
}

async function createFolder() {
  const input = $('#new-folder-name');
  const name = input ? input.value.trim() : '';
  if (!name) return;
  folders.push({ id: generateId(), name });
  await saveFolders();
  if (input) input.value = '';
  const createBtn = $('#btn-create-folder');
  if (createBtn) createBtn.disabled = true;
  renderFoldersList();
  showToast(`Folder "${name}" created`);
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
    version: '1.1.0',
    exportedAt: new Date().toISOString(),
    sessions: sessions.map(s => ({
      name: s.name,
      color: s.color,
      folderId: s.folderId || null,
      createdAt: new Date(s.createdAt).toISOString(),
      tabs: s.tabs.map(t => ({ url: t.url, title: t.title })),
    })),
    folders: folders,
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

  // Folders button
  const foldersBtn = $('#btn-folders') || $('#btn-manage-folders');
  if (foldersBtn) foldersBtn.addEventListener('click', openFoldersView);

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

  // Upgrade link
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

  // Folders view
  const foldersBack = $('#folders-back');
  if (foldersBack) foldersBack.addEventListener('click', () => {
    showView('main');
    renderSessionList();
  });
  const createFolderBtn = $('#btn-create-folder');
  if (createFolderBtn) createFolderBtn.addEventListener('click', createFolder);
  const newFolderInput = $('#new-folder-name');
  if (newFolderInput) {
    newFolderInput.addEventListener('input', () => {
      if (createFolderBtn) createFolderBtn.disabled = !newFolderInput.value.trim();
    });
    newFolderInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && newFolderInput.value.trim()) createFolder();
    });
  }

  // Confirm dialog
  $('#confirm-cancel').addEventListener('click', closeConfirm);
  $('#confirm-ok').addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    closeConfirm();
  });
  $('#confirm-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeConfirm();
  });

  // Keyboard: Enter to save/edit
  $('#session-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !$('#btn-confirm-save').disabled) confirmSave();
  });
  $('#edit-session-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmEdit();
  });

  // Keyboard: / to focus search, Escape to go back
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      searchInput.focus();
      return;
    }
    if (e.key === 'Escape') {
      if (!$('#confirm-overlay').classList.contains('hidden')) {
        closeConfirm();
        return;
      }
      if (views.save.classList.contains('active') ||
          views.import.classList.contains('active') ||
          views.settings.classList.contains('active') ||
          views.folders.classList.contains('active')) {
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