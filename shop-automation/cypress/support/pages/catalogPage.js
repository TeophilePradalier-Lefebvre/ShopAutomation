/**
 * Light Page Object for the catalogue screen.
 * Goal: keep selectors in ONE place and expose business intent to the specs
 * (search, sort, add to cart) instead of raw CSS selectors.
 *
 * Getters return a Cypress chain, so retry-ability is preserved: nothing is cached.
 */
class CatalogPage {
  get title() {
    return cy.findByRole('heading', { name: 'Products' });
  }

  get grid() {
    return cy.get('[data-testid="product-grid"]');
  }

  get cards() {
    return cy.get('[data-testid="product-card"]');
  }

  get noResults() {
    return cy.get('[data-testid="no-results"]');
  }

  /** Whole collection filtered by content: returns 0, 1 or n cards.
   *  cy.contains() would be an implicit .first() (at most one element), hence
   *  unusable to prove uniqueness. */
  card(productName) {
    return cy
      .get('[data-testid="product-card"]')
      .filter(`:contains("${productName}")`);
  }

  search(term) {
    cy.findByRole('searchbox', { name: 'Search products' }).clear().type(term);
    cy.findByRole('button', { name: 'Search' }).click();
    return this;
  }

  sortBy(value) {
    cy.findByRole('combobox', { name: 'Sort by' }).select(value);
    return this;
  }

  addToCart(productName) {
    this.card(productName)
      .should('have.length', 1)
      .within(() => {
        cy.get('[data-testid="add-to-cart"]').click();
      });
    return this;
  }
}

module.exports = new CatalogPage();
