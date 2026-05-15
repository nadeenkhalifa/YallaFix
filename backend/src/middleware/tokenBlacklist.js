const blacklistedTokens = new Set();

function addBlacklistedToken(token) {
  if (token) {
    blacklistedTokens.add(token);
  }
}

function isTokenBlacklisted(token) {
  return token && blacklistedTokens.has(token);
}

module.exports = {
  addBlacklistedToken,
  isTokenBlacklisted,
};
