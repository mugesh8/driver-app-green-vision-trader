import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/** Runs only in Capacitor Android/iOS — not used in plain `vite build` for the website. */
export function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
  }
  StatusBar.setOverlaysWebView({ overlay: false })
    .then(() => StatusBar.setBackgroundColor({ color: '#1A1A1A' }))
    .then(() => StatusBar.setStyle({ style: Style.Dark }))
    .catch(() => {});
}
