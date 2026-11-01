/**
 * 04 - Checkout: synchronisation (overlay), iframe, delivery options.
 * No cy.wait(<duration>): we wait for observable states only.
 */
describe('04 - Checkout: synchronisation, iframe, delivery', () => {
  beforeEach(() => {
    cy.loginAsTestUser();
    cy.acceptCookies();
    cy.addProductCardToCart('iPhone18');
  });

  it('UI-CHK-01 - waits for the synchronisation overlay to disappear instead of a fixed delay', () => {
    cy.findByRole('link', { name: /cart/i }).click();

    // The overlay really exists: without actionability auto-wait, the click would be intercepted.
    cy.get('[data-testid="cart-mask"]').should('be.visible');

    // No explicit wait: Cypress retries actionability until 4000 ms.
    cy.findByRole('button', { name: 'Continue checkout' }).click();
    cy.findByRole('heading', { name: 'Checkout' }).should('be.visible');
  });

  it('UI-CHK-02 - fills the card inside the payment iframe and confirms the order', () => {
    cy.openCart();
    cy.findByRole('button', { name: 'Continue checkout' }).click();
    cy.findByRole('heading', { name: 'Checkout' }).should('be.visible');

    // Nested browsing context: enter the iframe document.
    cy.get('[data-testid="payment-frame"]').then(($iframe) => {
      const body = $iframe.contents().find('body');
      cy.wrap(body).find('#card-number').should('be.visible').type('4242424242424242');
    });

    cy.findByRole('button', { name: 'Place order' }).click();
    cy.get('[data-testid="order-confirmation"]')
      .should('be.visible')
      .and('have.text', 'Order placed');
  });

  it('UI-CHK-03 - recalculates the total when express delivery is selected', () => {
    cy.openCart();
    cy.get('[data-testid="cart-total"]').should('have.text', '3079.00');

    cy.findByRole('radio', { name: /express/i }).check();
    cy.get('[data-testid="cart-total"]').should('have.text', '3088.00'); // 3079 + 9
  });
});
