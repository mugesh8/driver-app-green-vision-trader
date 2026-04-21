import { CapacitorHttp } from '@capacitor/core';
import { API_BASE_URL } from './config';

async function request(endpoint, method, body, token, silent = false) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const options = { url, headers };
  if (body !== undefined) options.data = body;

  let response;
  if (method === 'GET')         response = await CapacitorHttp.get(options);
  else if (method === 'POST')   response = await CapacitorHttp.post(options);
  else if (method === 'PUT')    response = await CapacitorHttp.put(options);
  else if (method === 'PATCH')  response = await CapacitorHttp.patch(options);
  else if (method === 'DELETE') response = await CapacitorHttp.delete(options);

  const data = response.data || {};

  if (response.status < 200 || response.status >= 300) {
    if (!silent) console.error('API Error Response:', data);
    const error = new Error(data.message || data.error || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function post(endpoint, body, token) {
  return request(endpoint, 'POST', body, token);
}

export async function get(endpoint, token, options = {}) {
  return request(endpoint, 'GET', undefined, token);
}

export async function put(endpoint, body, token) {
  return request(endpoint, 'PUT', body, token);
}

export async function patch(endpoint, body, token) {
  return request(endpoint, 'PATCH', body, token);
}

export async function del(endpoint, token) {
  return request(endpoint, 'DELETE', undefined, token);
}

export async function putFormData(endpoint, formData, token) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await CapacitorHttp.put({
    url,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    data: formData,
  });
  const data = response.data || {};
  if (response.status < 200 || response.status >= 300) {
    const error = new Error(data.message || data.error || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}