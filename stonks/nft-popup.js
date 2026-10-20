// Stonk NFT generator popup modal

let overlayEl = null;
let generator = null;
let isGenerating = false;
let currentStonkId = null;

function esc(v) {
  return String(v || '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function ensureStyles() {
  if (document.getElementById('nft-popup-style')) return;
  const style = document.createElement('style');
  style.id = 'nft-popup-style';
  style.textContent = `
    .nft-overlay {
      position: fixed;
      inset: 0;
      z-index: 50000;
      background: rgba(10, 14, 22, 0.75);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      opacity: 0;
      transition: opacity 0.22s ease-out;
    }
    .nft-overlay.open {
      opacity: 1;
    }
    .nft-modal {
      width: min(780px, 96vw);
      max-height: 92vh;
      background: #151821;
      color: #f1f5f9;
      border: 1px solid #2b3245;
      border-radius: 16px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      transform: translateY(12px) scale(0.98);
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .nft-overlay.open .nft-modal {
      transform: translateY(0) scale(1);
    }
    .nft-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      background: #1c2130;
      border-bottom: 1px solid #2b3245;
    }
    .nft-header-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1.05rem;
      font-weight: 700;
      color: #f8fafc;
      letter-spacing: 0.3px;
    }
    .nft-header-badge {
      background: rgba(241, 122, 62, 0.18);
      color: #f17a3e;
      border: 1px solid rgba(241, 122, 62, 0.35);
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .nft-close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 26px;
      line-height: 1;
      width: 34px;
      height: 34px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .nft-close-btn:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.1);
    }
    .nft-body {
      padding: 20px;
      overflow-y: auto;
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 720px) {
      .nft-body {
        grid-template-columns: 1fr;
        gap: 18px;
      }
    }
    .nft-visual-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }
    .nft-canvas-frame {
      width: 100%;
      max-width: 320px;
      aspect-ratio: 1 / 1;
      background: #0d1017;
      border: 2px solid #2d3748;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
      position: relative;
    }
    .nft-canvas {
      width: 100%;
      height: 100%;
      image-rendering: -moz-crisp-edges;
      image-rendering: -webkit-crisp-edges;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      display: block;
    }
    .nft-loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(13, 16, 23, 0.85);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #cbd5e1;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .nft-spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(241, 122, 62, 0.2);
      border-top-color: #f17a3e;
      border-radius: 50%;
      animation: nft-spin 0.8s linear infinite;
    }
    @keyframes nft-spin {
      to { transform: rotate(360deg); }
    }
    .nft-details-col {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .nft-title-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }
    .nft-token-name {
      font-size: 1.45rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.3px;
    }
    .nft-meta-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .nft-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      background: #202636;
      border: 1px solid #2d3748;
      color: #94a3b8;
    }
    .nft-pill.rank {
      background: rgba(240, 185, 11, 0.12);
      border-color: rgba(240, 185, 11, 0.35);
      color: #f0b90b;
    }
    .nft-pill.golden {
      background: rgba(240, 185, 11, 0.2);
      border-color: #f0b90b;
      color: #fef08a;
      font-weight: 700;
    }
    .nft-traits-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 8px;
      background: #0d1117;
      padding: 12px;
      border-radius: 10px;
      border: 1px solid #252d3d;
      max-height: 220px;
      overflow-y: auto;
    }
    .nft-trait-card {
      background: #171c26;
      border: 1px solid #2b3345;
      padding: 6px 10px;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .nft-trait-cat {
      font-size: 0.68rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #718096;
    }
    .nft-trait-val {
      font-size: 0.8rem;
      font-weight: 700;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .nft-trait-card.is-golden {
      border-color: rgba(240, 185, 11, 0.6);
      background: rgba(240, 185, 11, 0.1);
    }
    .nft-trait-card.is-golden .nft-trait-val {
      color: #fef08a;
    }
    .nft-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 4px;
    }
    .nft-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 9px 16px;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.16s ease;
      text-decoration: none;
    }
    .nft-btn-primary {
      background: #f17a3e;
      color: #ffffff;
      flex: 1 1 160px;
    }
    .nft-btn-primary:hover:not(:disabled) {
      background: #e26829;
      transform: translateY(-1px);
    }
    .nft-btn-secondary {
      background: #202636;
      color: #cbd5e1;
      border: 1px solid #333d52;
    }
    .nft-btn-secondary:hover:not(:disabled) {
      background: #2c354a;
      color: #ffffff;
    }
    .nft-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .nft-footer-note {
      font-size: 0.75rem;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
    }
    .nft-footer-note a {
      color: #94a3b8;
      text-decoration: underline;
    }
    .nft-footer-note a:hover {
      color: #f17a3e;
    }
  `;
  document.head.appendChild(style);
}

async function getGenerator() {
  if (generator) return generator;
  const base = new URL('./', import.meta.url).href;
  const module = await import(`${base}js/stonk-generator.js`);
  const gen = new module.StonkGenerator({ basePath: base.replace(/\/$/, '') });
  await gen.load();
  generator = gen;
  return generator;
}

function onKeydown(e) {
  if (e.key === 'Escape') close();
}

export async function open(targetId = null) {
  ensureStyles();
  if (overlayEl) {
    if (targetId) generateNFT(targetId);
    return;
  }

  overlayEl = document.createElement('div');
  overlayEl.className = 'nft-overlay';
  overlayEl.setAttribute('role', 'dialog');
  overlayEl.setAttribute('aria-modal', 'true');
  overlayEl.innerHTML = `
    <div class="nft-modal" onclick="event.stopPropagation()">
      <div class="nft-header">
        <div class="nft-header-title">
          <span>The Stonks</span>
        </div>
        <button type="button" class="nft-close-btn" id="nftCloseBtn" aria-label="Затвори">&times;</button>
      </div>
      <div class="nft-body">
        <div class="nft-visual-col">
          <div class="nft-canvas-frame">
            <canvas id="nftCanvas" class="nft-canvas" width="512" height="512"></canvas>
            <div id="nftLoading" class="nft-loading-overlay">
              <div class="nft-spinner"></div>
              <span id="nftLoadingText">Генериране на Stonk NFT...</span>
            </div>
          </div>
        </div>
        <div class="nft-details-col">
          <div class="nft-title-row">
            <h3 class="nft-token-name" id="nftTokenName">Stonk #...</h3>
            <div class="nft-meta-pills" id="nftMetaPills"></div>
          </div>

          <div class="nft-traits-list" id="nftTraitsList"></div>

          <div class="nft-actions">
            <button type="button" class="nft-btn nft-btn-primary" id="nftRerollBtn">
              <span aria-hidden="true">&#127922;</span> Генерирай
            </button>
            <button type="button" class="nft-btn nft-btn-secondary" id="nftDownloadBtn">
              <span aria-hidden="true">&#8595;</span> Свали PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlayEl);
  requestAnimationFrame(() => overlayEl.classList.add('open'));

  overlayEl.addEventListener('click', close);
  overlayEl.querySelector('#nftCloseBtn').addEventListener('click', close);
  overlayEl.querySelector('#nftRerollBtn').addEventListener('click', () => generateNFT());
  overlayEl.querySelector('#nftDownloadBtn').addEventListener('click', downloadCurrentNFT);
  document.addEventListener('keydown', onKeydown);

  await generateNFT(targetId);
}

export async function generateNFT(tokenId = null) {
  if (!overlayEl || isGenerating) return;
  isGenerating = true;

  const loadingEl = overlayEl.querySelector('#nftLoading');
  const loadingText = overlayEl.querySelector('#nftLoadingText');
  const rerollBtn = overlayEl.querySelector('#nftRerollBtn');
  const canvasEl = overlayEl.querySelector('#nftCanvas');
  const tokenNameEl = overlayEl.querySelector('#nftTokenName');
  const metaPillsEl = overlayEl.querySelector('#nftMetaPills');
  const traitsListEl = overlayEl.querySelector('#nftTraitsList');

  if (loadingEl) loadingEl.style.display = 'flex';
  if (rerollBtn) rerollBtn.disabled = true;

  try {
    const gen = await getGenerator();
    const id = tokenId || gen.randomId();
    currentStonkId = id;

    if (loadingText) loadingText.textContent = `Рендериране на Stonk #${id}...`;

    const info = gen.getStonk(id);
    await gen.render(id, canvasEl, { size: 512 });

    // Update UI
    tokenNameEl.textContent = `Stonk #${id}`;

    const isGolden = info.traits?.some(t =>
      (t.category === 'body' || t.name.toLowerCase().includes('golden')) &&
      t.name.toLowerCase().includes('gold')
    );

    let pillsHtml = `
      <span class="nft-pill rank">
        <span aria-hidden="true">&#127942;</span> Ранг #${esc(info.rarityRank)} / ${esc(info.totalSupply)}
      </span>
      <span class="nft-pill">
        <span aria-hidden="true">&#9733;</span> Рядкост: ${esc(typeof info.rarityScore === 'number' ? info.rarityScore.toFixed(1) : info.rarityScore)}
      </span>
    `;

    if (isGolden) {
      pillsHtml += `
        <span class="nft-pill golden">
          <span aria-hidden="true">&#9819;</span> ЗЛАТНА СВЕЩ (~5%)
        </span>
      `;
    }
    metaPillsEl.innerHTML = pillsHtml;

    // Traits
    traitsListEl.innerHTML = (info.traits || []).map(trait => {
      const traitName = trait.name || 'None';
      const isTraitGolden = traitName.toLowerCase().includes('gold');
      return `
        <div class="nft-trait-card ${isTraitGolden ? 'is-golden' : ''}" title="${esc(trait.label)}: ${esc(traitName)}">
          <span class="nft-trait-cat">${esc(trait.label || trait.category)}</span>
          <span class="nft-trait-val">${esc(traitName)}</span>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Failed to generate NFT:', err);
    if (tokenNameEl) tokenNameEl.textContent = 'Грешка при зареждане';
    if (traitsListEl) traitsListEl.innerHTML = `<div style="color:#ef4444;padding:8px;">${esc(err.message)}</div>`;
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
    if (rerollBtn) rerollBtn.disabled = false;
    isGenerating = false;
  }
}

function downloadCurrentNFT() {
  if (!overlayEl) return;
  const canvas = overlayEl.querySelector('#nftCanvas');
  if (!canvas) return;

  const link = document.createElement('a');
  link.download = `stonk-${currentStonkId || 'nft'}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function close() {
  document.removeEventListener('keydown', onKeydown);
  if (overlayEl) {
    const el = overlayEl;
    overlayEl = null;
    el.classList.remove('open');
    setTimeout(() => el.remove(), 220);
  }
}
