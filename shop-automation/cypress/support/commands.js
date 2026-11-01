/**
 * Reusable custom commands = the first layer of the framework.
 * Each one encodes an intent ("log in as the test user"), not a list of clicks
 * that a test has to repeat.
 */

const users = require('../fixtures/users.json');
/** Fast, deterministic authenticated start (Cypress "app action").
 *  The real credential flow is still covered by a dedicated UI test (01-login).
 *  The token is real: it comes from POST /api/v1/auth/login, so every screen that
 *  calls the API (support, cart hydration) starts in a state a user could reach. */
Cypress.Commands.add('loginAsTestUser', (which = 'primary') => {
  const user = typeof which === 'string' ? users[which] : which;

  cy.request({
    method: 'POST',
    url: `${Cypress.config('baseUrl')}/api/v1/auth/login`,
    body: { email: user.email, password: user.password }
  })
    .its('body.token')
    .then((token) => {
      cy.visit('/');
      cy.window().then((win) => {
        win.__shop.loginUser(user.email);
        win.__shop.setToken(token);
      });
    });

  cy.findByRole('heading', { name: 'Products' }).should('be.visible');
});

/** Dismiss the cookie banner when it is present (overlay that can intercept clicks). */
Cypress.Commands.add('acceptCookies', () => {
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="cookie-banner"]:not([hidden])').length) {
      cy.findByRole('button', { name: 'Accept' }).click();
    }
  });
  cy.get('[data-testid="cookie-banner"]').should('not.be.visible');
});

/** Scope first, then act: locate the product card by its title, act inside that card.
 *
 *  Why not `cy.contains('[data-testid="product-card"]', name)`?
 *  cy.contains() returns AT MOST one element (the first node whose text contains
 *  the string), so a `.should('have.length', 1)` behind it proves nothing: the
 *  length is 1 by construction. It is also an implicit `.first()`, which the
 *  course explicitly forbids. We start from the whole collection, filter it, then
 *  verify that it contains exactly one element. */
Cypress.Commands.add('addProductCardToCart', (productName) => {
  cy.get('[data-testid="product-card"]')
    .filter(`:contains("${productName}")`)
    .should('have.length', 1)
    .and('contain.text', productName)
    .within(() => {
      cy.get('[data-testid="add-to-cart"]').click();
    });
});

/** Navigate to the cart through the user-facing link, then confirm the cart page exists. */
Cypress.Commands.add('openCart', () => {
  cy.findByRole('link', { name: /cart/i }).click();
  cy.findByRole('heading', { name: 'Cart' }).should('be.visible');
});

Cypress.Commands.add('readCartLine', (productName) => {
  return cy
    .get('[data-testid="cart-row"]')
    .filter(`:contains("${productName}")`)
    .should('have.length', 1)
    .within(() => {
      cy.get('[data-testid="cart-item-name"]').invoke('text').as('lineName');
      cy.get('[data-testid="cart-item-quantity"]').invoke('text').as('lineQty');
    });
});
