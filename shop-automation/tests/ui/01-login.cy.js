/**
 * 01 - Authentication.
 * Locators: associated label + role + accessible name (no CSS, no XPath).
 */
describe('01 - Authentication', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('UI-AUTH-01 - signs a valid user in and shows the catalogue', () => {
    cy.findByLabelText('Email').type('qa@example.com');
    cy.findByLabelText('Password').type('Sup3rSecre7!', { log: false });
    cy.findByRole('button', { name: 'Sign in' }).click();

    // Wait for an observable outcome, not for a duration.
    cy.findByRole('heading', { name: 'Products' }).should('be.visible');
    cy.location('hash').should('eq', '#products');
  });

  it('UI-AUTH-02 - rejects an invalid password and stays on the sign-in form', () => {
    cy.findByLabelText('Email').type('qa@example.com');
    cy.findByLabelText('Password').type('wrong-password', { log: false });
    cy.findByRole('button', { name: 'Sign in' }).click();

    cy.findByRole('alert')
      .should('be.visible')
      .and('contain.text', 'Invalid email or password');
    cy.findByRole('heading', { name: 'Products' }).should('not.exist');
  });
});
