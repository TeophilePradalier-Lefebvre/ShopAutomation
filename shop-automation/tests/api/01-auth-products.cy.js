/**
 * API suite 01 - service contract: health, authentication, product catalogue.
 *
 * These tests talk to the HTTP API directly (cy.request): no browser, no rendering,
 * so they are fast and they fail for exactly one reason. Every negative case asserts
 * the error contract (status + machine-readable code), not only "it did not work".
 */
const users = require('../../cypress/fixtures/users.json');

describe('API 01 - health, authentication and catalogue', () => {
  it('API-01 - GET /health exposes the service contract and safe headers', () => {
    cy.apiRequest('GET', '/health').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers['content-type']).to.include('application/json');
      expect(response.headers['cache-control']).to.eq('no-store');
      expect(response.headers['x-content-type-options']).to.eq('nosniff');
      expect(response.headers['x-request-id']).to.match(/^[0-9a-f]{12}$/);

      expect(response.body).to.have.all.keys('status', 'service', 'version', 'uptimeSeconds');
      expect(response.body).to.include({ status: 'ok', service: 'shop-api', version: '1.0.0' });
      expect(response.body.uptimeSeconds).to.be.a('number').and.to.be.at.least(0);
    });
  });

  it('API-02 - POST /auth/login returns a bearer token and never echoes the password', () => {
    const user = users.primary;

    cy.apiRequest('POST', '/auth/login', { body: { email: user.email, password: user.password } }).then(
      (response) => {
        expect(response.status).to.eq(200);
        expect(response.body.token).to.match(/^[0-9a-f]{32}$/);
        expect(response.body).to.include({ tokenType: 'Bearer', expiresIn: 3600 });
        expect(response.body.user).to.deep.eq({ email: user.email });
        expect(response.body).to.not.have.property('password');
        expect(JSON.stringify(response.body)).to.not.contain(user.password);
      }
    );
  });

  it('API-03 - POST /auth/login refuses a wrong password with 401 INVALID_CREDENTIALS', () => {
    cy.apiRequest('POST', '/auth/login', {
      body: { email: users.primary.email, password: 'not-the-password' }
    }).then((response) => {
      expect(response.status).to.eq(401);
      expect(response.body.error.code).to.eq('INVALID_CREDENTIALS');
      expect(response.body.error.message).to.eq('Invalid email or password');
      expect(response.body).to.not.have.property('token');
    });
  });

  it('API-04 - GET /products returns the whole catalogue sorted by name', () => {
    cy.apiRequest('GET', '/products').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.all.keys('items', 'total', 'limit', 'offset');
      expect(response.body).to.include({ total: 4, limit: 20, offset: 0 });
      expect(response.body.items).to.have.length(4);

      const names = response.body.items.map((item) => item.name);
      expect(names).to.deep.eq(names.slice().sort((a, b) => a.localeCompare(b)));

      response.body.items.forEach((item) => {
        expect(item).to.have.all.keys('id', 'name', 'price', 'stock', 'currency');
        expect(item.price).to.be.a('number').and.to.be.greaterThan(0);
        expect(item.currency).to.eq('USD');
      });
    });
  });

  it('API-05 - GET /products honours sort and pagination', () => {
    cy.apiRequest('GET', '/products?sort=price-asc&limit=2').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.include({ total: 4, limit: 2, offset: 0 });
      expect(response.body.items).to.have.length(2);
      expect(response.body.items.map((item) => item.id)).to.deep.eq(['water-bottle', 'smartwatch']);
      expect(response.body.items[0].price).to.be.at.most(response.body.items[1].price);
    });

    cy.apiRequest('GET', '/products?sort=price-desc&limit=1&offset=1').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.items).to.have.length(1);
      expect(response.body.items[0].id).to.eq('trail-backpack');
    });
  });

  it('API-06 - GET /products rejects out-of-range query parameters (boundaries)', () => {
    cy.apiRequest('GET', '/products?limit=1').its('status').should('eq', 200);

    cy.apiRequest('GET', '/products?limit=50').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.items).to.have.length(4); // fewer items than the page size is valid
    });

    [
      { query: 'limit=0', field: 'limit' },
      { query: 'limit=51', field: 'limit' },
      { query: 'limit=abc', field: 'limit' },
      { query: 'offset=-1', field: 'offset' },
      { query: 'sort=price=asc', field: 'sort' }
    ].forEach(({ query, field }) => {
      cy.apiRequest('GET', `/products?${query}`).then((response) => {
        expect(response.status, query).to.eq(400);
        expect(response.body.error.code, query).to.eq('INVALID_PARAMETER');
        expect(response.body.error.field, query).to.eq(field);
      });
    });
  });

  it('API-07 - GET /products/:id returns one product, or 404 PRODUCT_NOT_FOUND', () => {
    cy.apiRequest('GET', '/products/iphone18').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.include({ id: 'iphone18', name: 'iPhone18', price: 3079 });
    });

    cy.apiRequest('GET', '/products/does-not-exist').then((response) => {
      expect(response.status).to.eq(404);
      expect(response.body.error.code).to.eq('PRODUCT_NOT_FOUND');
    });
  });

  it('API-08 - the router answers 405 with Allow, and 404 on an unknown route', () => {
    cy.apiRequest('POST', '/health').then((response) => {
      expect(response.status).to.eq(405);
      expect(response.headers.allow).to.eq('GET');
      expect(response.body.error.code).to.eq('METHOD_NOT_ALLOWED');
    });

    cy.apiRequest('GET', '/unknown-endpoint').then((response) => {
      expect(response.status).to.eq(404);
      expect(response.body.error.code).to.eq('NOT_FOUND');
    });
  });
});
