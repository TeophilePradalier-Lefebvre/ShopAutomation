/**
 * Page Object for the Support / return-request screen.
 *
 * Rules kept from the course:
 *  - selectors live here and nowhere else;
 *  - getters return a Cypress chain (no cached element, retry-ability preserved);
 *  - methods speak business intent ("submit a return request"), not clicks.
 */

const SEL = {
  navLink: '[data-testid="support-link"]',
  title: '[data-testid="support-title"]',
  form: '[data-testid="ticket-form"]',
  field: (name) => `[data-testid="ticket-${name}"]`,
  error: (name) => `[data-testid="error-${name}"]`,
  counter: '[data-testid="description-counter"]',
  photoName: '[data-testid="photo-name"]',
  submit: '[data-testid="submit-ticket"]',
  clear: '[data-testid="clear-ticket"]',
  confirmation: '[data-testid="ticket-confirmation"]',
  list: '[data-testid="ticket-list"]',
  row: '[data-testid="ticket-row"]',
  summary: '[data-testid="ticket-summary"]',
  empty: '[data-testid="ticket-empty"]',
  deleteButton: '[data-testid="delete-ticket"]',
  dialog: '[data-testid="confirm-dialog"]',
  dialogTarget: '[data-testid="confirm-target"]',
  confirmDelete: '[data-testid="confirm-delete"]',
  cancelDelete: '[data-testid="cancel-delete"]'
};

class SupportPage {
  /* ---------- navigation ---------- */
  open() {
    cy.get(SEL.navLink).click();
    cy.get(SEL.title).should('be.visible');
    cy.location('hash').should('eq', '#support');
    return this;
  }

  /* ---------- form ---------- */
  field(name) {
    return cy.get(SEL.field(name));
  }

  error(name) {
    return cy.get(SEL.error(name));
  }

  expectError(name, message) {
    cy.get(SEL.error(name)).should('be.visible').and('have.text', message);
    return this;
  }

  expectNoError(name) {
    cy.get(SEL.error(name)).should('not.be.visible').and('have.text', '');
    return this;
  }

  /** Fill every text-like field at once; `quantity` is a number input, so it is typed as text. */
  fill(payload) {
    const { reference, name, quantity, description, purchasedOn } = payload;

    if (reference !== undefined) cy.get(SEL.field('reference')).clear().type(reference);
    if (name !== undefined) cy.get(SEL.field('name')).clear().type(name);
    if (quantity !== undefined) {
      cy.get(SEL.field('quantity')).clear();
      // An empty string is a legitimate "left blank" case: typing '' would wait forever.
      if (quantity !== '') cy.get(SEL.field('quantity')).type(String(quantity));
    }
    if (description !== undefined) cy.get(SEL.field('description')).clear().type(description);
    if (purchasedOn !== undefined) cy.get(SEL.field('purchasedOn')).clear().type(purchasedOn);
    return this;
  }

  /** Attach a file built in memory: no binary fixture, the size is explicit in the test. */
  attachPhoto(fileName, contents = 'fake-binary-content', mimeType = 'application/octet-stream') {
    const payload =
      typeof contents === 'number'
        ? Cypress.Buffer.alloc(contents, 0x41) // N bytes, enough to test the 1 MB rule
        : Cypress.Buffer.from(String(contents));

    cy.get(SEL.field('photo')).selectFile({ contents: payload, fileName, mimeType });
    return this;
  }

  acceptTerms() {
    cy.get(SEL.field('terms')).check();
    return this;
  }

  submit() {
    cy.get(SEL.submit).click();
    return this;
  }

  clearForm() {
    cy.get(SEL.clear).click();
    return this;
  }

  /* ---------- dynamic elements ---------- */
  counter() {
    return cy.get(SEL.counter);
  }

  photoLabel() {
    return cy.get(SEL.photoName);
  }

  confirmation() {
    return cy.get(SEL.confirmation);
  }

  /* ---------- list + dialog ---------- */
  /** Exactly one row for that reference: use it when the row must exist. */
  row(reference) {
    return cy
      .get(SEL.row)
      .filter(`[data-reference="${reference}"]`)
      .should('have.length', 1);
  }

  /** Same selection without the "exactly one" assertion: needed to prove absence. */
  rowOrNone(reference) {
    return cy.get(SEL.row).filter(`[data-reference="${reference}"]`);
  }

  rows() {
    return cy.get(SEL.row);
  }

  emptyState() {
    return cy.get(SEL.empty);
  }

  openDeleteDialog(reference) {
    this.row(reference).within(() => {
      cy.get(SEL.deleteButton).click();
    });
    cy.get(SEL.dialog).should('be.visible');
    return this;
  }

  cancelDelete() {
    cy.get(SEL.cancelDelete).click();
    cy.get(SEL.dialog).should('not.be.visible');
    return this;
  }

  confirmDelete() {
    cy.get(SEL.confirmDelete).click();
    cy.get(SEL.dialog).should('not.be.visible');
    return this;
  }

  dialogTarget() {
    return cy.get(SEL.dialogTarget);
  }
}

module.exports = new SupportPage();
module.exports.SEL = SEL;
