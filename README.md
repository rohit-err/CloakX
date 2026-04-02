# Cheat-X

Stealth AI interview assistant. Loads ChatGPT, Grok, Claude, or Gemini in a floating window that is **completely invisible to screen recording** (Zoom, Meet, Teams, OBS).

---

## Setup

```bash
npm install
npm start
```

For development (opens DevTools):
```bash
npm run dev
```

---

## Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+Space` | Show / hide the window |
| `Ctrl+Shift+V` | Paste clipboard text into AI chat input |

---

## Features

- **Screen invisible** — `setContentProtection(true)` blocks all screen recorders at the OS level
- **4 AI options** — Switch between ChatGPT, Grok, Claude, Gemini with one click
- **Paste shortcut** — Copy a question from anywhere, press `Ctrl+Shift+V`, it lands in the chat input automatically
- **Opacity slider** — Drag to make the window semi-transparent so you can see what's behind it
- **Always on top** — Floats above all other windows
- **Persistent sessions** — Each AI stays logged in between app restarts

---

## Requirements

- Windows 10/11 (screen protection is Windows/Mac native)
- Node.js 18+
- Internet connection

---

## How it works

```
Interview running (Zoom / Meet)
        ↓
Ctrl+Shift+Space  →  window appears (invisible to recorder)
        ↓
Type question  OR  copy from screen → Ctrl+Shift+V to paste
        ↓
Press Enter  →  AI answers
        ↓
Ctrl+Shift+Space  →  window hides
```
