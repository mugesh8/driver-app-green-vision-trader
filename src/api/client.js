import { API_BASE_URL } from './config';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const { silent, ...fetchOptions } = options;
  const config = {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  };
  if (config.body === undefined) {
    delete config.body;
  }

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (!silent) console.error('API Error Response:', data);
    const error = new Error(data.message || data.error || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function post(endpoint, body, token) {
  return request(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function get(endpoint, token, options = {}) {
  return request(endpoint, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    ...options,
  });
}

export async function put(endpoint, body, token) {
  return request(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body || {}),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export async function putFormData(endpoint, formData, token) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export async function patch(endpoint, body, token) {
  return request(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body || {}),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export async function del(endpoint, token) {
  return request(endpoint, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
