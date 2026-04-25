"use strict";

/**
 * @fileoverview Renderer process for CloakX.
 * Settings replaces the chat area entirely (full height swap).
 * Each AI model has its own toggle — all on by default.
 * Tabs hide via max-width transition — no layout jump.
 */

/** @type {Record<string, string>} */
const AI_URLS = {
  chatgpt: "https://chatgpt.com",
  claude:  "https://claude.ai",
  gemini:  "https://gemini.google.com",
  grok:    "https://grok.com",
};

// ── Element refs ──────────────────────────────────────────────────────────────

const webview        = /** @type {Electron.WebviewTag} */ (document.getElementById("ai-webview"));
const loadingOverlay = /** @type {HTMLElement} */         (document.getElementById("loading-overlay"));
const aiTabs         = /** @type {HTMLElement} */         (document.getElementById("ai-tabs"));
const chatBox        = /** @type {HTMLElement} */         (document.getElementById("chat-box"));
const btnCollapse    = /** @type {HTMLButtonElement} */   (document.getElementById("btn-collapse"));
const btnSettings    = /** @type {HTMLButtonElement} */   (document.getElementById("btn-settings"));
const btnClose       = /** @type {HTMLButtonElement} */   (document.getElementById("btn-close"));
const btnDrag        = /** @type {HTMLButtonElement} */   (document.getElementById("btn-drag"));
const settingsPanel  = /** @type {HTMLElement} */         (document.getElementById("settings-panel"));
const opacitySlider  = /** @type {HTMLInputElement} */    (document.getElementById("opacity-slider"));
const opacityLabel   = /** @type {HTMLElement} */         (document.getElementById("opacity-label"));

// ── State ─────────────────────────────────────────────────────────────────────

let currentAI     = "chatgpt";
let chatCollapsed = false;
let settingsOpen  = false;

/** @type {Set<string>} which models are enabled */
const enabledModels = new Set(["chatgpt", "claude", "gemini", "grok"]);

// ── Loading ───────────────────────────────────────────────────────────────────

function showLoading() { loadingOverlay.classList.remove("hidden"); }
function hideLoading()  { loadingOverlay.classList.add("hidden"); }

webview.addEventListener("did-finish-load", hideLoading);
webview.addEventListener("did-fail-load",   hideLoading);

// ── AI tab switching ──────────────────────────────────────────────────────────

/**
 * Switches the active AI provider.
 * @param {string} ai
 */
function switchAI(ai) {
  if (ai === currentAI || !AI_URLS[ai]) return;
  currentAI = ai;

  aiTabs.querySelectorAll(".pill-tab").forEach((tab) => {
    const active = tab.dataset.ai === ai;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  showLoading();
  webview.src = AI_URLS[ai];
}

aiTabs.addEventListener("click", (e) => {
  const tab = /** @type {HTMLElement} */ (e.target).closest(".pill-tab");
  if (tab?.dataset.ai) switchAI(tab.dataset.ai);
});

// ── Per-model visibility toggles ──────────────────────────────────────────────

/**
 * Syncs pill tab visibility with the enabledModels set.
 * Uses max-width transition — no layout jump.
 */
function syncModelTabs() {
  aiTabs.querySelectorAll(".pill-tab").forEach((tab) => {
    const ai = tab.dataset.ai;
    const visible = enabledModels.has(ai);
    tab.classList.toggle("hidden", !visible);
  });

  // If current AI was disabled, switch to first enabled one
  if (!enabledModels.has(currentAI)) {
    const first = [...enabledModels][0];
    if (first) switchAI(first);
  }
}

// Wire up each model toggle in settings
document.querySelectorAll(".model-toggle").forEach((input) => {
  const el = /** @type {HTMLInputElement} */ (input);
  const ai = el.dataset.ai;

  el.addEventListener("change", () => {
    if (el.checked) {
      enabledModels.add(ai);
    } else {
      // Don't allow disabling the last enabled model
      if (enabledModels.size <= 1) {
        el.checked = true;
        return;
      }
      enabledModels.delete(ai);
    }
    syncModelTabs();
  });
});

// ── Settings panel — full area swap ──────────────────────────────────────────

/**
 * Opens or closes settings, swapping it with the chat box.
 * @param {boolean} [force]
 */
function toggleSettings(force) {
  settingsOpen = force !== undefined ? force : !settingsOpen;

  // Chat fades behind, settings fades in — both in same container
  chatBox.classList.toggle("behind", settingsOpen);
  if (settingsOpen) {
    settingsPanel.removeAttribute("hidden");
  } else {
    // Wait for fade-out before hiding
    settingsPanel.addEventListener("transitionend", () => {
      if (!settingsOpen) settingsPanel.setAttribute("hidden", "");
    }, { once: true });
  }

  btnSettings.classList.toggle("active", settingsOpen);
  btnSettings.setAttribute("aria-expanded", String(settingsOpen));
}

btnSettings.addEventListener("click", () => toggleSettings());

// Settings tab switching
settingsPanel.querySelectorAll(".stab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = /** @type {HTMLElement} */ (tab).dataset.tab;

    settingsPanel.querySelectorAll(".stab").forEach((t) => {
      t.classList.toggle("active", t === tab);
      t.setAttribute("aria-selected", String(t === tab));
    });

    settingsPanel.querySelectorAll(".stab-panel").forEach((panel) => {
      const el = /** @type {HTMLElement} */ (panel);
      const match = el.id === `tab-${target}`;
      if (match) el.removeAttribute("hidden");
      else el.setAttribute("hidden", "");
    });
  });
});

// ── Collapse / expand ─────────────────────────────────────────────────────────

function toggleCollapse() {
  chatCollapsed = !chatCollapsed;
  document.body.classList.toggle("chat-collapsed", chatCollapsed);
  btnCollapse.setAttribute("aria-label", chatCollapsed ? "Expand chat" : "Collapse chat");
}

btnCollapse.addEventListener("click", toggleCollapse);

// ── Opacity ───────────────────────────────────────────────────────────────────

/** @param {number} value */
function applyOpacity(value) {
  const v = Math.min(100, Math.max(20, Math.round(value)));
  document.body.style.opacity = String(v / 100);
  opacityLabel.textContent    = v + "%";
  opacitySlider.value         = String(v);
}

opacitySlider.addEventListener("input", () => {
  applyOpacity(parseInt(opacitySlider.value, 10));
});

// ── Content protection toggle ─────────────────────────────────────────────────

const toggleProtection = /** @type {HTMLInputElement} */ (document.getElementById("toggle-protection"));

toggleProtection.addEventListener("change", () => {
  window.cloakX.setContentProtection(toggleProtection.checked);
});

// ── Always on top toggle ──────────────────────────────────────────────────────

const toggleOnTop = /** @type {HTMLInputElement} */ (document.getElementById("toggle-ontop"));

toggleOnTop.addEventListener("change", () => {
  window.cloakX.setAlwaysOnTop(toggleOnTop.checked);
});

// ── Close ─────────────────────────────────────────────────────────────────────

btnClose.addEventListener("click", () => window.cloakX.quitApp());

// ── Drag handle ───────────────────────────────────────────────────────────────

(function initDrag() {
  let dragging = false;

  btnDrag.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    dragging = true;
    btnDrag.setAttribute("aria-grabbed", "true");
    window.cloakX.startDrag();
  });

  window.addEventListener("mouseup", () => {
    if (dragging) {
      dragging = false;
      btnDrag.setAttribute("aria-grabbed", "false");
    }
  });
})();

// ── Keyboard movement ─────────────────────────────────────────────────────────

document.addEventListener("keydown", (e) => {
  if (!e.ctrlKey) return;

  const STEP = 40;
  let dx = 0, dy = 0;

  switch (e.key) {
    case "ArrowUp":    dy = -STEP; break;
    case "ArrowDown":  dy = +STEP; break;
    case "ArrowLeft":  dx = -STEP; break;
    case "ArrowRight": dx = +STEP; break;
    default: return;
  }

  e.preventDefault();

  if (e.key === "ArrowDown" && !chatCollapsed) { toggleCollapse(); return; }
  if (e.key === "ArrowUp"   &&  chatCollapsed) { toggleCollapse(); return; }

  window.cloakX.moveWindow(dx, dy);
});

// ── Paste injection ───────────────────────────────────────────────────────────

/** @param {string} text */
function handlePaste(text) {
  if (!text?.trim()) return;

  const selectors = [
    'div[contenteditable="true"]',
    ".ProseMirror",
    '[role="textbox"]',
    "textarea",
    "div[data-placeholder]",
  ];

  const script = "(function(){var sels=" + JSON.stringify(selectors) +
    ";var txt=" + JSON.stringify(text) +
    ";for(var i=0;i<sels.length;i++){var el=document.querySelector(sels[i]);" +
    "if(!el)continue;el.focus();" +
    'document.execCommand("selectAll",false,null);' +
    'document.execCommand("insertText",false,txt);' +
    'el.dispatchEvent(new Event("input",{bubbles:true}));return;}})()';

  webview.executeJavaScript(script).catch(() => {});

  document.body.classList.remove("paste-flash");
  void document.body.offsetWidth;
  document.body.classList.add("paste-flash");
  setTimeout(() => document.body.classList.remove("paste-flash"), 500);
}

window.cloakX.onPasteToChat(handlePaste);

// ── Init ──────────────────────────────────────────────────────────────────────

showLoading();
