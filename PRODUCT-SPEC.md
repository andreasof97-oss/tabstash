# TabStash — Product Spec

## Overview
**TabStash** is a Chrome extension that lets you save, organize, and restore groups of browser tabs as named sessions. Clean, fast, modern — the tab manager Chrome should've built in.

**Tagline:** "Save your tabs. Find your focus."

## Target Audience
- Remote workers juggling multiple projects
- Researchers with dozens of reference tabs
- Developers switching between feature branches / environments
- Students organizing tabs by class/subject
- Anyone who's ever lost 30 tabs to a browser crash

## Market Opportunity
- OneTab: 5M+ users, aging UI, no updates
- Session Buddy: 1M+ users, clunky interface
- Toby: overbuilt, tries to be a workspace
- Chrome has ZERO built-in tab session saving
- Clear gap for a clean, fast, modern alternative

---

## Features

### Free Tier
- **Save sessions** — One-click save all open tabs (or selected tabs) as a named session
- **5 saved sessions** max
- **Name & color-code** sessions (8 color options)
- **Restore sessions** — Open all tabs in a session with one click (new window or current)
- **Tab count badge** — Shows how many tabs you have open
- **Drag & drop** reorder tabs within sessions
- **Delete individual tabs** from a saved session
- **Duplicate detection** — Warns if saving duplicate URLs
- **Quick search** — Search across tab titles in your sessions
- **Import from OneTab** — Easy migration (paste OneTab export)

### Pro Tier — $3/mo or $24/yr
- **Unlimited sessions**
- **Auto-save** — Automatically saves a snapshot of your tabs every 30 min (configurable). Never lose tabs to a crash again
- **Cloud sync** — Access your sessions on any device (Supabase backend)
- **Session scheduling** — Set sessions to auto-open on specific days/times (e.g., "Work" session opens Mon-Fri at 9am)
- **Session sharing** — Generate a shareable link for a session (great for onboarding team members)
- **Advanced search** — Search across ALL saved tabs by title or URL
- **Import from Session Buddy** — Migration support
- **Tab history** — See recently closed sessions, restore them
- **Session folders** — Group sessions into folders (Work, Personal, Research, etc.)
- **Keyboard shortcuts** — Customizable hotkeys for save/restore

---

## Tech Stack
- **Extension:** Chrome Manifest V3 (HTML/CSS/JS)
- **Storage (Free):** chrome.storage.local (stays on device)
- **Storage (Pro):** Supabase (auth + cloud sync)
- **Payments:** PayPal Subscriptions (same infra as ScriptPad)
- **Auth:** Supabase Auth (email/password)

## UI Design Principles
- **Popup-first** — Everything accessible from the toolbar popup
- **Clean & minimal** — No clutter, no learning curve
- **Fast** — Popup opens instantly, no loading spinners for local data
- **Color-coded** — Sessions are visually distinct at a glance
- **Dark mode** — Matches Chrome's dark theme

## Popup Layout
```
┌──────────────────────────────────┐
│ 🗂️ TabStash              ⚙️ 👤  │
│──────────────────────────────────│
│ 🔍 Search sessions...           │
│──────────────────────────────────│
│ [💾 Save Current Tabs]           │
│──────────────────────────────────│
│ 📁 Work (12 tabs)          🟢   │
│   → Restore | Edit | ✕          │
│──────────────────────────────────│
│ 📁 Research (8 tabs)        🔵  │
│   → Restore | Edit | ✕          │
│──────────────────────────────────│
│ 📁 Personal (5 tabs)       🟡   │
│   → Restore | Edit | ✕          │
│──────────────────────────────────│
│           2/5 sessions           │
│     [⚡ Upgrade to Pro]          │
└──────────────────────────────────┘
```

## Session Detail View (click to expand)
```
┌──────────────────────────────────┐
│ ← Back    📁 Work (12 tabs) 🟢  │
│──────────────────────────────────│
│ 🔍 Search tabs...               │
│──────────────────────────────────│
│ [▶️ Restore All] [+ Add Tab]    │
│──────────────────────────────────│
│ 🌐 Gmail - Inbox          ✕    │
│ 🌐 Slack - #general       ✕    │
│ 🌐 Jira - Sprint Board    ✕    │
│ 🌐 GitHub - PR #142       ✕    │
│ ... (drag to reorder)           │
│──────────────────────────────────│
│ Saved: June 15, 2026 2:30 PM    │
│ Last restored: Never             │
└──────────────────────────────────┘
```

## Color Palette for Sessions
- 🔴 Red | 🟠 Orange | 🟡 Yellow | 🟢 Green
- 🔵 Blue | 🟣 Purple | 🩷 Pink | ⚫ Gray

## Settings Page
- Auto-save toggle + interval (Pro)
- Cloud sync toggle (Pro)
- Keyboard shortcuts
- Import/Export data
- Theme (auto/light/dark)
- Account management (sign in/out)
- Subscription management

---

## Pricing

| Feature | Free | Pro |
|---|---|---|
| Saved sessions | 5 | Unlimited |
| Save/Restore tabs | ✅ | ✅ |
| Name & color-code | ✅ | ✅ |
| Search sessions | ✅ | ✅ |
| Drag & drop reorder | ✅ | ✅ |
| Duplicate detection | ✅ | ✅ |
| Import from OneTab | ✅ | ✅ |
| Auto-save | ❌ | ✅ |
| Cloud sync | ❌ | ✅ |
| Session scheduling | ❌ | ✅ |
| Session sharing | ❌ | ✅ |
| Session folders | ❌ | ✅ |
| Import Session Buddy | ❌ | ✅ |
| Tab history | ❌ | ✅ |
| Keyboard shortcuts | ❌ | ✅ |
| **Price** | **Free** | **$3/mo or $24/yr** |

---

## MVP (v1.0) — Ship First
Focus on FREE features only. Get users, get reviews, THEN add Pro.

### v1.0 Scope:
- Save all open tabs as a named session (one click)
- Save selected tabs as a session
- 5 session limit
- Name & color-code sessions
- Restore session (new window or current window)
- Delete sessions / individual tabs
- Drag & drop reorder tabs
- Search across sessions
- Tab count badge on icon
- Duplicate URL detection
- Import from OneTab
- Dark mode support
- Clean, modern popup UI

### NOT in v1.0:
- Account system / auth
- Cloud sync
- Auto-save
- Scheduling
- Sharing
- PayPal / Pro tier
- Import from Session Buddy

---

## Future Versions Roadmap

### v1.1 — Polish & Feedback
- Bug fixes from real user feedback
- Performance optimization
- Keyboard shortcut for quick-save (Ctrl+Shift+S)

### v1.2 — Account System + Pro Foundation
- Supabase auth (email/password)
- Free tier limit enforcement
- Pro upgrade flow (PayPal)

### v1.3 — Pro Features Wave 1
- Unlimited sessions (Pro)
- Cloud sync across devices (Pro)
- Auto-save snapshots (Pro)

### v1.4 — Pro Features Wave 2
- Session scheduling (Pro)
- Session sharing (Pro)
- Session folders (Pro)
- Import from Session Buddy (Pro)
- Tab history (Pro)

---

## Store Listing

**Name:** TabStash — Tab Manager & Session Saver

**Short description (132 chars max):**
Save, organize & restore browser tabs as sessions. Never lose your tabs again. Free tab manager with cloud sync.

**Category:** Productivity

**Keywords/Tags:** tab manager, session saver, tab groups, save tabs, restore tabs, OneTab alternative, tab organizer, productivity

---

## Competition Analysis

| Extension | Users | Weakness | Our Edge |
|---|---|---|---|
| OneTab | 5M+ | Ugly, no updates, no sync | Modern UI, cloud sync, colors |
| Session Buddy | 1M+ | Clunky, complex UI | Simple, fast, clean |
| Toby | 500K+ | Overbuilt, slow, resource hog | Lightweight, focused |
| Tab Wrangler | 300K+ | Auto-closes tabs (scary) | Saves, doesn't close |
| Workona | 200K+ | Workspace tool (overkill) | Just tab sessions, simple |

---

## Revenue Projections (Conservative)

**Month 1-3:** Free users, building reviews (0 revenue)
**Month 4-6:** Pro tier launches, 1-2% conversion
- 1,000 users × 1.5% conversion × $3/mo = $45/mo
**Month 6-12:** Growth phase
- 5,000 users × 2% conversion × $3/mo = $300/mo
**Year 2:** Established
- 20,000 users × 2.5% conversion × $3/mo = $1,500/mo

These are conservative. OneTab got 5M users with zero marketing and a bad UI. A good product with basic SEO can realistically hit 10K-50K users in year one.
