// Semantic queries (role, label, text) -> same intent as Playwright's getByRole/getByLabel.
require('@testing-library/cypress/add-commands');

// Project-level commands and helpers.
require('./commands');
require('./apiClient');

// Deterministic failures: an unexpected browser error should fail the test.
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('ResizeObserver')) return false;
  return true;
});
