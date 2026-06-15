/**
 * TabStash — Background Service Worker
 * Handles badge updates for open tab count.
 */

const BADGE_BG_COLOR = '#4F46E5'; // Indigo-600

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
