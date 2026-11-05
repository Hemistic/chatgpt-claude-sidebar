'use strict';
const fs = require('node:fs');

// Capture the current Chromium compositor surface after a painted frame. OS-backed
// captures can be black or stale when the user is working in another window.
module.exports = async function captureUI(window, filePath) {
  const contents = window.webContents;
  const restoreHidden = !window.isVisible();
  if (restoreHidden) window.showInactive();
  const debuggerClient = contents.debugger;
  const attachedHere = !debuggerClient.isAttached();
  if (attachedHere) debuggerClient.attach('1.3');
  try {
    await debuggerClient.sendCommand('Page.bringToFront');
    await contents.executeJavaScript('document.fonts.ready.then(() => Promise.race([new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))), new Promise(resolve => setTimeout(resolve, 500))]))');
    const result = await debuggerClient.sendCommand('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    fs.writeFileSync(filePath, Buffer.from(result.data, 'base64'));
  } finally {
    if (attachedHere && debuggerClient.isAttached()) debuggerClient.detach();
    if (restoreHidden && !window.isDestroyed()) window.hide();
  }
};
