/**
 * LAB 1 - Diagnostique : "l'element est trouve mais le clic n'aboutit pas".
 * Ce spec est VOLONTAIREMENT rouge : le masque de synchronisation ne disparait
 * jamais (?mask=persistent) et le clic est intercepte par l'overlay.
 * Il documente le message d'erreur reel de Cypress (actionability), a ne pas
 * masquer avec { force: true }.
 */
describe('LAB 1 - Actionability : clic intercepte par un overlay', () => {
  it("echoue quand le masque de synchronisation reste affiche", () => {
    cy.visit('/?mask=persistent');
    cy.window().then((win) => {
      win.__shop.loginUser('qa@example.com');
    });
    cy.findByRole('heading', { name: 'Products' }).should('be.visible');

    cy.addProductCardToCart('iPhone18');
    cy.findByRole('link', { name: /cart/i }).click();

    cy.get('[data-testid="cart-mask"]').should('be.visible');
    cy.findByRole('button', { name: 'Continue checkout' }).click();
    cy.findByRole('heading', { name: 'Checkout' }).should('be.visible');
  });
});
