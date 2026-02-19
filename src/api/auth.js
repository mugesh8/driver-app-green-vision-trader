import { post } from './client';
import { API_ENDPOINTS } from './config';

const TOKEN_KEY = 'driver_token';
const USER_KEY = 'driver_user';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function storeAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user || {}));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function loginDriver(email, password) {
  const data = await post(API_ENDPOINTS.DRIVER_LOGIN, { email, password });
  return data;
}
