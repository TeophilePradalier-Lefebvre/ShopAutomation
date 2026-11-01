/**
 * 02 - Catalogue: search, empty state, sorting (dropdown).
 * Illustrates a Page Object: selectors live in catalogPage.js, the specs express
 * a business intention.
 */
const catalog = require('../../cypress/support/pages/catalogPage');

describe('02 - Catalogue: search and sorting', () => {
  beforeEach(() => {
    cy.loginAsTestUser();
    cy.acceptCookies();
  });

  it('UI-CAT-01 - filters the catalogue on a search term', () => {
    catalog.search('trail backpack');

    catalog.card('Trail Backpack').should('be.visible');
    catalog.cards.should('have.length', 1);
    catalog.noResults.should('not.be.visible');
  });

  it('UI-CAT-02 - shows an explicit empty state when nothing matches', () => {
    catalog.search('nintendo');

    catalog.cards.should('have.length', 0);
    catalog.noResults.should('be.visible').and('contain.text', 'No products match');
  });

  it('UI-CAT-03 - sorts the catalogue by ascending price and keeps the selected option', () => {
    catalog.sortBy('price-asc');

    // Dropdown: the selected value is asserted, not just the click.
    cy.findByRole('combobox', { name: 'Sort by' }).should('have.value', 'price-asc');

    cy.get('[data-testid="product-card"] h2').then(($titles) => {
      const names = [...$titles].map((el) => el.textContent.trim());
      expect(names).to.deep.equal(['Water Bottle', 'Smartwatch', 'Trail Backpack', 'iPhone18']);
    });
  });
});
