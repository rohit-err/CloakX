"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cheatX", {
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

});
