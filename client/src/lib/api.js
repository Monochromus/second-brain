const API_BASE = import.meta.env.VITE_API_URL || '/api';

const TOKEN_KEY = 'secondbrain_token';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// Token management
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  };

  // Add Authorization header if token exists
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      // Clear token on 401 (unauthorized)
      if (response.status === 401) {
        clearToken();
      }
      throw new ApiError(data.error || 'Ein Fehler ist aufgetreten', response.status);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new ApiError('Keine Verbindung zum Server', 0);
    }
    throw new ApiError(error.message || 'Ein unbekannter Fehler ist aufgetreten', 500);
  }
}

// FormData Upload (für Bilder)
async function uploadFormData(endpoint, formData) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();

  const config = {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: {}
  };

  // Authorization Header hinzufügen (KEIN Content-Type - Browser setzt es automatisch mit Boundary)
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        clearToken();
      }
      throw new ApiError(data.error || 'Ein Fehler ist aufgetreten', response.status);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new ApiError('Keine Verbindung zum Server', 0);
    }
    throw new ApiError(error.message || 'Ein unbekannter Fehler ist aufgetreten', 500);
  }
}

export const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
  upload: uploadFormData,
};

export { ApiError };
