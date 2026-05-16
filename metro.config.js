const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Prevent Metro from bundling Node.js-only scripts
config.resolver.blockList = [
  /.*\/scripts\/reset-project\.js$/,
];

module.exports = config;
