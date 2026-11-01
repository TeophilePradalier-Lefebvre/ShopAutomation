/**
 * LAB 2 - Defaut produit detecte par le test UI.
 * Regle metier : un article en rupture de stock (stock = 0) ne doit pas pouvoir
 * etre ajoute au panier.
 * Le test est VOLONTAIREMENT rouge : le bouton reste actif -> defaut ouvert,
 * documente avec capture d'ecran.
 */
describe('LAB 2 - Defaut : ajout possible d un article en rupture', () => {
  beforeEach(() => {
    cy.loginAsTestUser();
    cy.acceptCookies();
  });

  it('le bouton Add to cart devrait etre desactive quand stock = 0', () => {
    cy.get('[data-testid="product-card"]')
      .filter(':contains("Water Bottle")')
      .should('have.length', 1)
      .and('contain.text', 'Out of stock')
      .within(() => {
        cy.get('[data-testid="add-to-cart"]').should('have.length', 1);
        cy.get('[data-testid="add-to-cart"]').should('be.disabled');
      });
  });
});
