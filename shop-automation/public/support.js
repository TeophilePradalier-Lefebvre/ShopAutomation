/*
 * Support screen: return request form.
 * Covers the mandatory controls (text, number, text area), date and file validation,
 * a live counter (dynamic element), server round-trip and a confirm/cancel dialog.
 * Client validation mirrors the API rules word for word: same messages, one contract.
 */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const shop = window.__shop;

  const RULES = {
    reference: /^SHOP-\d{5}$/,
    nameMin: 3,
    nameMax: 60,
    quantityMin: 1,
    quantityMax: 5,
    descriptionMin: 20,
    descriptionMax: 500,
    photoTypes: ['.png', '.jpg', '.jpeg', '.pdf'],
    photoMaxBytes: 1024 * 1024,
    purchaseMaxAgeDays: 365
  };

  const MESSAGES = {
    reference: 'Use the format SHOP-12345',
    name: 'Full name must be between 3 and 60 characters',
    quantity: 'Quantity must be a whole number between 1 and 5',
    description: 'Description must be between 20 and 500 characters',
    purchasedOn: 'Purchase date must be a valid date, not in the future, and within the last year',
    photo: 'Only .png, .jpg or .pdf files up to 1 MB are accepted',
    terms: 'You must accept the return policy'
  };

  const FIELDS = ['reference', 'name', 'quantity', 'description', 'purchasedOn', 'photo', 'terms'];

  function field(name) {
    return document.querySelector('[data-testid="ticket-' + name + '"]');
  }

  function errorBox(name) {
    return document.querySelector('[data-testid="error-' + name + '"]');
  }

  function setError(name, message) {
    const box = errorBox(name);
    if (!box) return;
    box.textContent = message || '';
    box.hidden = !message;
  }

  function clearErrors() {
    FIELDS.forEach((name) => setError(name, ''));
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function daysAgo(n) {
    return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  }

  function selectedFile() {
    const input = field('photo');
    return input && input.files && input.files[0] ? input.files[0] : null;
  }

  function readForm() {
    const qtyRaw = field('quantity').value;
    const file = selectedFile();
    return {
      reference: field('reference').value.trim(),
      name: field('name').value.trim(),
      quantity: qtyRaw === '' ? NaN : Number(qtyRaw),
      description: field('description').value.trim(),
      purchasedOn: field('purchasedOn').value,
      photo: file ? { name: file.name, size: file.size } : undefined,
      terms: field('terms').checked
    };
  }

  function validate(payload) {
    const errors = {};

    if (!RULES.reference.test(payload.reference)) errors.reference = MESSAGES.reference;

    if (payload.name.length < RULES.nameMin || payload.name.length > RULES.nameMax) {
      errors.name = MESSAGES.name;
    }

    if (!Number.isInteger(payload.quantity) ||
        payload.quantity < RULES.quantityMin || payload.quantity > RULES.quantityMax) {
      errors.quantity = MESSAGES.quantity;
    }

    if (payload.description.length < RULES.descriptionMin ||
        payload.description.length > RULES.descriptionMax) {
      errors.description = MESSAGES.description;
    }

    const date = payload.purchasedOn;
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(date);
    if (!iso) {
      errors.purchasedOn = MESSAGES.purchasedOn;
    } else {
      const ageDays = (new Date(today() + 'T00:00:00Z') - new Date(date + 'T00:00:00Z')) / 86400000;
      if (Number.isNaN(ageDays) || ageDays < 0 || ageDays > RULES.purchaseMaxAgeDays) {
        errors.purchasedOn = MESSAGES.purchasedOn;
      }
    }

    if (payload.photo) {
      const dot = payload.photo.name.lastIndexOf('.');
      const ext = dot >= 0 ? payload.photo.name.slice(dot).toLowerCase() : '';
      if (!RULES.photoTypes.includes(ext) ||
          payload.photo.size <= 0 || payload.photo.size > RULES.photoMaxBytes) {
        errors.photo = MESSAGES.photo;
      }
    }

    if (payload.terms !== true) errors.terms = MESSAGES.terms;

    return errors;
  }

  function renderErrors(errors) {
    clearErrors();
    FIELDS.forEach((name) => {
      if (errors[name]) setError(name, errors[name]);
    });
  }

  function hasErrors(errors) {
    return Object.keys(errors).length > 0;
  }

  /* ---------- dynamic bits ---------- */
  function updateCounter() {
    const value = field('description').value;
    $('[data-testid="description-counter"]').textContent = value.length + ' / ' + RULES.descriptionMax;
  }

  function describeFile(file) {
    if (!file) {
      const box = $('[data-testid="photo-name"]');
      box.hidden = true;
      box.textContent = '';
      return;
    }
    const kb = Math.max(1, Math.round(file.size / 1024));
    const box = $('[data-testid="photo-name"]');
    box.textContent = file.name + ' (' + kb + ' KB)';
    box.hidden = false;
  }

  function confirmation(text) {
    const box = $('[data-testid="ticket-confirmation"]');
    if (!text) {
      box.hidden = true;
      box.textContent = '';
      return;
    }
    box.textContent = text;
    box.hidden = false;
  }

  /* ---------- list + dialog ---------- */
  let pendingDelete = null;

  function renderList(items) {
    const list = $('#ticket-list');
    list.textContent = '';
    $('[data-testid="ticket-empty"]').hidden = items.length > 0;

    items.forEach((ticket) => {
      const row = document.createElement('li');
      row.className = 'ticket-row';
      row.dataset.testid = 'ticket-row';
      row.dataset.ticketId = ticket.id;
      row.dataset.reference = ticket.reference;

      const main = document.createElement('span');
      main.dataset.testid = 'ticket-summary';
      main.textContent = ticket.id + ' · ' + ticket.reference + ' · qty ' + ticket.quantity + ' · ' + ticket.status;

      const del = document.createElement('button');
      del.type = 'button';
      del.dataset.testid = 'delete-ticket';
      del.textContent = 'Delete';
      del.addEventListener('click', () => openDialog(ticket));

      row.append(main, del);
      list.append(row);
    });
  }

  async function api(path, options = {}) {
    const token = shop.getToken();
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch('/api/v1' + path, Object.assign({}, options, { headers }));
  }

  async function loadTickets() {
    const response = await api('/tickets');
    if (!response.ok) {
      renderList([]);
      return;
    }
    const body = await response.json();
    renderList(body.items || []);
  }

  function openDialog(ticket) {
    pendingDelete = ticket;
    $('[data-testid="confirm-target"]').textContent = ticket.id + ' · ' + ticket.reference;
    $('[data-testid="confirm-dialog"]').hidden = false;
  }

  function closeDialog() {
    pendingDelete = null;
    $('[data-testid="confirm-dialog"]').hidden = true;
  }

  $('[data-testid="cancel-delete"]').addEventListener('click', () => {
    closeDialog();
  });

  $('[data-testid="confirm-delete"]').addEventListener('click', async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    closeDialog();
    const response = await api('/tickets/' + id, { method: 'DELETE' });
    if (response.status === 204) {
      confirmation('Request ' + id + ' deleted');
      await loadTickets();
    } else {
      confirmation('Could not delete ' + id + ' (HTTP ' + response.status + ')');
    }
  });

  /* ---------- submit ---------- */
  $('[data-testid="ticket-form"]').addEventListener('submit', async (event) => {
    event.preventDefault();
    confirmation('');
    const payload = readForm();
    const errors = validate(payload);

    if (hasErrors(errors)) {
      renderErrors(errors);
      return;
    }
    clearErrors();

    const response = await api('/tickets', { method: 'POST', body: JSON.stringify(payload) });

    if (response.status === 401) {
      confirmation('Session expired, please sign in again.');
      return;
    }

    const body = await response.json();

    if (response.status === 201) {
      confirmation('Request ' + body.id + ' received. We will reply within 2 business days.');
      $('[data-testid="ticket-form"]').reset();
      updateCounter();
      describeFile(null);
      await loadTickets();
      return;
    }

    if (body && body.error && body.error.errors) {
      renderErrors(body.error.errors);
      confirmation('The server rejected the request: ' + body.error.message);
      return;
    }

    confirmation('Unexpected response (HTTP ' + response.status + ')');
  });

  $('[data-testid="clear-ticket"]').addEventListener('click', () => {
    $('[data-testid="ticket-form"]').reset();
    clearErrors();
    confirmation('');
    updateCounter();
    describeFile(null);
  });

  field('description').addEventListener('input', updateCounter);

  field('photo').addEventListener('change', () => {
    const file = selectedFile();
    describeFile(file);
    /* Immediate feedback, but the authoritative check runs on submit. */
    if (file === null) return;
    const dot = file.name.lastIndexOf('.');
    const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
    if (!RULES.photoTypes.includes(ext) || file.size > RULES.photoMaxBytes) {
      setError('photo', MESSAGES.photo);
    } else {
      setError('photo', '');
    }
  });

  window.addEventListener('shop:support-open', () => {
    updateCounter();
    describeFile(selectedFile());
    if (shop.getToken()) loadTickets();
  });

  /* Direct load of /#support (bookmark, page reload): the routing event was fired by
     app.js before this file was parsed, so the screen hydrates itself here. */
  updateCounter();
  describeFile(selectedFile());
  if (location.hash === '#support' && shop.getToken()) loadTickets();

  /* Hooks for setup (data seeding) without going through the UI. */
  window.__support = {
    loadTickets,
    renderList,
    reset() {
      $('[data-testid="ticket-form"]').reset();
      clearErrors();
      confirmation('');
      updateCounter();
      describeFile(null);
      renderList([]);
    },
    today,
    daysAgo
  };
})();
