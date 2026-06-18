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
    try {
      // Quick-save all tabs in the current window as a new session
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const validTabs = tabs.filter(t => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://'));

      if (validTabs.length === 0) return;

      // Generate session name with date/time
      const now = new Date();
      const name = `Quick Save — ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      const session = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        name,
        color: 'blue',
        tabs: validTabs.map(t => ({ url: t.url, title: t.title || t.url })),
        createdAt: Date.now(),
        restoredAt: null,
        folderId: null,
      };

      // Load existing sessions, add new one, save
      const result = await chrome.storage.local.get('tabstash_sessions');
      const sessions = result.tabstash_sessions || [];

      // Check free tier limit
      const MAX_FREE = 5;
      if (sessions.length >= MAX_FREE) {
        // Can't save — at limit. Show a notification if possible.
        return;
      }

      sessions.unshift(session);
      await chrome.storage.local.set({ tabstash_sessions: sessions });

      // Brief notification badge flash
      await chrome.action.setBadgeText({ text: '✓' });
      await chrome.action.setBadgeBackgroundColor({ color: '#10B981' });
      setTimeout(() => updateBadge(), 1500);
    } catch (e) {
      // Silently fail
    }
  }
});
