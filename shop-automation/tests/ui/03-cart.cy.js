/**
 * 03 - Cart: scoping (uniqueness) + quantity + line options.
 * Course case study: "when I add iPhone18, the cart must contain exactly one iPhone18".
 *
 * Locating rule: NEVER take the first element implicitly. Start from the whole
 * collection, filter it by content, then prove that the filter really reduces it
 * to one element (4 -> 1). `cy.contains(sel, txt)` is banned to prove uniqueness:
 * it returns at most one element (the first one), so `.should('have.length', 1)`
 * behind it asserts nothing.
 */
describe('03 - Cart: scoping and quantity', () => {
  beforeEach(() => {
    cy.loginAsTestUser();
    cy.acceptCookies();
  });

  it('UI-CART-01 - adds the identified product and verifies the cart state', () => {
    // 1. Scope: the product card is identified by its title, not by its position.
    //    Non-empty proof: 4 cards at the start, a single one after filtering.
    cy.get('[data-testid="product-card"]').should('have.length', 4);
    cy.get('[data-testid="product-card"]')
      .filter(':contains("iPhone18")')
      .should('have.length', 1)
      .within(() => {
        // 2. Act: the action happens INSIDE the card.
        cy.get('[data-testid="add-to-cart"]').click();
      });

    // 3. Assert: product identity + exact quantity.
    cy.openCart();
    cy.get('[data-testid="cart-row"]')
      .filter(':contains("iPhone18")')
      .should('have.length', 1)
      .within(() => {
        cy.get('[data-testid="cart-item-name"]').should('have.text', 'iPhone18');
        cy.get('[data-testid="cart-item-quantity"]').should('have.text', '1');
      });
    cy.get('[data-testid="cart-count"]').should('have.text', '1');
  });

  it('UI-CART-02 - increments the quantity of an existing line', () => {
    cy.addProductCardToCart('iPhone18');
    cy.openCart();

    // After the click the row is re-rendered: query the collection again instead
    // of continuing the chain on a node detached from the DOM.
    cy.get('[data-testid="cart-row"]')
      .filter(':contains("iPhone18")')
      .should('have.length', 1)
      .within(() => {
        cy.get('[data-testid="qty-increase"]').click();
      });

    cy.get('[data-testid="cart-row"]')
      .filter(':contains("iPhone18")')
      .should('have.length', 1)
      .within(() => {
        cy.get('[data-testid="cart-item-quantity"]').should('have.text', '2');
      });

    cy.get('[data-testid="cart-subtotal"]').should('have.text', '6158.00'); // 3079 x 2
  });

  it('UI-CART-03 - a global locator matches 4 buttons: scope before acting', () => {
    // The same data-testid exists once per card: 4 buttons.
    cy.get('[data-testid="add-to-cart"]').should('have.length', 4);

    // cy.get('[data-testid="add-to-cart"]').click() would fail here with
    // "cy.click() can only be called on a single element".
    cy.get('[data-testid="product-card"]')
      .filter(':contains("Smartwatch")')
      .should('have.length', 1)
      .within(() => {
        cy.get('[data-testid="add-to-cart"]').should('have.length', 1).click();
      });

    cy.get('[data-testid="cart-count"]').should('have.text', '1');
  });

  it('UI-CART-04 - keeps the gift-wrap option on the cart line', () => {
    cy.get('[data-testid="product-card"]')
      .filter(':contains("Smartwatch")')
      .should('have.length', 1)
      .within(() => {
        cy.get('[data-testid="gift-wrap"]').check();
        cy.get('[data-testid="add-to-cart"]').click();
      });

    cy.openCart();
    cy.get('[data-testid="cart-row"]')
      .filter(':contains("Smartwatch")')
      .should('have.length', 1)
      .should('contain.text', '(gift wrap)');
  });
});
