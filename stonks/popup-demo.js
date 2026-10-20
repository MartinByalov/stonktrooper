import { open } from './nft-popup.js';

document.getElementById('openStonksPopup').addEventListener('click', () => {
  open().catch(err => console.error('Failed to open Stonks:', err));
});