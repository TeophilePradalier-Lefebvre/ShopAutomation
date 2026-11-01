/**
 * 05 - Cookie banner: an overlay present on load.
 * We test the expected behaviour (visible -> accepted -> hidden), then every
 * other spec starts with the banner already accepted (isolation).
 */
describe('05 - Cookie banner', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('UI-COOKIE-01 - hides the banner once accepted', () => {
    cy.get('[data-testid="cookie-banner"]').should('be.visible').and('contain.text', 'cookies');

    cy.findByRole('button', { name: 'Accept' }).click();

    cy.get('[data-testid="cookie-banner"]').should('not.be.visible');
  });
});
