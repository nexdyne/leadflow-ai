const API_BASE = import.meta.env.VITE_API_URL || '/api';

let authToken = localStorage.getItem('leadflow_token');
let refreshToken = localStorage.getItem('leadflow_refresh');
let onAuthFailure = null;

export function setTokens(token, refresh) {
  authToken = token;
  refreshToken = refresh;
  if (token) {
    localStorage.setItem('leadflow_token', token);
  } else {
    localStorage.removeItem('leadflow_token');
  }
  if (refresh) {
    localStorage.setItem('leadflow_refresh', refresh);
  } else {
    localStorage.removeItem('leadflow_refresh');
  }
}

export function clearTokens() {
  authToken = null;
  refreshToken = null;
  localStorage.removeItem('leadflow_token');
  localStorage.removeItem('leadflow_refresh');
}

export function getToken() {
  return authToken;
}

export function setOnAuthFailure(callback) {
  onAuthFailure = callback;
}

async function attemptRefresh() {
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;

    const data = await res.json();
    setTokens(data.token, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function apiCall(method, endpoint, data = null, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const config = { method, headers };

  if (data && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    config.body = JSON.stringify(data);
  }

  let res = await fetch(`${API_BASE}${endpoint}`, config);

  // If token expired, try refresh
  if (res.status === 401 && refreshToken) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${authToken}`;
      config.headers = headers;
      res = await fetch(`${API_BASE}${endpoint}`, config);
    } else {
      clearTokens();
      if (onAuthFailure) onAuthFailure();
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err = new Error(errorData.error || `API error: ${res.status}`);
    err.code = errorData.code;
    err.status = res.status;
    throw err;
  }

  return res.json();
}
