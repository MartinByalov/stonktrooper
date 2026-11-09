// Browser game module for main.
import {createRoot} from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App.tsx';
import './fonts.css';
import './index.css';
import './cornerControls.css';
import './desktopHome.css';
import './mobileBrowserParts.css';
import { reportBootStage } from './bootProgress';

// Apply the initial theme before rendering, including when storage is unavailable.
if (Capacitor.isNativePlatform()) document.documentElement.dataset.native = 'true';
try {
  document.documentElement.dataset.theme = localStorage.getItem('cr_theme') === 'dark' ? 'dark' : 'light';
} catch {
  document.documentElement.dataset.theme = 'light';
}

reportBootStage('script');
createRoot(document.getElementById('root')!).render(<App />);

// Offline play in the browser: the game is kept after the first visit and opens even when the site cannot be reached.
if (import.meta.env.PROD && !Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* The game still works online. */ }); });
}
