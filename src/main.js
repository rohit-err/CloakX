"use strict";

const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  globalShortcut,
  clipboard,
} = require("electron");
const path = require("path");

/** @type {BrowserWindow | null} */
let win = null;

const IS_DEV = process.argv.includes("--dev");

/**
 * Creates the main application window.
 * Positioned bottom-right, protected from all screen recorders.
 */
function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // Clamp position so window is never off-screen on smaller displays
  const winW = 920;
  const winH = 680;
  const x = Math.max(0, width - winW - 20);
  const y = Math.max(0, height - winH - 20);

  win = new BrowserWindow({
    width: winW,
    height: winH,
    x,
    y,
    minWidth: 520,
    minHeight: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    // Don't show until ready — prevents white flash on startup
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // Required for <webview> tag to work
      webviewTag: true
    },
  });

  // Makes window invisible to ALL screen recorders (Zoom, Meet, Teams, OBS)
  win.setContentProtection(true);

  // Push always on top level to 'screen-saver' so it displays above fullscreen presentations
  win.setAlwaysOnTop(true, "screen-saver");

  win.loadFile(path.join(__dirname, "index.html"));

  win.once("ready-to-show", () => {
    win.show();
    win.focus();
  });

  // Clean up reference when window is closed
  win.on("closed", () => {
    win = null;
  });

  if (IS_DEV) win.webContents.openDevTools({ mode: "detach" });
}

/**
 * Registers global shortcuts.
 * Called after app is ready — globalShortcut requires app ready state.
 */
function registerShortcuts() {
  // Toggle window visibility
  globalShortcut.register("CommandOrControl+Shift+Space", () => {
    if (!win || win.isDestroyed()) return;
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  });

  // Read clipboard and forward to renderer for injection into webview
  globalShortcut.register("CommandOrControl+Shift+V", () => {
    // Guard: win might be null if closed, or not visible
    if (!win || win.isDestroyed() || !win.isVisible()) return;
    const text = clipboard.readText().trim();
    if (text) win.webContents.send("paste-to-chat", text);
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();
  registerShortcuts();
});

app.on("window-all-closed", () => {
  globalShortcut.unregisterAll();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  globalShortcut.unregisterAll();
});

// macOS: re-create window when dock icon is clicked and no windows exist
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
    registerShortcuts();
  }
});

// Suppress unhandled promise rejections from webview navigation aborts (e.g. ERR_ABORTED) 
// to prevent the application from crashing.
process.on("unhandledRejection", (error) => {
  if (error && error.code === "ERR_ABORTED") {
    return; // Ignore benign aborts like client-side redirects
  }
  console.error("Unhandled Rejection:", error);
});
