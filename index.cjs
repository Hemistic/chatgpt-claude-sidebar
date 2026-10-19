'use strict';
const path = require('node:path');
const { configureHost } = require('./src/host-config');
exports.configureHost = configureHost;
exports.sourcePath = (name) => {
  const root = path.join(__dirname, 'src');
  const result = path.resolve(root, name);
  if (!result.startsWith(root + path.sep)) throw new Error('Invalid sidebar resource path');
  return result;
};
exports.register = (ipcMain, options = {}) => {
  configureHost(options);
  return require('./src/claudian-sidebar-runtime').registerClaudianSidebarRuntime(ipcMain, options);
};
