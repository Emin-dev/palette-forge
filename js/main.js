// main.js — UI wiring for Palette Forge. Ties together color-math,
// harmonies, contrast, image-extract, export-formats, and checkout.
// Purely client-side: no fetch/XHR anywhere in this file.

import { normalizeHex } from './color-math.js';
import { generateHarmony, HARMONY_TYPES } from './harmonies.js';
import { contrastAgainstWhiteAndBlack } from './contrast.js';
import { extractDominantColorFromImage } from './image-extract.js';
import { exportPalette } from './export-formats.js';
import { validateCard, submitSandboxPayment, getOneTimePriceUSD, DECLINE_TEST_CARD } from './checkout.js';

const FREE_HARMONY = 'complementary';
const FREE_FORMAT = 'css';

const state = {
  baseHex: '#3366cc',
  harmonyType: FREE_HARMONY,
  exportFormat: FREE_FORMAT,
  unlocked: false,
  palette: [],
};

// ---- DOM refs ----
const colorPicker = document.getElementById('color-picker');
const hexInput = document.getElementById('hex-input');
const imageInput = document.getElementById('image-input');
const imagePreviewWrap = document.getElementById('image-preview-wrap');
const imagePreview = document.getElementById('image-preview');
const extractStatus = document.getElementById('extract-status');
const harmonyTabs = document.getElementById('harmony-tabs');
const swatchGrid = document.getElementById('swatch-grid');
const exportTabs = document.getElementById('export-tabs');
const exportOutput = document.getElementById('export-output');
const btnCopy = document.getElementById('btn-copy');
const btnDownload = document.getElementById('btn-download');
const copyStatus = document.getElementById('copy-status');

const btnHelp = document.getElementById('btn-help');
const btnCloseHelp = document.getElementById('btn-close-help');
const modalHelp = document.getElementById('modal-help');

const btnBuy = document.getElementById('btn-buy');
const btnCancelBuy = document.getElementById('btn-cancel-buy');
const btnConfirmBuy = document.getElementById('btn-confirm-buy');
const modalBuy = document.getElementById('modal-buy');
const cardNumber = document.getElementById('card-number');
const cardExpiry = document.getElementById('card-expiry');
const cardCvc = document.getElementById('card-cvc');
const errNumber = document.getElementById('err-number');
const errExpiry = document.getElementById('err-expiry');
const errCvc = document.getElementById('err-cvc');
const paymentStatus = document.getElementById('payment-status');

// ---- Rendering ----

function renderSwatches() {
  state.palette = generateHarmony(state.baseHex, state.harmonyType);
  swatchGrid.innerHTML = '';
  for (const swatch of state.palette) {
    const contrast = contrastAgainstWhiteAndBlack(swatch.hex);
    const card = document.createElement('div');
    card.className = 'swatch';

    const colorBlock = document.createElement('div');
    colorBlock.className = 'swatch-color';
    colorBlock.style.background = swatch.hex;

    const info = document.createElement('div');
    info.className = 'swatch-info';

    const hexLabel = document.createElement('span');
    hexLabel.className = 'swatch-hex';
    hexLabel.textContent = swatch.hex;

    const roleLabel = document.createElement('span');
    roleLabel.className = 'swatch-role';
    roleLabel.textContent = swatch.role.replace(/-/g, ' ');

    const badges = document.createElement('div');
    badges.className = 'contrast-badges';
    badges.appendChild(makeBadge(`${contrast.onWhite.ratio.toFixed(2)}:1 white AA`, contrast.onWhite.aaNormal));
    badges.appendChild(makeBadge(`${contrast.onWhite.ratio.toFixed(2)}:1 white AAA`, contrast.onWhite.aaaNormal));
    badges.appendChild(makeBadge(`${contrast.onBlack.ratio.toFixed(2)}:1 black AA`, contrast.onBlack.aaNormal));
    badges.appendChild(makeBadge(`${contrast.onBlack.ratio.toFixed(2)}:1 black AAA`, contrast.onBlack.aaaNormal));

    info.append(hexLabel, roleLabel, badges);
    card.append(colorBlock, info);
    swatchGrid.appendChild(card);
  }
  renderExport();
}

function makeBadge(text, passes) {
  const span = document.createElement('span');
  span.className = `contrast-badge ${passes ? 'pass' : 'fail'}`;
  span.textContent = `${passes ? '✓' : '✕'} ${text}`;
  return span;
}

function renderExport() {
  const namedColors = state.palette.map((c) => ({ name: c.role, hex: c.hex }));
  exportOutput.textContent = exportPalette(namedColors, state.exportFormat);
}

function updateHarmonyTabsLockState() {
  for (const tab of harmonyTabs.querySelectorAll('.harmony-tab')) {
    const type = tab.dataset.type;
    const isLocked = !state.unlocked && type !== FREE_HARMONY;
    tab.classList.toggle('active', type === state.harmonyType);
    tab.setAttribute('aria-selected', String(type === state.harmonyType));
    if (isLocked) {
      if (!tab.querySelector('.lock')) {
        const lock = document.createElement('span');
        lock.className = 'lock';
        lock.textContent = ' 🔒';
        tab.appendChild(lock);
      }
    } else {
      const lock = tab.querySelector('.lock');
      if (lock) lock.remove();
    }
  }
}

function updateExportTabsLockState() {
  for (const tab of exportTabs.querySelectorAll('.export-tab')) {
    const format = tab.dataset.format;
    tab.classList.toggle('active', format === state.exportFormat);
    tab.setAttribute('aria-selected', String(format === state.exportFormat));
    const isLocked = !state.unlocked && format !== FREE_FORMAT;
    tab.dataset.locked = String(isLocked);
    const existingLock = tab.querySelector('.lock');
    if (isLocked && !existingLock) {
      const lock = document.createElement('span');
      lock.className = 'lock';
      lock.textContent = ' 🔒';
      tab.appendChild(lock);
    } else if (!isLocked && existingLock) {
      existingLock.remove();
    }
  }
}

// ---- Base color input ----

function setBaseColor(hex, { fromPicker = false, fromHexInput = false } = {}) {
  try {
    const normalized = normalizeHex(hex);
    state.baseHex = normalized;
    if (!fromPicker) colorPicker.value = normalized;
    if (!fromHexInput) hexInput.value = normalized;
    hexInput.classList.remove('input-error');
    renderSwatches();
  } catch {
    // Invalid partial hex while typing — ignore silently until it's valid.
  }
}

colorPicker.addEventListener('input', (e) => setBaseColor(e.target.value, { fromPicker: true }));
hexInput.addEventListener('input', (e) => setBaseColor(e.target.value, { fromHexInput: true }));

// ---- Harmony tabs ----

harmonyTabs.addEventListener('click', (e) => {
  const tab = e.target.closest('.harmony-tab');
  if (!tab) return;
  const type = tab.dataset.type;
  if (!state.unlocked && type !== FREE_HARMONY) {
    openBuyModal();
    return;
  }
  state.harmonyType = type;
  updateHarmonyTabsLockState();
  renderSwatches();
});

// ---- Export tabs ----

exportTabs.addEventListener('click', (e) => {
  const tab = e.target.closest('.export-tab');
  if (!tab) return;
  const format = tab.dataset.format;
  if (!state.unlocked && format !== FREE_FORMAT) {
    openBuyModal();
    return;
  }
  state.exportFormat = format;
  updateExportTabsLockState();
  renderExport();
});

// ---- Copy / download ----

btnCopy.addEventListener('click', async () => {
  const text = exportOutput.textContent;
  try {
    await navigator.clipboard.writeText(text);
    copyStatus.textContent = 'Copied to clipboard.';
  } catch {
    copyStatus.textContent = 'Could not copy automatically — select the text and copy manually.';
  }
  setTimeout(() => { copyStatus.textContent = ''; }, 2500);
});

btnDownload.addEventListener('click', () => {
  const ext = state.exportFormat === 'style-dictionary' ? 'json' : state.exportFormat === 'tailwind' ? 'js' : 'css';
  const filename = `palette-forge-${state.exportFormat}.${ext}`;
  const blob = new Blob([exportOutput.textContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// ---- Image upload / extraction ----

imageInput.addEventListener('change', () => {
  const file = imageInput.files && imageInput.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  imagePreview.src = url;
  imagePreviewWrap.hidden = false;
  extractStatus.textContent = 'Analyzing image…';

  imagePreview.onload = () => {
    try {
      const dominant = extractDominantColorFromImage(imagePreview);
      setBaseColor(dominant.hex);
      extractStatus.textContent = `Extracted dominant color: ${dominant.hex}`;
    } catch (err) {
      extractStatus.textContent = 'Could not analyze this image.';
      console.error(err);
    } finally {
      URL.revokeObjectURL(url);
    }
  };
});

// ---- Help modal ----

btnHelp.addEventListener('click', () => { modalHelp.hidden = false; });
btnCloseHelp.addEventListener('click', () => { modalHelp.hidden = true; });

// ---- Buy modal / checkout ----

function openBuyModal() {
  paymentStatus.textContent = '';
  paymentStatus.className = 'payment-status';
  errNumber.textContent = '';
  errExpiry.textContent = '';
  errCvc.textContent = '';
  modalBuy.hidden = false;
}

btnBuy.addEventListener('click', openBuyModal);
btnCancelBuy.addEventListener('click', () => { modalBuy.hidden = true; });

btnConfirmBuy.addEventListener('click', async () => {
  errNumber.textContent = '';
  errExpiry.textContent = '';
  errCvc.textContent = '';
  paymentStatus.textContent = '';
  paymentStatus.className = 'payment-status';

  const { valid, errors } = validateCard({
    number: cardNumber.value,
    expiry: cardExpiry.value,
    cvc: cardCvc.value,
  });

  if (!valid) {
    if (errors.number) errNumber.textContent = errors.number;
    if (errors.expiry) errExpiry.textContent = errors.expiry;
    if (errors.cvc) errCvc.textContent = errors.cvc;
    return;
  }

  btnConfirmBuy.disabled = true;
  paymentStatus.textContent = 'Processing sandbox payment…';

  const result = await submitSandboxPayment({ number: cardNumber.value });
  btnConfirmBuy.disabled = false;

  if (result.ok) {
    paymentStatus.textContent = `${result.message} Reference: ${result.reference}`;
    paymentStatus.className = 'payment-status success';
    state.unlocked = true;
    updateHarmonyTabsLockState();
    updateExportTabsLockState();
    setTimeout(() => { modalBuy.hidden = true; }, 1600);
  } else {
    paymentStatus.textContent = result.message;
    paymentStatus.className = 'payment-status error';
  }
});

// ---- Init ----

setBaseColor(state.baseHex);
updateHarmonyTabsLockState();
updateExportTabsLockState();

// Expose the documented decline test card + price in a way that's easy to
// spot-check from a console / browser eval during verification, without
// affecting normal operation.
window.__paletteForgeDebug = { DECLINE_TEST_CARD, getOneTimePriceUSD, HARMONY_TYPES, state };
