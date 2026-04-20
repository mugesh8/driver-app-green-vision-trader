// Dev: `/api/v1` is proxied by Vite (vite.config.js).
// Production / Play Store: must be absolute — the WebView origin is https://localhost, so `/api/v1` would not hit your server.
// CapacitorHttp (capacitor.config.json) routes fetch through native code so API CORS does not block the app.
// Override with VITE_API_URL when building if your API host differs.
const productionApiBase =
  import.meta.env.VITE_API_URL || 'https://driver.brightgemr1.com/api/v1';

export const API_BASE_URL = import.meta.env.DEV
  ? '/api/v1'
  : productionApiBase;

export const API_ENDPOINTS = {
  DRIVER_LOGIN: '/driver/login',
};
