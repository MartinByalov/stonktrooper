// Browser game module for main.
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Apply the initial theme before rendering, including when storage is unavailable.
try {
  document.documentElement.dataset.theme = localStorage.getItem('cr_theme') === 'dark' ? 'dark' : 'light';
} catch {
  document.documentElement.dataset.theme = 'light';
}

createRoot(document.getElementById('root')!).render(<App />);
