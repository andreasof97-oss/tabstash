/**
 * TabStash v1.1.0 — Background Service Worker
 * Handles:
 *   - Tab count badge on the extension icon
 *   - Keyboard shortcut command to save session
 */

'use strict';

const BADGE_BG_COLOR = '#4B5563'; // Neutral dark gray

/* ============================================================
   Tab Count Badge
   ============================================================ */

/** Update the badge with the current tab count. */
async function updateBadge() {
  try {
    const tabs = await chrome.tabs.query({});
    const count = tabs.length;
    const text = count > 0 ? String(count) : '';
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color: BADGE_BG_COLOR });
    await chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
  } catch (e) {
    // Silently ignore — service worker may wake during browser startup
  }
}

// Update badge on tab events
chrome.tabs.onCreated.addListener(updateBadge);
chrome.tabs.onRemoved.addListener(updateBadge);
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.status === 'complete') updateBadge();
});
chrome.tabs.onReplaced.addListener(updateBadge);

// Update on window focus change (handles multi-window scenarios)
chrome.windows.onFocusChanged.addListener(updateBadge);

// Update on install / startup
chrome.runtime.onInstalled.addListener(updateBadge);
chrome.runtime.onStartup.addListener(updateBadge);

// Initial badge update
updateBadge();

/* ============================================================
   Keyboard Shortcut Commands
   ============================================================ */

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-session') {
    // Open the popup programmatically — MV3 doesn't allow opening popup from background,
    // so we open the popup.html as a small window or use chrome.action.openPopup (Chrome 127+).
    // Fallback: open popup.html with a query param so it auto-opens the save view.
    try {
      // chrome.action.openPopup() is available in Chrome 127+
      if (chrome.action.openPopup) {
        await chrome.action.openPopup();
      }
    } catch (e) {
      // Fallback: just set a flag in storage that the popup reads on open
    }
    // Set a flag so the popup knows to open the save view
    await chrome.storage.local.set({ tabstash_open_save: true });
  }
});
