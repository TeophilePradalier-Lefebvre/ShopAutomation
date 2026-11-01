/*
 * SHOP demo application - static UI + JSON API v1.
 * No dependency: a tiny router, an in-memory store, deterministic rules.
 * Every process owns its own store, which is what makes parallel workers isolated.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;
const API_PREFIX = '/api/v1';
const MAX_BODY = 1024 * 1024; // 1 MB

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

/* ---------------------------------------------------------------- data */

const USERS = [
  { id: 'u1', email: 'qa@example.com', password: 'Sup3rSecre7!' },
  { id: 'u2', email: 'reviewer@example.com', password: 'Rev1ewPass!' }
];

const PRODUCTS = [
  { id: 'iphone18', name: 'iPhone18', price: 3079, stock: 12, currency: 'USD' },
  { id: 'trail-backpack', name: 'Trail Backpack', price: 89, stock: 3, currency: 'USD' },
  { id: 'water-bottle', name: 'Water Bottle', price: 18, stock: 0, currency: 'USD' },
  { id: 'smartwatch', name: 'Smartwatch', price: 39, stock: 7, currency: 'USD' }
];

const tickets = [];
const sessions = new Map(); // token -> userId
let ticketSeq = 0;

/* ---------------------------------------------------------------- rules */

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

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function validateTicket(body, now = new Date()) {
  const errors = {};
  const b = body || {};

  if (typeof b.reference !== 'string' || !RULES.reference.test(b.reference)) {
    errors.reference = MESSAGES.reference;
  }

  const name = typeof b.name === 'string' ? b.name.trim() : '';
  if (name.length < RULES.nameMin || name.length > RULES.nameMax) {
    errors.name = MESSAGES.name;
  }

  const qty = b.quantity;
  if (!Number.isInteger(qty) || qty < RULES.quantityMin || qty > RULES.quantityMax) {
    errors.quantity = MESSAGES.quantity;
  }

  const description = typeof b.description === 'string' ? b.description.trim() : '';
  if (description.length < RULES.descriptionMin || description.length > RULES.descriptionMax) {
    errors.description = MESSAGES.description;
  }

  if (!isIsoDate(b.purchasedOn)) {
    errors.purchasedOn = MESSAGES.purchasedOn;
  } else {
    const today = new Date(now.toISOString().slice(0, 10) + 'T00:00:00Z');
    const bought = new Date(b.purchasedOn + 'T00:00:00Z');
    const ageDays = (today - bought) / 86400000;
    if (ageDays < 0 || ageDays > RULES.purchaseMaxAgeDays) {
      errors.purchasedOn = MESSAGES.purchasedOn;
    }
  }

  if (b.photo !== undefined && b.photo !== null) {
    const p = b.photo;
    const ext = typeof p.name === 'string' ? path.extname(p.name).toLowerCase() : '';
    const size = Number(p.size);
    if (!RULES.photoTypes.includes(ext) || !Number.isFinite(size) || size <= 0 || size > RULES.photoMaxBytes) {
      errors.photo = MESSAGES.photo;
    }
  }

  if (b.terms !== true) {
    errors.terms = MESSAGES.terms;
  }

  return errors;
}

/* ---------------------------------------------------------------- http helpers */

function json(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Request-Id': crypto.randomBytes(6).toString('hex'),
    'X-Content-Type-Options': 'nosniff'
  }, headers));
  res.end(body);
}

function fail(res, status, code, message, extra = {}, headers = {}) {
  json(res, status, { error: Object.assign({ code, message }, extra) }, headers);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('PAYLOAD_TOO_LARGE'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(Object.assign(new Error('INVALID_JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function currentUser(req) {
  const header = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;
  const userId = sessions.get(match[1]);
  if (!userId) return null;
  return USERS.find((u) => u.id === userId) || null;
}

function publicTicket(t) {
  return {
    id: t.id,
    reference: t.reference,
    name: t.name,
    quantity: t.quantity,
    description: t.description,
    purchasedOn: t.purchasedOn,
    photo: t.photo || null,
    status: t.status,
    createdAt: t.createdAt
  };
}

/* ---------------------------------------------------------------- api */

async function handleApi(req, res, pathname, searchParams) {
  const segments = pathname.slice(API_PREFIX.length).split('/').filter(Boolean);
  const method = req.method.toUpperCase();
  const route = '/' + segments.join('/');

  // ---- health
  if (route === '/health') {
    if (method !== 'GET') return fail(res, 405, 'METHOD_NOT_ALLOWED', 'GET only', {}, { Allow: 'GET' });
    return json(res, 200, {
      status: 'ok',
      service: 'shop-api',
      version: '1.0.0',
      uptimeSeconds: Math.round(process.uptime())
    });
  }

  // ---- auth
  if (route === '/auth/login') {
    if (method !== 'POST') return fail(res, 405, 'METHOD_NOT_ALLOWED', 'POST only', {}, { Allow: 'POST' });
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      return fail(res, e.status || 400, e.message === 'INVALID_JSON' ? 'INVALID_JSON' : 'BAD_REQUEST',
        'Request body must be valid JSON');
    }
    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
      return fail(res, 400, 'INVALID_PAYLOAD', 'email and password are required');
    }
    const user = USERS.find((u) => u.email === body.email && u.password === body.password);
    if (!user) return fail(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    const token = crypto.randomBytes(16).toString('hex');
    sessions.set(token, user.id);
    return json(res, 200, { token, tokenType: 'Bearer', expiresIn: 3600, user: { email: user.email } });
  }

  // ---- products
  if (route === '/products') {
    if (method !== 'GET') return fail(res, 405, 'METHOD_NOT_ALLOWED', 'GET only', {}, { Allow: 'GET' });
    const limitRaw = searchParams.get('limit');
    const offsetRaw = searchParams.get('offset');
    const limit = limitRaw === null ? 20 : Number(limitRaw);
    const offset = offsetRaw === null ? 0 : Number(offsetRaw);

    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      return fail(res, 400, 'INVALID_PARAMETER', 'limit must be an integer between 1 and 50', { field: 'limit' });
    }
    if (!Number.isInteger(offset) || offset < 0) {
      return fail(res, 400, 'INVALID_PARAMETER', 'offset must be a positive integer', { field: 'offset' });
    }

    const search = (searchParams.get('search') || '').toLowerCase();
    const sort = searchParams.get('sort') || 'name-asc';
    if (!['name-asc', 'price-asc', 'price-desc'].includes(sort)) {
      return fail(res, 400, 'INVALID_PARAMETER', 'sort must be name-asc, price-asc or price-desc', { field: 'sort' });
    }

    let items = PRODUCTS.filter((p) => p.name.toLowerCase().includes(search));
    if (sort === 'price-asc') items = items.slice().sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') items = items.slice().sort((a, b) => b.price - a.price);
    if (sort === 'name-asc') items = items.slice().sort((a, b) => a.name.localeCompare(b.name));

    const total = items.length;
    const page = items.slice(offset, offset + limit);
    return json(res, 200, { items: page, total, limit, offset });
  }

  if (segments[0] === 'products' && segments.length === 2) {
    if (method !== 'GET') return fail(res, 405, 'METHOD_NOT_ALLOWED', 'GET only', {}, { Allow: 'GET' });
    const product = PRODUCTS.find((p) => p.id === segments[1]);
    if (!product) return fail(res, 404, 'PRODUCT_NOT_FOUND', 'No product with id ' + segments[1]);
    return json(res, 200, product);
  }

  // ---- tickets (authenticated, CRUD)
  if (segments[0] === 'tickets') {
    const user = currentUser(req);
    if (!user) return fail(res, 401, 'UNAUTHORIZED', 'Missing or invalid bearer token',
      {}, { 'WWW-Authenticate': 'Bearer' });

    if (segments.length === 1) {
      if (method === 'GET') {
        const mine = tickets.filter((t) => t.ownerId === user.id);
        return json(res, 200, { items: mine.map(publicTicket), total: mine.length });
      }
      if (method === 'POST') {
        let body;
        try {
          body = await readBody(req);
        } catch (e) {
          return fail(res, e.status || 400, e.message === 'INVALID_JSON' ? 'INVALID_JSON' : 'BAD_REQUEST',
            'Request body must be valid JSON');
        }
        const errors = validateTicket(body);
        if (Object.keys(errors).length) {
          return fail(res, 422, 'VALIDATION_FAILED', 'The request payload failed validation', { errors });
        }
        ticketSeq += 1;
        const ticket = {
          id: 'TCK-' + String(ticketSeq).padStart(4, '0'),
          ownerId: user.id,
          reference: body.reference,
          name: body.name.trim(),
          quantity: body.quantity,
          description: body.description.trim(),
          purchasedOn: body.purchasedOn,
          photo: body.photo ? { name: body.photo.name, size: body.photo.size } : null,
          status: 'OPEN',
          createdAt: new Date().toISOString()
        };
        tickets.push(ticket);
        return json(res, 201, publicTicket(ticket), { Location: API_PREFIX + '/tickets/' + ticket.id });
      }
      return fail(res, 405, 'METHOD_NOT_ALLOWED', 'GET or POST', {}, { Allow: 'GET, POST' });
    }

    if (segments.length === 2) {
      const ticket = tickets.find((t) => t.id === segments[1]);
      if (!ticket) return fail(res, 404, 'TICKET_NOT_FOUND', 'No ticket with id ' + segments[1]);
      if (ticket.ownerId !== user.id) return fail(res, 403, 'FORBIDDEN', 'This ticket belongs to another user');

      if (method === 'GET') return json(res, 200, publicTicket(ticket));

      if (method === 'PATCH') {
        let body;
        try {
          body = await readBody(req);
        } catch (e) {
          return fail(res, e.status || 400, 'BAD_REQUEST', 'Request body must be valid JSON');
        }
        if (body.status !== undefined) {
          if (!['OPEN', 'CLOSED'].includes(body.status)) {
            return fail(res, 422, 'VALIDATION_FAILED', 'The request payload failed validation',
              { errors: { status: 'Status must be OPEN or CLOSED' } });
          }
          ticket.status = body.status;
        }
        if (body.description !== undefined) {
          const d = typeof body.description === 'string' ? body.description.trim() : '';
          if (d.length < RULES.descriptionMin || d.length > RULES.descriptionMax) {
            return fail(res, 422, 'VALIDATION_FAILED', 'The request payload failed validation',
              { errors: { description: MESSAGES.description } });
          }
          ticket.description = d;
        }
        return json(res, 200, publicTicket(ticket));
      }

      if (method === 'DELETE') {
        const index = tickets.findIndex((t) => t.id === ticket.id);
        tickets.splice(index, 1);
        res.writeHead(204, { 'X-Request-Id': crypto.randomBytes(6).toString('hex') });
        return res.end();
      }

      return fail(res, 405, 'METHOD_NOT_ALLOWED', 'GET, PATCH or DELETE', {}, { Allow: 'GET, PATCH, DELETE' });
    }

    return fail(res, 404, 'NOT_FOUND', 'Unknown ticket route');
  }

  return fail(res, 404, 'NOT_FOUND', 'Unknown API route ' + route);
}

/* ---------------------------------------------------------------- server */

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, 'http://localhost');
  const urlPath = decodeURIComponent(parsed.pathname);

  if (urlPath.startsWith(API_PREFIX)) {
    handleApi(req, res, urlPath, parsed.searchParams).catch((err) => {
      console.error('[api] unhandled', err);
      fail(res, 500, 'INTERNAL_ERROR', 'Unexpected server error');
    });
    return;
  }

  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const file = path.join(ROOT, rel);

  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('SHOP demo app (UI + API v1) running on http://localhost:' + PORT);
});
