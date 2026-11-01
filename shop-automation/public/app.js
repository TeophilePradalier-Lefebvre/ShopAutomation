/* SHOP demo app - deterministic, no network calls.
   Every interactive element exposes either a semantic role/label or a data-testid,
   so the Cypress suite can demonstrate locator strategies from the course. */

const USERS = [{ email: 'qa@example.com', password: 'Sup3rSecre7!' }];

const PRODUCTS = [
  { id: 'iphone18', name: 'iPhone18', price: 3079, stock: 12 },
  { id: 'trail-backpack', name: 'Trail Backpack', price: 89, stock: 3 },
  { id: 'water-bottle', name: 'Water Bottle', price: 18, stock: 0 },
  { id: 'smartwatch', name: 'Smartwatch', price: 39, stock: 7 }
];

const SHIPPING = { standard: 0, express: 9 };

const params = new URLSearchParams(location.search);
const MASK_PERSISTENT = params.get('mask') === 'persistent';

const state = {
  user: null,
  token: null, // bearer token issued by POST /api/v1/auth/login
  cart: [], // { id, qty, giftWrap }
  term: '',
  sort: 'name-asc',
  shipping: 'standard'
};

const $ = (sel) => document.querySelector(sel);
const viewIds = ['login', 'products', 'cart', 'checkout', 'support'];

/* Session survives a page reload, like a real shop. The token is what every
   authenticated call needs; the UI reads it back on boot. */
const SESSION_KEY = 'shop.session';

try {
  const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  if (saved && saved.token && saved.user) {
    state.token = saved.token;
    state.user = saved.user;
  }
} catch (e) {
  sessionStorage.removeItem(SESSION_KEY);
}

function persistSession() {
  if (state.token && state.user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: state.token, user: state.user }));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

/* ---------- helpers ---------- */
const money = (n) => n.toFixed(2);

function product(id) {
  return PRODUCTS.find((p) => p.id === id);
}

function visibleProducts() {
  const term = state.term.trim().toLowerCase();
  let list = PRODUCTS.filter((p) => p.name.toLowerCase().includes(term));
  if (state.sort === 'price-asc') list = list.slice().sort((a, b) => a.price - b.price);
  if (state.sort === 'price-desc') list = list.slice().sort((a, b) => b.price - a.price);
  if (state.sort === 'name-asc') list = list.slice().sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

function cartCount() {
  return state.cart.reduce((n, l) => n + l.qty, 0);
}

function subtotal() {
  return state.cart.reduce((sum, l) => sum + product(l.id).price * l.qty, 0);
}

let toastTimer = null;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 1600);
}

/* ---------- rendering ---------- */
function showView(name) {
  viewIds.forEach((id) => { $('#view-' + id).hidden = id !== name; });
}

function renderProducts() {
  const grid = $('#grid');
  grid.textContent = '';

  const list = visibleProducts();
  const noResults = $('[data-testid="no-results"]');
  if (list.length === 0) {
    noResults.textContent = 'No products match "' + state.term + '".';
    noResults.hidden = false;
  } else {
    noResults.hidden = true;
  }

  list.forEach((p) => {
    const card = document.createElement('article');
    card.className = 'card' + (p.stock === 0 ? ' out' : '');
    card.dataset.testid = 'product-card';
    card.dataset.productId = p.id;

    const title = document.createElement('h2');
    title.textContent = p.name;

    const price = document.createElement('p');
    price.className = 'price';
    price.textContent = '$' + p.price;

    const stock = document.createElement('p');
    stock.className = 'stock';
    stock.dataset.testid = 'stock';
    stock.textContent = p.stock === 0 ? 'Out of stock' : p.stock + ' in stock';

    const wrapLabel = document.createElement('label');
    wrapLabel.className = 'wrap';
    const wrap = document.createElement('input');
    wrap.type = 'checkbox';
    wrap.dataset.testid = 'gift-wrap';
    wrapLabel.append(wrap, document.createTextNode(' Gift wrap'));

    const add = document.createElement('button');
    add.type = 'button';
    add.dataset.testid = 'add-to-cart';
    add.textContent = 'Add to cart';
    /* Known defect (intentional, for the lab): stock === 0 does not disable the button. */
    add.addEventListener('click', () => addToCart(p.id, wrap.checked));

    card.append(title, price, stock, wrapLabel, add);
    grid.append(card);
  });
}

function renderCart() {
  const list = $('#cart-items');
  list.textContent = '';

  $('[data-testid="cart-empty"]').hidden = state.cart.length > 0;

  state.cart.forEach((line) => {
    const p = product(line.id);
    const row = document.createElement('li');
    row.className = 'cart-row';
    row.dataset.testid = 'cart-row';
    row.dataset.productId = line.id;

    const name = document.createElement('span');
    name.dataset.testid = 'cart-item-name';
    name.textContent = p.name + (line.giftWrap ? ' (gift wrap)' : '');

    const qty = document.createElement('span');
    qty.className = 'qty';
    qty.dataset.testid = 'cart-item-quantity';
    qty.textContent = String(line.qty);

    const actions = document.createElement('span');
    actions.className = 'qty-actions';
    const dec = document.createElement('button');
    dec.type = 'button';
    dec.dataset.testid = 'qty-decrease';
    dec.textContent = '-';
    dec.addEventListener('click', () => changeQty(line.id, -1));
    const inc = document.createElement('button');
    inc.type = 'button';
    inc.dataset.testid = 'qty-increase';
    inc.textContent = '+';
    inc.addEventListener('click', () => changeQty(line.id, +1));
    actions.append(dec, inc);

    row.append(name, qty, actions);
    list.append(row);
  });

  $('[data-testid="cart-subtotal"]').textContent = money(subtotal());
  $('[data-testid="cart-total"]').textContent = money(subtotal() + SHIPPING[state.shipping]);
  $('[data-testid="cart-count"]').textContent = String(cartCount());
  document.querySelectorAll('input[name="shipping"]').forEach((r) => { r.checked = r.value === state.shipping; });
}

/* ---------- actions ---------- */
function addToCart(id, giftWrap) {
  const p = product(id);
  const line = state.cart.find((l) => l.id === id);
  if (line) line.qty += 1;
  else state.cart.push({ id, qty: 1, giftWrap: !!giftWrap });
  $('[data-testid="cart-count"]').textContent = String(cartCount());
  toast('Added ' + p.name + ' to cart');
}

function changeQty(id, delta) {
  const line = state.cart.find((l) => l.id === id);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) state.cart = state.cart.filter((l) => l.id !== id);
  renderCart();
}

function showMask() {
  const mask = $('#mask');
  mask.hidden = false;
  if (MASK_PERSISTENT) return; // lab: overlay never disappears
  setTimeout(() => { mask.hidden = true; }, 900);
}

/* ---------- routing ---------- */
function route() {
  const hash = location.hash.replace('#', '') || (state.user ? 'products' : 'login');

  if (!state.user && hash !== 'login') {
    showView('login');
    return;
  }

  if (hash === 'products') {
    renderProducts();
    showView('products');
  } else if (hash === 'cart') {
    renderCart();
    showView('cart');
    showMask();
  } else if (hash === 'checkout') {
    showView('checkout');
  } else if (hash === 'support') {
    showView('support');
    window.dispatchEvent(new CustomEvent('shop:support-open'));
  } else {
    showView('login');
  }
}

/* ---------- wiring ---------- */
$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = $('#email').value.trim();
  const password = $('#password').value;
  const error = $('[data-testid="login-error"]');

  /* Credentials are checked by the API, not by the browser: one source of truth. */
  let response = null;
  try {
    response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
  } catch (e) {
    response = null;
  }

  if (!response || !response.ok) {
    error.textContent = 'Invalid email or password';
    error.hidden = false;
    return;
  }

  const session = await response.json();
  error.hidden = true;
  state.token = session.token;
  state.user = { email: session.user.email };
  persistSession();
  location.hash = 'products';
});

$('[data-testid="search-submit"]').addEventListener('click', () => {
  state.term = $('#search').value;
  renderProducts();
});

$('#search').addEventListener('input', () => {
  if ($('#search').value === '') {
    state.term = '';
    renderProducts();
  }
});

$('[data-testid="sort-by"]').addEventListener('change', (event) => {
  state.sort = event.target.value;
  renderProducts();
});

document.querySelectorAll('input[name="shipping"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    state.shipping = radio.value;
    renderCart();
  });
});

$('[data-testid="continue-checkout"]').addEventListener('click', () => {
  location.hash = 'checkout';
});

$('[data-testid="place-order"]').addEventListener('click', () => {
  $('[data-testid="order-confirmation"]').hidden = false;
  $('[data-testid="toast"]').hidden = true;
  state.cart = [];
  $('[data-testid="cart-count"]').textContent = '0';
  renderCart();
});

$('[data-testid="accept-cookies"]').addEventListener('click', () => {
  $('[data-testid="cookie-banner"]').hidden = true;
});

window.addEventListener('hashchange', route);
route();

/* ---------- test hooks (Cypress "app actions") ----------
   Exposes the same business operations the UI performs so setup can be done
   quickly and deterministically, while keeping the real UI login test in the suite. */
window.__shop = {
  state,
  loginUser(email = 'qa@example.com') {
    state.user = { email };
    if (location.hash === '#products') route();
    else location.hash = 'products';
  },
  /** Token injection for setup: the UI login still exercises the real credential flow. */
  setToken(token) {
    state.token = token;
    persistSession();
  },
  getToken() {
    return state.token;
  },
  addProduct(id, qty = 1, giftWrap = false) {
    for (let i = 0; i < qty; i += 1) addToCart(id, giftWrap);
  },
  reset() {
    state.user = null;
    state.token = null;
    sessionStorage.removeItem(SESSION_KEY);
    state.cart = [];
    state.term = '';
    state.sort = 'name-asc';
    state.shipping = 'standard';
    $('#toast').hidden = true;
    $('[data-testid="order-confirmation"]').hidden = true;
    renderCart();
  }
};
