/**
 * thatwomanloves — Frontend Application
 * =======================================
 * Features:
 *  - Fetch & render product catalog from Worker API
 *  - Multi-filter: brand, category, size, price range
 *  - Polaroid card layout with size selector
 *  - Product detail modal
 *  - Sliding cart drawer with quantity controls
 *  - Midtrans Snap pop-up payment integration
 *  - Toast notifications
 */

'use strict';

// ── Config ────────────────────────────────────────────────────────────────────
// In production, the Worker is on the same origin as the Pages site.
// During local dev (wrangler dev), the Worker may be on localhost:8787.
//const API_BASE = window.location.hostname === 'localhost'
  //? 'http://localhost:8787'
  //: '';
const API_BASE = 'http://127.0.0.1:8787';

// ── State ─────────────────────────────────────────────────────────────────────
let allProducts   = [];
let allBrands     = [];
let allCategories = [];
let cart          = [];          // [{ product, size, quantity }]
let modalProduct  = null;
let modalSelectedSize = null;

// ── DOM Refs ──────────────────────────────────────────────────────────────────
const productsGrid    = document.getElementById('productsGrid');
const cartCount       = document.getElementById('cartCount');
const resultsCount    = document.getElementById('resultsCount');
const filterBrand     = document.getElementById('filterBrand');
const filterCategory  = document.getElementById('filterCategory');
const filterSize      = document.getElementById('filterSize');
const filterMinPrice  = document.getElementById('filterMinPrice');
const filterMaxPrice  = document.getElementById('filterMaxPrice');
const applyFilterBtn  = document.getElementById('applyFilterBtn');
const clearFilterBtn  = document.getElementById('clearFilterBtn');
const filterChips     = document.getElementById('filterChips');
const cartToggleBtn   = document.getElementById('cartToggleBtn');
const drawerOverlay   = document.getElementById('drawerOverlay');
const cartDrawer      = document.getElementById('cartDrawer');
const drawerCloseBtn  = document.getElementById('drawerCloseBtn');
const cartItems       = document.getElementById('cartItems');
const drawerFooter    = document.getElementById('drawerFooter');
const cartSubtotal    = document.getElementById('cartSubtotal');
const cartTotal       = document.getElementById('cartTotal');
const checkoutBtn     = document.getElementById('checkoutBtn');
const custName        = document.getElementById('custName');
const custEmail       = document.getElementById('custEmail');
const custPhone       = document.getElementById('custPhone');
const modalOverlay    = document.getElementById('modalOverlay');
const modalCloseBtn   = document.getElementById('modalCloseBtn');
const modalImg        = document.getElementById('modalImg');
const modalBrand      = document.getElementById('modalBrand');
const modalName       = document.getElementById('modalName');
const modalPrice      = document.getElementById('modalPrice');
const modalDesc       = document.getElementById('modalDesc');
const modalSizes      = document.getElementById('modalSizes');
const modalAddBtn     = document.getElementById('modalAddBtn');
const toastContainer  = document.getElementById('toastContainer');
const bgHearts        = document.getElementById('bgHearts');

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatPrice(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
  }).format(amount);
}

function showToast(message, icon = '✦') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span style="font-size:1.1rem;">${icon}</span>${message}`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 350);
  }, 3200);
}

function generateHearts() {
  const hearts = ['♡','♥','✦','✿','🌸','💕'];
  for (let i = 0; i < 18; i++) {
    const span = document.createElement('span');
    span.textContent = hearts[Math.floor(Math.random() * hearts.length)];
    span.style.cssText = `
      left: ${Math.random() * 100}%;
      animation-duration: ${10 + Math.random() * 15}s;
      animation-delay: ${-Math.random() * 20}s;
      font-size: ${0.7 + Math.random() * 1.2}rem;
    `;
    bgHearts.appendChild(span);
  }
}

// ── API ───────────────────────────────────────────────────────────────────────
async function fetchProducts(params = {}) {
  const url = new URL(`${API_BASE}/api/products`, window.location.href);
  Object.entries(params).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function postCheckout(payload) {
  const res = await fetch(`${API_BASE}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Product Rendering ─────────────────────────────────────────────────────────
function renderSizeButtons(sizes, productId, isModal = false) {
  return sizes.map(size => {
    const cls = isModal ? 'modal-size-btn' : 'size-btn';
    return `<button class="${cls}" data-size="${size}" data-id="${productId}" aria-label="Size EU ${size}">${size}</button>`;
  }).join('');
}

function createProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.setAttribute('role', 'listitem');
  card.setAttribute('data-id', product.id);
  card.setAttribute('aria-label', `${product.name} by ${product.brand}`);

  card.innerHTML = `
    <div class="polaroid-tape" aria-hidden="true"></div>
    <div class="product-img-wrap">
      <img class="product-img" src="${product.image_url}"
           alt="${product.name} — ${product.brand}"
           loading="lazy"
           onerror="this.src='https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&q=80'" />
      <span class="product-badge">${product.category}</span>
    </div>
    <div class="product-info">
      <p class="product-brand">${product.brand}</p>
      <h3 class="product-name">${product.name}</h3>
      <p class="product-price">${product.price_formatted}</p>
      <div class="size-strip" aria-label="Quick size select">
        ${renderSizeButtons(product.sizes, product.id)}
      </div>
      <button class="add-to-cart-btn" data-id="${product.id}" aria-label="Add ${product.name} to bag">
        Add to Bag ♡
      </button>
    </div>
  `;

  // Card click → open modal
  card.addEventListener('click', (e) => {
    if (e.target.closest('.size-btn') || e.target.closest('.add-to-cart-btn')) return;
    openModal(product);
  });

  // Size button clicks on card
  card.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      card.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  // Add to cart from card
  card.querySelector('.add-to-cart-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const selectedSizeBtn = card.querySelector('.size-btn.selected');
    if (!selectedSizeBtn) {
      showToast('Please select a size first! 👇', '📐');
      return;
    }
    addToCart(product, selectedSizeBtn.dataset.size);
  });

  return card;
}

function renderProducts(products) {
  productsGrid.innerHTML = '';
  if (!products || products.length === 0) {
    productsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3 class="empty-title">No heels found</h3>
        <p class="empty-sub">Try adjusting your filters — your dream pair is in here somewhere ✦</p>
      </div>`;
    resultsCount.textContent = '';
    return;
  }
  products.forEach(p => productsGrid.appendChild(createProductCard(p)));
  resultsCount.textContent = `✦ showing ${products.length} gorgeous piece${products.length !== 1 ? 's' : ''}`;
}

// ── Filters ───────────────────────────────────────────────────────────────────
function populateFilterDropdowns(brands, categories) {
  filterBrand.innerHTML = '<option value="">All Brands</option>' +
    brands.map(b => `<option value="${b}">${b}</option>`).join('');
  filterCategory.innerHTML = '<option value="">All Styles</option>' +
    categories.map(c => `<option value="${c}">${c}</option>`).join('');
}

function getActiveFilters() {
  return {
    brand:    filterBrand.value,
    category: filterCategory.value,
    size:     filterSize.value,
    minPrice: filterMinPrice.value,
    maxPrice: filterMaxPrice.value,
  };
}

function renderFilterChips(filters) {
  filterChips.innerHTML = '';
  const labels = {
    brand: '🏷', category: '👠', size: '📐', minPrice: '💰 min', maxPrice: '💰 max'
  };
  Object.entries(filters).forEach(([key, val]) => {
    if (!val) return;
    const chip = document.createElement('span');
    chip.className = 'filter-chip';
    chip.innerHTML = `${labels[key] || ''} ${val} <button class="chip-remove" aria-label="Remove ${key} filter" data-key="${key}">×</button>`;
    chip.querySelector('.chip-remove').addEventListener('click', () => {
      if (key === 'brand')    filterBrand.value    = '';
      if (key === 'category') filterCategory.value = '';
      if (key === 'size')     filterSize.value     = '';
      if (key === 'minPrice') filterMinPrice.value = '';
      if (key === 'maxPrice') filterMaxPrice.value = '';
      applyFilters();
    });
    filterChips.appendChild(chip);
  });
}

async function applyFilters() {
  const filters = getActiveFilters();
  renderFilterChips(filters);
  productsGrid.innerHTML = '<div class="products-loading"><div class="loading-spinner"></div><p class="loading-text">filtering…</p></div>';
  try {
    const data = await fetchProducts(filters);
    allProducts = data.products;
    renderProducts(allProducts);
  } catch (e) {
    showToast('Filter failed — please try again', '⚠️');
    console.error(e);
  }
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(product) {
  modalProduct = product;
  modalSelectedSize = null;
  modalImg.src = product.image_url;
  modalImg.alt = `${product.name} — ${product.brand}`;
  modalBrand.textContent = product.brand;
  modalName.textContent  = product.name;
  modalPrice.textContent = product.price_formatted;
  modalDesc.textContent  = product.description;
  modalSizes.innerHTML   = renderSizeButtons(product.sizes, product.id, true);

  modalSizes.querySelectorAll('.modal-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modalSizes.querySelectorAll('.modal-size-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      modalSelectedSize = btn.dataset.size;
    });
  });

  modalOverlay.classList.add('open');
  modalOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('open');
  modalOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  modalProduct = null;
  modalSelectedSize = null;
}

// ── Cart ──────────────────────────────────────────────────────────────────────
function addToCart(product, size) {
  const existing = cart.find(i => i.product.id === product.id && i.size === size);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ product, size, quantity: 1 });
  }
  renderCart();
  updateCartCount();
  showToast(`${product.name} (EU ${size}) added to bag!`, '🩰');
  openCart();
}

function removeFromCart(productId, size) {
  cart = cart.filter(i => !(i.product.id === productId && i.size === size));
  renderCart();
  updateCartCount();
}

function updateQuantity(productId, size, delta) {
  const item = cart.find(i => i.product.id === productId && i.size === size);
  if (!item) return;
  item.quantity = Math.max(0, item.quantity + delta);
  if (item.quantity === 0) removeFromCart(productId, size);
  else { renderCart(); updateCartCount(); }
}

function updateCartCount() {
  const total = cart.reduce((s, i) => s + i.quantity, 0);
  cartCount.textContent = total;
  cartCount.style.animation = 'none';
  requestAnimationFrame(() => { cartCount.style.animation = ''; });
  cartToggleBtn.setAttribute('aria-label', `Open shopping cart (${total} items)`);
}

function getCartTotal() {
  return cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
}

function renderCart() {
  if (cart.length === 0) {
    cartItems.innerHTML = `
      <div class="cart-empty">
        <span class="cart-empty-icon">🛍️</span>
        <p class="cart-empty-text">your bag is looking a little bare…<br>add something beautiful!</p>
      </div>`;
    drawerFooter.style.display = 'none';
    return;
  }

  drawerFooter.style.display = 'block';
  const total = getCartTotal();
  cartSubtotal.textContent = formatPrice(total);
  cartTotal.textContent    = formatPrice(total);

  cartItems.innerHTML = '';
  cart.forEach(item => {
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <img class="cart-item-img"
           src="${item.product.image_url}"
           alt="${item.product.name}"
           onerror="this.src='https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=300&q=60'" />
      <div class="cart-item-details">
        <p class="cart-item-name">${item.product.name}</p>
        <p class="cart-item-meta">${item.product.brand} · EU ${item.size}</p>
        <div class="cart-item-controls">
          <button class="qty-btn" data-id="${item.product.id}" data-size="${item.size}" data-delta="-1" aria-label="Decrease quantity">−</button>
          <span class="qty-display" aria-label="Quantity: ${item.quantity}">${item.quantity}</span>
          <button class="qty-btn" data-id="${item.product.id}" data-size="${item.size}" data-delta="1" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
        <p class="cart-item-price">${formatPrice(item.product.price * item.quantity)}</p>
        <button class="cart-item-remove" data-id="${item.product.id}" data-size="${item.size}" aria-label="Remove ${item.product.name}">✕</button>
      </div>
    `;

    el.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        updateQuantity(parseInt(btn.dataset.id), btn.dataset.size, parseInt(btn.dataset.delta));
      });
    });
    el.querySelector('.cart-item-remove').addEventListener('click', () => {
      removeFromCart(parseInt(el.querySelector('[data-id]').dataset.id),
                     el.querySelector('[data-size]').dataset.size);
    });

    cartItems.appendChild(el);
  });
}

function openCart() {
  cartDrawer.classList.add('open');
  drawerOverlay.classList.add('open');
  cartDrawer.setAttribute('aria-hidden', 'false');
  drawerOverlay.setAttribute('aria-hidden', 'false');
  cartToggleBtn.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  cartDrawer.classList.remove('open');
  drawerOverlay.classList.remove('open');
  cartDrawer.setAttribute('aria-hidden', 'true');
  drawerOverlay.setAttribute('aria-hidden', 'true');
  cartToggleBtn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

// ── Checkout / Midtrans ───────────────────────────────────────────────────────
async function handleCheckout() {
  const name  = custName.value.trim();
  const email = custEmail.value.trim();
  const phone = custPhone.value.trim();

  if (!name || !email || !phone) {
    showToast('Please fill in your name, email & phone ✦', '📝');
    return;
  }
  if (cart.length === 0) {
    showToast('Your bag is empty!', '🛍️');
    return;
  }

  checkoutBtn.disabled = true;
  checkoutBtn.textContent = '✦ Preparing payment… ✦';

  const payload = {
    customer: { name, email, phone },
    items: cart.map(i => ({
      id:       i.product.id,
      quantity: i.quantity,
      size:     i.size,
    })),
  };

  try {
    const data = await postCheckout(payload);

    if (!data.snap_token) {
      throw new Error('No Snap token received from server.');
    }

    // Open Midtrans Snap pop-up
    window.snap.pay(data.snap_token, {
      onSuccess: (result) => {
        console.log('Payment success:', result);
        cart = [];
        renderCart();
        updateCartCount();
        closeCart();
        showToast('🎉 Payment successful! Your heels are on their way ♡', '🩰');
        window.location.href = `/success.html?order_id=${data.order_id}`;
      },
      onPending: (result) => {
        console.log('Payment pending:', result);
        showToast('Payment pending — complete it to confirm your order ✦', '⏳');
        closeCart();
      },
      onError: (result) => {
        console.error('Payment error:', result);
        showToast('Payment failed. Please try again 💔', '⚠️');
      },
      onClose: () => {
        showToast('Payment window closed. Your bag is saved ✦', '🛍️');
      },
    });
  } catch (e) {
    console.error('Checkout error:', e);
    showToast(`Checkout error: ${e.message}`, '⚠️');
  } finally {
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = '✦ Checkout & Pay ✦';
  }
}

// ── Event Listeners ───────────────────────────────────────────────────────────
cartToggleBtn.addEventListener('click', () => {
  cartDrawer.classList.contains('open') ? closeCart() : openCart();
});
drawerCloseBtn.addEventListener('click', closeCart);
drawerOverlay.addEventListener('click', closeCart);

applyFilterBtn.addEventListener('click', applyFilters);
clearFilterBtn.addEventListener('click', () => {
  filterBrand.value    = '';
  filterCategory.value = '';
  filterSize.value     = '';
  filterMinPrice.value = '';
  filterMaxPrice.value = '';
  applyFilters();
});

// Enter key on filter inputs
[filterMinPrice, filterMaxPrice].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') applyFilters(); });
});

modalCloseBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

modalAddBtn.addEventListener('click', () => {
  if (!modalProduct) return;
  if (!modalSelectedSize) {
    showToast('Please select a size ✦', '📐');
    return;
  }
  addToCart(modalProduct, modalSelectedSize);
  closeModal();
});

checkoutBtn.addEventListener('click', handleCheckout);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeCart();
  }
});

// ── Initialise App ────────────────────────────────────────────────────────────
async function init() {
  generateHearts();

  try {
    const data = await fetchProducts();
    allProducts   = data.products   || [];
    allBrands     = data.brands     || [];
    allCategories = data.categories || [];

    populateFilterDropdowns(allBrands, allCategories);
    renderProducts(allProducts);
  } catch (e) {
    console.error('Failed to load products:', e);
    productsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💔</div>
        <h3 class="empty-title">Couldn't load the catalog</h3>
        <p class="empty-sub">Please check your connection or try refreshing ✦</p>
      </div>`;
    showToast('Failed to load products — please refresh', '⚠️');
  }
}

init();
