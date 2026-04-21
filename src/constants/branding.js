/** Resolved URL for bundled logo — reliable in Capacitor / file WebView (import path alone can break with SW or caching). */
export const LOGO_SRC = new URL('../assets/logo.png', import.meta.url).href;
