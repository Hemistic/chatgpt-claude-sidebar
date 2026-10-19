'use strict';
const path = require('node:path');
let config = { projectRoot: process.cwd(), electronDir: path.join(process.cwd(), 'electron') };
function configureHost(options = {}) {
  if (options.projectRoot) config.projectRoot = path.resolve(options.projectRoot);
  if (options.electronDir) config.electronDir = path.resolve(options.electronDir);
  return { ...config };
}
function getHostConfig() { return { ...config }; }
module.exports = { configureHost, getHostConfig };
