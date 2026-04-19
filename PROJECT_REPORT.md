# PROJECT REPORT: Cheat-X

---

## Table of Contents

- [Project Synopsis](#project-synopsis)
- [1. Introduction](#1-introduction)
- [2. Problem Analysis](#2-problem-analysis)
- [3. System Implementation Details](#3-system-implementation-details)
- [4. Design](#4-design)
- [5. Implementation](#5-implementation)
- [6. Results](#6-results)
- [7. Conclusion](#7-conclusion)
- [8. Future Scope](#8-future-scope)
- [9. Limitations](#9-limitations)
- [10. Annexure – I: References](#10-annexure--i-references)

---

## Project Synopsis

**Project Name:** Cheat-X  
**Version:** 1.0.0  
**Description:** Stealth AI assistant for interviews — invisible to screen recording  
**Technology Stack:** Electron, HTML, CSS, JavaScript (Vanilla)  
**Platform:** Windows 10/11, macOS  
**Dependencies:** Electron ^31.0.1 (only dev dependency)

Cheat-X is a frameless, transparent, always-on-top desktop application that embeds ChatGPT, Claude, Gemini, and Grok in a floating window that is completely invisible to all screen recording and screen-sharing software (Zoom, Google Meet, Microsoft Teams, OBS). It is designed for use during technical interviews where the candidate's screen is being shared.

---

## 1. Introduction

### Theoretical Background

Cheat-X is built on **Electron**, a framework that combines Chromium (for rendering web content) and Node.js (for system-level access) into a single desktop application. The core insight exploited here is the OS-level `setContentProtection` API — available on both Windows and macOS — which instructs the operating system's compositor to exclude a specific window from any screen capture pipeline. This means screen recording software captures a blank/black region where the window sits, even though it is fully visible to the physical user.

The application embeds real AI chat interfaces inside an Electron `<webview>` tag — a sandboxed iframe-like element that maintains its own browser session, cookies, and storage, separate from the host window. This allows users to stay logged into each AI service persistently across restarts.

### Objective of the Project

To build a stealth desktop assistant that:

- Remains completely invisible to all screen recording and screen-sharing software
- Provides instant access to four major AI chat platforms in a single floating window
- Allows clipboard content (e.g., interview questions) to be injected directly into the AI chat input via a global keyboard shortcut
- Stays always-on-top and can be toggled visible/hidden without disrupting the user's primary workflow

### Literature Review

Electron's `setContentProtection` maps to `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` on Windows 10 (build 2004+) and `NSWindowSharingNone` on macOS. The technique of using a persistent `partition` in Electron webviews to maintain login sessions is a well-known pattern in Electron-based browser tools. The paste injection approach uses `document.execCommand("insertText")` — a widely used but now-deprecated browser API — to programmatically insert text into web-based input fields.

### Scope of the Study

- Desktop platforms: Windows 10/11 and macOS (primary target is Windows)
- Four AI providers: OpenAI ChatGPT, Anthropic Claude, Google Gemini, xAI Grok
- Interaction model: keyboard-driven, clipboard-based input injection
- No backend server — entirely client-side; no data leaves the user's machine except to the AI providers directly

### Limitations of the Study

- Requires an active internet connection (all AI interfaces are web-based)
- Screen protection effectiveness depends on OS version (Windows 10 build 2004+ required)
- The paste injection uses `document.execCommand("insertText")` which is deprecated in modern browsers; it works currently but may break in future Chromium versions
- No offline fallback or local LLM support
- The `Ctrl+Shift+Q` shortcut listed in the UI shortcuts panel is not actually registered in `main.js` — only `Ctrl+Shift+Space` and `Ctrl+Shift+V` are registered globally

---

## 2. Problem Analysis

### Problem Definition

During technical interviews conducted over video conferencing tools (Zoom, Google Meet, Teams), candidates cannot use AI assistance because:

1. The interviewer can see the candidate's screen via screen share
2. Screen recording software captures all visible windows
3. Alt-tabbing to a browser is visually obvious to the interviewer

There was no existing tool that provided AI access in a way that was simultaneously: always-on-top, invisible to screen recorders, and capable of receiving questions without manual typing.

### Requirement Analysis and Development

#### a. Functional Requirements

| # | Requirement |
|---|---|
| FR1 | The window must be invisible to all screen recording software |
| FR2 | The app must load ChatGPT, Claude, Gemini, and Grok in a single window |
| FR3 | Users must be able to switch between AI providers with a single click |
| FR4 | A global shortcut must toggle window visibility from any application |
| FR5 | A global shortcut must paste clipboard text directly into the active AI's chat input |
| FR6 | The window must float above all other windows at all times |
| FR7 | AI sessions (login state) must persist across app restarts |
| FR8 | The window must be draggable and repositionable |
| FR9 | Individual AI providers must be toggleable on/off |
| FR10 | Window opacity must be adjustable |

#### b. Non-Functional Requirements

| # | Requirement |
|---|---|
| NFR1 | Startup time must be fast — window shows only when ready (no white flash) |
| NFR2 | UI must be minimal and non-intrusive (pill-bar design, 36px height) |
| NFR3 | Tab hide/show must use CSS `max-width` transition — no layout reflow |
| NFR4 | Context isolation must be enforced (`contextIsolation: true`, `nodeIntegration: false`) |
| NFR5 | The app must handle navigation aborts (ERR_ABORTED) without crashing |
| NFR6 | The window must never appear off-screen on smaller displays (clamped positioning) |

#### c. Goals of Implementation

- Zero-dependency production build (only `electron` as a dev dependency)
- Secure IPC bridge via `contextBridge` — renderer has no direct Node.js access
- Smooth animations for all state transitions (settings open/close, tab hide, collapse)
- Fully keyboard-navigable UI with ARIA attributes throughout

---

## 3. System Implementation Details

### Methodology Adopted

The project follows a **single-process Electron architecture** with strict process separation:

- **Main Process** (`main.js`): Owns the OS window, registers global shortcuts, reads clipboard, sends IPC messages
- **Renderer Process** (`app.js` + `index.html` + `style.css`): Handles all UI logic, tab switching, settings, drag, opacity
- **Preload Script** (`preload.js`): Acts as a secure bridge — exposes only a narrow `window.cheatX` API to the renderer using `contextBridge`

The development methodology is iterative and feature-driven, with each feature (stealth, paste injection, settings, drag) implemented as an isolated module within the renderer.

### Hardware and Software Used

**Hardware:**
- Any Windows 10/11 or macOS machine with internet access
- Minimum: dual-core CPU, 4GB RAM (Electron + 4 webview sessions are memory-intensive)

**Software:**

| Component | Version / Detail |
|---|---|
| Electron | ^31.0.1 (Chromium 126 based) |
| Node.js | 18+ (required by Electron 31) |
| npm | Bundled with Node.js |
| OS | Windows 10 build 2004+ / macOS 10.15+ |
| AI Services | ChatGPT (chatgpt.com), Claude (claude.ai), Gemini (gemini.google.com), Grok (grok.com) |
| Icon Assets | `@lobehub/icons-static-png` via unpkg CDN |

---

## 4. Design

### Flowchart

```
App Launch
    │
    ▼
createWindow()
  ├─ Size: 920×680, positioned bottom-right (clamped to screen bounds)
  ├─ frame:false, transparent:true, alwaysOnTop:true
  ├─ skipTaskbar:true  (hidden from taskbar)
  ├─ setContentProtection(true)  ◄── invisible to all screen recorders
  └─ show:false → loads index.html → "ready-to-show" event → show()
    │
    ▼
registerShortcuts()
  ├─ Ctrl+Shift+Space  →  toggle win.show() / win.hide()
  └─ Ctrl+Shift+V      →  clipboard.readText() → IPC "paste-to-chat" → renderer
    │
    ▼
Renderer Initializes (app.js)
  ├─ showLoading()  →  webview loads chatgpt.com
  ├─ webview "did-finish-load"  →  hideLoading()
  └─ window.cheatX.onPasteToChat(handlePaste) registered
    │
    ▼
User Interaction Loop
  ├─ Click AI tab       →  switchAI(ai)  →  webview.src = AI_URLS[ai]
  ├─ Click Collapse     →  toggleCollapse()  →  body.chat-collapsed
  ├─ Click Settings     →  toggleSettings()  →  chat fades, settings fades in
  │     ├─ Models tab      : toggle enabledModels Set → syncModelTabs()
  │     ├─ Appearance tab  : opacity slider → body.style.opacity
  │     └─ Shortcuts tab   : static reference list
  ├─ Drag handle mousedown  →  window.cheatX.startDrag()  [IPC]
  ├─ Ctrl+Arrow keys        →  window.cheatX.moveWindow(dx, dy)  [IPC]
  └─ Ctrl+Shift+V (global)  →  handlePaste(text)  →  webview.executeJavaScript()
```

### Entity Relationship Diagram

Since this is a frontend-only desktop application with no database, the entities are the in-memory state objects and their relationships:

```
┌─────────────────────┐         ┌──────────────────────────┐
│   BrowserWindow     │  IPC    │   Renderer (app.js)      │
│   (main.js)         │◄───────►│                          │
│                     │         │  currentAI   : string    │
│  win    : BrowserWindow       │  chatCollapsed : bool    │
│  IS_DEV : bool      │         │  settingsOpen  : bool    │
└─────────────────────┘         │  enabledModels : Set     │
                                 └──────────┬───────────────┘
                                            │ controls
                                 ┌──────────▼───────────────┐
                                 │   <webview>              │
                                 │   src: AI_URLS[ai]       │
                                 │   partition:             │
                                 │   "persist:cheatx"       │
                                 └──────────────────────────┘

AI_URLS Map:
  "chatgpt"  →  "https://chatgpt.com"
  "claude"   →  "https://claude.ai"
  "gemini"   →  "https://gemini.google.com"
  "grok"     →  "https://grok.com"

IPC Channels:
  main → renderer : "paste-to-chat"  (string payload)
  renderer → main : "start-drag", "move-window", "quit-app"
                    (via contextBridge window.cheatX API)
```

---

## 5. Implementation

The implementation is structured across 5 source files:

### `src/main.js` — Main Process (62 lines)

Creates the `BrowserWindow` with `frame:false`, `transparent:true`, `alwaysOnTop:true`, `skipTaskbar:true`. Calls `win.setContentProtection(true)` immediately after creation. Registers two global shortcuts. Handles `unhandledRejection` to suppress `ERR_ABORTED` errors from webview navigation. Implements macOS `activate` event for dock re-open behavior.

```
Key calls:
  screen.getPrimaryDisplay().workAreaSize  →  calculate clamped x/y position
  win.setContentProtection(true)           →  OS-level screen capture block
  win.setAlwaysOnTop(true, "screen-saver") →  float above fullscreen apps
  globalShortcut.register(...)             →  system-wide hotkeys
  clipboard.readText()                     →  read clipboard on Ctrl+Shift+V
  win.webContents.send("paste-to-chat")    →  forward text to renderer
```

### `src/preload.js` — IPC Bridge (18 lines)

Uses `contextBridge.exposeInMainWorld` to expose `window.cheatX` with a single method: `onPasteToChat(cb)`. The handler wraps `ipcRenderer.on` and returns a cleanup function. `nodeIntegration` is false — the renderer has zero direct Node.js access.

### `src/index.html` — UI Structure (~150 lines)

Defines:
- Pill bar with four AI tab buttons (each with a CDN-loaded logo image)
- Collapse, drag, settings, and close control buttons
- `<webview>` element with `partition="persist:cheatx"` and a spoofed Windows Chrome user-agent
- Loading overlay with a CSS spinner
- Settings panel with three tab panels: **Models**, **Appearance**, **Shortcuts**

All interactive elements carry ARIA roles, labels, and `aria-selected` / `aria-expanded` attributes.

### `src/app.js` — Renderer Logic (~200 lines)

| Function | Purpose |
|---|---|
| `switchAI(ai)` | Updates active tab styles, shows loading overlay, sets `webview.src` |
| `syncModelTabs()` | Adds/removes `.hidden` class (CSS `max-width:0`) on pill tabs |
| `toggleSettings(force)` | Fades chat out (`opacity:0, scale:0.98`), fades settings in |
| `toggleCollapse()` | Toggles `body.chat-collapsed` which hides `#main-area` via CSS |
| `applyOpacity(value)` | Sets `document.body.style.opacity`, clamped to 20–100% |
| `handlePaste(text)` | Builds and executes JS string in webview to inject text into AI input |
| `initDrag()` | IIFE — listens for mousedown on drag handle, calls `window.cheatX.startDrag()` |
| Keyboard handler | `Ctrl+Arrow` keys call `window.cheatX.moveWindow(dx, dy)` with 40px steps |

### `src/style.css` — Styling (~350 lines)

| Section | Key Detail |
|---|---|
| CSS tokens (`:root`) | Dark theme: `--surface:#141418`, `--accent:#8b7ff5`, `--radius:14px` |
| Pill bar | `border-radius: 18px` (half of `--pill-h: 36px`) |
| Tab hide animation | `max-width: 0` + `opacity: 0` transition — no layout reflow |
| Settings open animation | `scale(0.98) translateY(6px)` → `scale(1) translateY(0)` |
| Paste flash | `box-shadow` keyframe animation on `#chat-box` (500ms) |
| Toggle switch | Pure CSS — hidden checkbox + styled `.toggle-track` + `.toggle-thumb` |

---

## 6. Results

### Experimental Result 1 — Screen Invisibility

When `setContentProtection(true)` is active, the Cheat-X window appears normally on the physical monitor but shows as a black/blank region in any screen recording or screen share (Zoom, OBS, Windows Game Bar). This works at the OS compositor level via `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` on Windows.

### Experimental Result 2 — Paste Injection

Pressing `Ctrl+Shift+V` with text in the clipboard triggers the global shortcut in `main.js`, which reads the clipboard and sends it via IPC to the renderer. The renderer's `handlePaste()` function executes a JavaScript snippet inside the webview targeting:

```
div[contenteditable="true"]
.ProseMirror
[role="textbox"]
textarea
div[data-placeholder]
```

This covers all four AI interfaces' input fields. The text is injected using `document.execCommand("insertText")` and an `input` event is dispatched to trigger the AI's internal React/Vue state update.

### Experimental Result 3 — Persistent Sessions

The `partition="persist:cheatx"` attribute on the webview causes Electron to store cookies and localStorage for all four AI sites in a named persistent session. Users remain logged in across app restarts without re-authenticating.

---

## 7. Conclusion

Cheat-X successfully demonstrates that a frameless, transparent, always-on-top Electron window with `setContentProtection(true)` is completely invisible to screen recording software while remaining fully visible and interactive to the physical user. The application integrates four major AI chat platforms in a single floating UI, with clipboard-based paste injection, persistent login sessions, and a minimal pill-bar interface. The entire implementation requires only Electron as a dependency and runs without any backend server.

---

## 8. Future Scope

- **Local LLM support** — Integrate Ollama or LM Studio via localhost API for fully offline use
- **OCR input** — Capture a screen region and extract text automatically instead of manual copy-paste
- **Multi-window** — Allow side-by-side comparison of two AI responses simultaneously
- **Answer history** — Log Q&A pairs locally with timestamps for post-interview review
- **Custom user-agent rotation** — Reduce detection risk from AI providers
- **Fix `execCommand` deprecation** — Replace with Clipboard API + `InputEvent` with `insertText` data
- **Register missing `Ctrl+Shift+Q` shortcut** — Currently listed in the UI shortcuts panel but not implemented in `main.js`
- **Add missing IPC handlers** — `startDrag` and `moveWindow` are called from the renderer but the corresponding `ipcMain.on` handlers are absent from `main.js`

---

## 9. Limitations

| # | Limitation |
|---|---|
| L1 | **Windows version dependency** — `setContentProtection` requires Windows 10 build 2004 (May 2020 Update) or later; older versions will not have screen protection |
| L2 | **`document.execCommand` deprecated** — Paste injection relies on a deprecated browser API; future Chromium updates may break it |
| L3 | **Missing IPC handlers** — `window.cheatX.startDrag()`, `window.cheatX.moveWindow()`, and `window.cheatX.quitApp()` are called in `app.js` but their `ipcMain` handlers are absent from `main.js`, making drag, keyboard movement, and the close button non-functional |
| L4 | **Memory usage** — Running four webview sessions simultaneously is memory-intensive (~500MB–1GB RAM) |
| L5 | **No error recovery** — If a webview fails to load, only the loading spinner is hidden; there is no retry mechanism or user-facing error message |
| L6 | **CDN dependency** — AI logos are loaded from `unpkg.com` at runtime; if the CDN is unavailable, logos will not display |
| L7 | **Internet required** — All four AI interfaces are web-based; there is no offline fallback |

---

## 10. Annexure – I: References

1. Electron Documentation — BrowserWindow API
   https://www.electronjs.org/docs/latest/api/browser-window

2. Electron `setContentProtection`
   https://www.electronjs.org/docs/latest/api/browser-window#winsetcontentprotectionenable-macos-windows

3. Electron `contextBridge`
   https://www.electronjs.org/docs/latest/api/context-bridge

4. Electron `<webview>` tag
   https://www.electronjs.org/docs/latest/api/webview-tag

5. Windows `SetWindowDisplayAffinity` API (WDA_EXCLUDEFROMCAPTURE)
   https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowdisplayaffinity

6. `@lobehub/icons-static-png` on unpkg
   https://unpkg.com/@lobehub/icons-static-png

---

## Annexure – II: Weekly Progress Reports

*(Attach all original copies of WPRs here)*

---

## Annexure – III: Internship Certificate

*(Attach internship certificate here)*
