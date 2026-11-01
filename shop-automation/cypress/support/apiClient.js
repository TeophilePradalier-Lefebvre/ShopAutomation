/**
 * API layer used by the UI suite (state checks) and by the API suite.
 *
 * One place knows:
 *  - where the API lives: same origin as the UI, so Cypress.config('baseUrl') is enough
 *    (no hard-coded port, no Cypress.env() which is removed in Cypress 16);
 *  - how to authenticate: POST /api/v1/auth/login, bearer token;
 *  - how to fail loudly: failOnStatusCode is opt-in, so a test can assert a 422 body.
 */
const users = require('../fixtures/users.json');

const apiBase = () => `${Cypress.config('baseUrl')}/api/v1`;

/** Raw call: returns the full response so a test can assert status, headers and body. */
Cypress.Commands.add('apiRequest', (method, path, options = {}) => {
  const { token, body, headers = {}, failOnStatusCode = false } = options;

  return cy.request({
    method,
    url: apiBase() + path,
    body,
    failOnStatusCode,
    headers: Object.assign(
      { 'Content-Type': 'application/json' },
      token ? { Authorization: `Bearer ${token}` } : {},
      headers
    )
  });
});

/** Login through the API and yield the bearer token (setup, never the login test itself). */
Cypress.Commands.add('apiLogin', (which = 'primary') => {
  const user = users[which];

  return cy
    .request({
      method: 'POST',
      url: `${apiBase()}/auth/login`,
      body: { email: user.email, password: user.password }
    })
    .then((response) => response.body.token);
});

/** Create a ticket through the API: fast, deterministic seeding for UI tests. */
Cypress.Commands.add('apiCreateTicket', (token, payload) => {
  return cy
    .apiRequest('POST', '/tickets', { token, body: payload })
    .then((response) => {
      expect(response.status, 'ticket creation should succeed').to.eq(201);
      return response.body;
    });
});
