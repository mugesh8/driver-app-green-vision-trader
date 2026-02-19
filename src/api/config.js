// Use relative URL in dev (proxied by Vite) to avoid CORS
// Set VITE_API_URL for production (e.g. http://localhost:8000/api/v1)
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || '/api/v1';

export const API_ENDPOINTS = {
  DRIVER_LOGIN: '/driver/login',
};
