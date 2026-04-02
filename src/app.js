"use strict";

const AI_URLS = {
  chatgpt: "https://chatgpt.com",
  grok: "https://grok.com",
  claude: "https://claude.ai",
  gemini: "https://gemini.google.com",
};

// ── Element refs ──────────────────────────────────────────────────────────────

const webview = /** @type {Electron.WebviewTag} */ (
  document.getElementById("ai-webview")
);
const loadingOverlay = /** @type {HTMLElement} */ (
  document.getElementById("loading-overlay")
);
const opacitySlider = /** @type {HTMLInputElement} */ (
  document.getElementById("opacity-slider")
);
const opacityLabel = /** @type {HTMLElement} */ (
  document.getElementById("opacity-label")
);
const aiTabs = /** @type {HTMLElement} */ (document.getElementById("ai-tabs"));

// ── State ─────────────────────────────────────────────────────────────────────

let currentAI = "chatgpt";

// ── Loading overlay ───────────────────────────────────────────────────────────

function showLoading() {
  loadingOverlay.classList.remove("hidden");
}

function hideLoading() {
  loadingOverlay.classList.add("hidden");
}

// Hide overlay once the page finishes loading (or fails — don't block UI)
webview.addEventListener("did-finish-load", hideLoading);
webview.addEventListener("did-fail-load", hideLoading);

// ── AI tab switching ──────────────────────────────────────────────────────────

/**
 * Switches the active AI provider.
 * No-ops if the same AI is already active.
 * @param {string} ai - Key from AI_URLS
 */
function switchAI(ai) {
  if (ai === currentAI || !AI_URLS[ai]) return;
  currentAI = ai;

  // Update tab active state + aria attributes
  aiTabs.querySelectorAll(".tab").forEach((tab) => {
    const isActive = tab.dataset.ai === ai;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  showLoading();
  webview.src = AI_URLS[ai];
}

// Single delegated listener on the nav — no per-button listeners
aiTabs.addEventListener("click", (e) => {
  const tab = /** @type {HTMLElement} */ (e.target).closest(".tab");
  if (tab && tab.dataset.ai) switchAI(tab.dataset.ai);
});

// ── Opacity control ───────────────────────────────────────────────────────────

/**
 * Applies opacity to the window body.
 * Min 20% so the window is never fully invisible (user could lose it).
 * @param {number} value - Integer 20–100
 */
function applyOpacity(value) {
  const clamped = Math.min(100, Math.max(20, Math.round(value)));
  document.body.style.opacity = String(clamped / 100);
  opacityLabel.textContent = clamped + "%";
  opacitySlider.value = String(clamped);
}

opacitySlider.addEventListener("input", () => {
  applyOpacity(parseInt(opacitySlider.value, 10));
});

// ── Paste shortcut ────────────────────────────────────────────────────────────

/**
 * Injects text into the active AI's chat input directly via the webview element.
 * Provides a brief visual flash as confirmation feedback to the user.
 * @param {string} text
 */
function handlePaste(text) {
  if (!text || !text.trim()) return;

  const selectors = [
    'div[contenteditable="true"]',
    ".ProseMirror",
    '[role="textbox"]',
    "textarea",
    "div[data-placeholder]",
    "p[data-placeholder]",
  ];

  const innerScript = [
    "(function(){",
    "  var sels = " + JSON.stringify(selectors) + ";",
    "  var txt  = " + JSON.stringify(text) + ";",
    "  for (var i = 0; i < sels.length; i++) {",
    "    var el = document.querySelector(sels[i]);",
    "    if (!el) continue;",
    "    el.focus();",
    '    document.execCommand("selectAll", false, null);',
    '    document.execCommand("insertText", false, txt);',
    '    el.dispatchEvent(new Event("input", { bubbles: true }));',
    "    return true;",
    "  }",
    "  return false;",
    "})()"
  ].join("\n");

  webview.executeJavaScript(innerScript).catch(() => { });

  // Flash border as visual confirmation — remove class first to allow re-trigger
  document.body.classList.remove("paste-flash");
  // Force reflow so animation restarts even if called rapidly
  void document.body.offsetWidth;
  document.body.classList.add("paste-flash");
  setTimeout(() => document.body.classList.remove("paste-flash"), 500);
}

window.cheatX.onPasteToChat(handlePaste);

// ── Init ──────────────────────────────────────────────────────────────────────

// Show loading overlay on startup — webview begins loading immediately
showLoading();
