'use strict';

// GUI launchers may close their inherited stdout/stderr pipes while Electron
// stays open. A diagnostic write must never turn into a native error dialog.
function protectOutput(stream) {
  if (!stream || stream.__sidebarOutputProtected) return;
  stream.__sidebarOutputProtected = true;
  stream.on('error', error => {
    if (['EPIPE', 'ERR_STREAM_DESTROYED'].includes(error?.code)) return;
    // Logging is best effort; runtime errors have their own file/report path.
  });
}
protectOutput(process.stdout);
protectOutput(process.stderr);
module.exports = { protectOutput };
