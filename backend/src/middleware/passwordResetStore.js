const activeResetTokens = new Map();

function storeResetToken(userId, token) {
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
  activeResetTokens.set(token, { userId, expiresAt });
}

function verifyResetToken(token) {
  const entry = activeResetTokens.get(token);
  if (!entry || entry.expiresAt < Date.now()) {
    return null;
  }
  return entry.userId;
}

function deleteResetToken(token) {
  activeResetTokens.delete(token);
}

module.exports = {
  storeResetToken,
  verifyResetToken,
  deleteResetToken,
};
