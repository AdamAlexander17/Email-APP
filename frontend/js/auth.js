/**
 * Auth Module - Token management and authentication utilities
 */

const TOKEN_KEYS = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token'
};

/**
 * Store both access and refresh tokens in localStorage
 * @param {string} accessToken
 * @param {string} refreshToken
 */
function storeTokens(accessToken, refreshToken) {
  localStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
  localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);
}

/**
 * Retrieve access token from localStorage
 * @returns {string|null}
 */
function getAccessToken() {
  return localStorage.getItem(TOKEN_KEYS.ACCESS);
}

/**
 * Retrieve refresh token from localStorage
 * @returns {string|null}
 */
function getRefreshToken() {
  return localStorage.getItem(TOKEN_KEYS.REFRESH);
}

/**
 * Remove both tokens from localStorage
 */
function clearTokens() {
  localStorage.removeItem(TOKEN_KEYS.ACCESS);
  localStorage.removeItem(TOKEN_KEYS.REFRESH);
}

/**
 * Check if user is authenticated (access token exists)
 * @returns {boolean}
 */
function isAuthenticated() {
  return !!getAccessToken();
}

/**
 * Auth guard - redirect to login page if no access token
 */
function authGuard() {
  if (!getAccessToken()) {
    window.location.href = 'login.html';
  }
}
