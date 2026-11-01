/**
 * 06 - Support / return request.
 *
 * One screen, every mandatory control of the brief:
 *   text input (reference, name) - number input (quantity) - text area (description)
 *   date input - file input with type/size rules - checkbox - custom dialog.
 *
 * Locators: accessible label first, then role/testid. No XPath, no nth-child.
 * State is always asserted on what the user can observe (messages, rows, hash),
 * and cross-checked against the API when the point is "was it really stored?".
 */
const support = require('../../cypress/support/pages/supportPage');
const catalog = require('../../cypress/support/pages/catalogPage');
const dataset = require('../../cypress/fixtures/return-requests.json');
const { uniqueReference, isoDaysFromToday, ticketPayload } = require('../../cypress/support/utils');

const FIELDS = {
  name: 'Camille Martin',
  quantity: '2',
  description: 'The left earpiece stopped working after two days of normal use.',
  purchasedOn: isoDaysFromToday(-10)
};

/** A request the API accepts; a test overrides exactly the field it is about. */
function validRequest(overrides = {}) {
  return Object.assign({ reference: uniqueReference() }, FIELDS, overrides);
}

const MESSAGES = {
  photo: 'Only .png, .jpg or .pdf files up to 1 MB are accepted'
};

describe('06 - Support / return request', () => {
  beforeEach(() => {
    cy.loginAsTestUser();
    support.open();
  });

  it('UI-SUP-01 - submits a valid request, confirms it and proves it was stored', () => {
    const request = validRequest({ quantity: '3' });

    support.fill(request);
    support.attachPhoto('damage.png', 'png-bytes', 'image/png');
    support.acceptTerms();
    support.submit();

    support
      .confirmation()
      .should('be.visible')
      .and('contain.text', 'received. We will reply within 2 business days.')
      .invoke('text')
      .then((text) => {
        const ticketId = /TCK-\d{4}/.exec(text)[0];

        // State verification: the record the API serves is the one the form sent.
        cy.apiLogin('primary')
          .then((token) => cy.apiRequest('GET', `/tickets/${ticketId}`, { token }))
          .then((response) => {
            expect(response.status).to.eq(200);
            expect(response.body).to.include({
              id: ticketId,
              reference: request.reference,
              quantity: 3,
              status: 'OPEN'
            });
            expect(response.body.photo).to.deep.eq({ name: 'damage.png', size: 9 });
          });
      });

    support.row(request.reference).should('contain.text', 'qty 3').and('contain.text', 'OPEN');

    // The form is ready for the next request.
    support.field('reference').should('have.value', '');
    support.counter().should('have.text', '0 / 500');
  });

  it('UI-SUP-02 - blocks an empty form, names every missing field and sends nothing', () => {
    cy.intercept('POST', '**/api/v1/tickets').as('createTicket');

    support.submit();

    support.expectError('reference', 'Use the format SHOP-12345');
    support.expectError('name', 'Full name must be between 3 and 60 characters');
    support.expectError('quantity', 'Quantity must be a whole number between 1 and 5');
    support.expectError('description', 'Description must be between 20 and 500 characters');
    support.expectError(
      'purchasedOn',
      'Purchase date must be a valid date, not in the future, and within the last year'
    );
    support.expectError('terms', 'You must accept the return policy');
    support.expectNoError('photo'); // the photo is optional: it must not block the form

    support.confirmation().should('not.be.visible');
    cy.get('@createTicket.all').should('have.length', 0);
  });

  it('UI-SUP-07 - asks for confirmation: cancel keeps the request, confirm deletes it', () => {
    const request = ticketPayload({ reference: uniqueReference() });

    cy.intercept('GET', '**/api/v1/tickets').as('listTickets');
    cy.apiLogin('primary').then((token) => cy.apiCreateTicket(token, request));
    // A real reload of /#support: the page boots, restores the session and hydrates the list.
    cy.reload();
    cy.wait('@listTickets');

    support.row(request.reference).should('contain.text', request.reference);

    support.openDeleteDialog(request.reference);
    support.dialogTarget().should('contain.text', request.reference);
    support.cancelDelete();
    support.row(request.reference).should('exist'); // nothing was deleted

    support.openDeleteDialog(request.reference);
    support
      .dialogTarget()
      .invoke('text')
      .then((text) => {
        const ticketId = /TCK-\d{4}/.exec(text)[0];
        support.confirmDelete();
        support.confirmation().should('contain.text', `Request ${ticketId} deleted`);
        support.rowOrNone(request.reference).should('not.exist');
        cy.apiLogin('primary')
          .then((token) => cy.apiRequest('GET', `/tickets/${ticketId}`, { token }))
          .its('status')
          .should('eq', 404);
      });
  });

  it('UI-SUP-08 - keeps a submitted request after a full page reload', () => {
    const request = validRequest();

    support.fill(request);
    support.acceptTerms();
    support.submit();
    support.confirmation().should('contain.text', 'received');

    cy.reload();

    support.open();
    support.row(request.reference).should('contain.text', request.reference);
  });

  it('UI-SUP-09 - regression: the catalogue still searches after the Support view was added', () => {
    cy.visit('/#products');
    catalog.title.should('be.visible');
    catalog.cards.should('have.length', 4);

    cy.findByLabelText('Search products').type('Watch');
    cy.get('[data-testid="search-submit"]').click();

    catalog.cards.should('have.length', 1).and('contain.text', 'Smartwatch');

    cy.get('[data-testid="cart-link"]').click();
    cy.findByRole('heading', { name: 'Cart' }).should('be.visible');
    support.open(); // the header link added for this screen still works
  });

  it('UI-SUP-10 - a second user never sees another user request', () => {
    const request = ticketPayload({ reference: uniqueReference() });

    cy.intercept('GET', '**/api/v1/tickets').as('listTickets');
    cy.apiLogin('primary').then((token) => cy.apiCreateTicket(token, request));

    cy.loginAsTestUser('secondary');
    support.open();
    cy.wait('@listTickets');

    support.emptyState().should('be.visible');
    support.rows().should('have.length', 0);
    cy.get('[data-testid="ticket-list"]').should('not.contain.text', request.reference);
  });
});
