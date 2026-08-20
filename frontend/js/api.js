/**
 * API Client - Fetch wrapper with automatic token injection and refresh logic
 */

const API_BASE_URL = 'https://email-query.work.gd';

let isRefreshing = false;
let refreshQueue = [];

/**
 * Process queued requests after token refresh
 * @param {string|null} newToken - The new access token, or null if refresh failed
 * @param {Error|null} error - Error if refresh failed
 */
function processQueue(newToken, error) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(newToken);
    }
  });
  refreshQueue = [];
}

/**
 * Attempt to refresh the access token
 * Retries up to 3 times with 1-second delay on failure
 * @returns {Promise<string>} The new access token
 */
async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (response.status === 401) {
        // Refresh token is invalid/expired — no point retrying
        throw new Error('Refresh token invalid');
      }

      if (!response.ok) {
        throw new Error(`Refresh failed with status ${response.status}`);
      }

      const data = await response.json();
      // Store new access token (keep existing refresh token)
      localStorage.setItem('access_token', data.access_token);
      return data.access_token;
    } catch (error) {
      // If refresh token is invalid, don't retry
      if (error.message === 'Refresh token invalid') {
        throw error;
      }

      // If this was the last attempt, throw
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Main API request function with automatic auth and token refresh
 * @param {string} url - The API endpoint URL
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<object>} Parsed JSON response
 */
async function apiRequest(url, options = {}) {
  // Inject Authorization header
  const accessToken = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const fetchOptions = {
    ...options,
    headers
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${url}`, fetchOptions);
  } catch (error) {
    throw new Error('Server is unavailable');
  }

  // If not 401, return the response
  if (response.status !== 401) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Something went wrong' }));
      const err = new Error(errorData.detail || 'Request failed');
      err.status = response.status;
      err.data = errorData;
      throw err;
    }
    return await response.json();
  }

  // Handle 401 — trigger token refresh flow
  if (isRefreshing) {
    // Queue this request and wait for refresh to complete
    return new Promise((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    }).then(newToken => {
      // Retry original request with new token
      headers['Authorization'] = `Bearer ${newToken}`;
      return fetch(`${API_BASE_URL}${url}`, { ...options, headers })
        .then(res => {
          if (!res.ok) {
            return res.json().catch(() => ({ detail: 'Something went wrong' })).then(data => {
              const err = new Error(data.detail || 'Request failed');
              err.status = res.status;
              err.data = data;
              throw err;
            });
          }
          return res.json();
        });
    });
  }

  isRefreshing = true;

  try {
    const newToken = await refreshAccessToken();
    isRefreshing = false;
    processQueue(newToken, null);

    // Retry original request with new token
    headers['Authorization'] = `Bearer ${newToken}`;
    const retryResponse = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });

    if (!retryResponse.ok) {
      const errorData = await retryResponse.json().catch(() => ({ detail: 'Something went wrong' }));
      const err = new Error(errorData.detail || 'Request failed');
      err.status = retryResponse.status;
      err.data = errorData;
      throw err;
    }

    return await retryResponse.json();
  } catch (error) {
    isRefreshing = false;
    processQueue(null, error);

    // Clear tokens and redirect to login
    clearTokens();
    window.location.href = 'login.html';
    throw error;
  }
}
