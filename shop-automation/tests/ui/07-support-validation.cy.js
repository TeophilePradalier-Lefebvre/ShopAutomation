/**
 * 07 - Support form validation (data-driven).
 *
 * The dataset lives in cypress/fixtures/return-requests.json: one row per rule.
 * Adding a rule means adding a row, not writing a new test - that is the point
 * of a data-driven test. Kept in its own spec so it can run on another worker.
 */
const support = require('../../cypress/support/pages/supportPage');
const dataset = require('../../cypress/fixtures/return-requests.json');
const { uniqueReference, isoDaysFromToday } = require('../../cypress/support/utils');

const FIELDS = {
  name: 'Camille Martin',
  quantity: '2',
  description: 'The left earpiece stopped working after two days of normal use.',
  purchasedOn: isoDaysFromToday(-10)
};

function validRequest(overrides = {}) {
  return Object.assign({ reference: uniqueReference() }, FIELDS, overrides);
}

const MESSAGES = {
  photo: 'Only .png, .jpg or .pdf files up to 1 MB are accepted'
};

describe('07 - Support form validation', () => {
  beforeEach(() => {
    cy.loginAsTestUser();
    support.open();
  });

  dataset.boundaries.forEach((row) => {
    it(`UI-SUP-03 - accepts the ${row.case}`, () => {
      const request = validRequest({ quantity: row.quantity });

      support.fill(request);
      support.acceptTerms();
      support.submit();

      support.confirmation().should('be.visible').and('contain.text', 'received');
      support.row(request.reference).should('contain.text', `qty ${row.quantity}`);
    });
  });

  dataset.invalid.forEach((row) => {
    it(`UI-SUP-04 - refuses ${row.case} (data-driven)`, () => {
      const request = validRequest();
      if (row.value !== undefined) request[row.field] = row.value;
      if (row.dateOffset !== undefined) request.purchasedOn = isoDaysFromToday(row.dateOffset);

      support.fill(request);
      if (request.terms !== false) support.acceptTerms();
      support.submit();

      support.expectError(row.field, row.message);
      support.confirmation().should('not.be.visible');
    });
  });

  it('UI-SUP-05 - refuses an unsupported file type before calling the API', () => {
    cy.intercept('POST', '**/api/v1/tickets').as('createTicket');

    support.fill(validRequest());
    support.attachPhoto('malware.exe', 'MZ-not-really-a-virus');
    support.photoLabel().should('be.visible').and('contain.text', 'malware.exe');

    support.acceptTerms();
    support.submit();

    support.expectError('photo', MESSAGES.photo);
    support.confirmation().should('not.be.visible');
    cy.get('@createTicket.all').should('have.length', 0);
  });

  it('UI-SUP-05b - refuses a file heavier than 1 MB', () => {
    support.fill(validRequest());
    support.attachPhoto('scan.pdf', 1024 * 1024 + 1, 'application/pdf');
    support.acceptTerms();
    support.submit();

    support.expectError('photo', MESSAGES.photo);
    support.confirmation().should('not.be.visible');
  });

  it('UI-SUP-06 - updates the character counter live and caps the text area at 500', () => {
    support.counter().should('have.text', '0 / 500');

    support.field('description').type('A'.repeat(20));
    support.counter().should('have.text', '20 / 500');

    support.field('description').clear().type('B'.repeat(500), { delay: 0 });
    support.counter().should('have.text', '500 / 500');
    support.field('description').invoke('val').should('have.length', 500);

    support.field('description').clear();
    support.counter().should('have.text', '0 / 500');
  });
});
