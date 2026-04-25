"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cloakX", {
  /**
   * Register a callback for when main process triggers paste-to-chat.
   * Returns a cleanup function to remove the listener.
   * @param {(text: string) => void} cb
   * @returns {() => void} cleanup
   */
  onPasteToChat(cb) {
    const handler = (_, text) => cb(text);
    ipcRenderer.on("paste-to-chat", handler);
    // Return a cleanup function so the listener can be removed if needed
    return () => ipcRenderer.removeListener("paste-to-chat", handler);
  },

  /**
   * Set content protection (screen recording visibility).
   * @param {boolean} enabled
   */
  setContentProtection(enabled) {
    ipcRenderer.send("set-content-protection", enabled);
  },

  /**
   * Set always on top.
   * @param {boolean} enabled
   */
  setAlwaysOnTop(enabled) {
    ipcRenderer.send("set-always-on-top", enabled);
  },

  /**
   * Start window drag.
   */
  startDrag() {
    ipcRenderer.send("start-drag");
  },

  /**
   * Move window by delta.
   * @param {number} dx
   * @param {number} dy
   */
  moveWindow(dx, dy) {
    ipcRenderer.send("move-window", dx, dy);
  },

  /**
   * Quit the application.
   */
  quitApp() {
    ipcRenderer.send("quit-app");
  },
});
