const fs = require('fs');
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  // Public (non-secret) values, read with Cypress.expose('name').
  // They belong to the optional DummyJSON suite (tests/api-public): the account below is the
  // demo account published in the DummyJSON documentation. Nothing goes through Cypress.env(),
  // removed in Cypress 16. A real secret would use cy.env() / process.env.
  expose: {
    publicApiUrl: 'https://dummyjson.com',
    publicApiUsername: 'emilys',
    publicApiPassword: 'emilyspass'
  },
  e2e: {
    baseUrl: 'http://localhost:3000',
    // Default suites (offline, application under test = SHOP): UI + SHOP API.
    // tests/api-public (DummyJSON, needs internet) is opt-in: npm run test:api:public.
    specPattern: ['tests/ui/**/*.cy.js', 'tests/api/**/*.cy.js'],
    supportFile: 'cypress/support/e2e.js',
    viewportWidth: 1280,
    viewportHeight: 800,
    video: true,
    videoCompression: 28,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 4000, // bounded wait: a maximum, never a sleep
    requestTimeout: 5000,
    responseTimeout: 5000,
    retries: { runMode: 1, openMode: 0 }, // retries = diagnostic signal, never a fix
    setupNodeEvents(on, config) {
      on('task', {
        log(message) {
          console.log('[task]', message);
          return null;
        },
        // Evidence of every DummyJSON call (secrets already redacted by public-api/clients).
        // One file per Cypress process, so parallel workers never write to the same file.
        evidence(entry) {
          fs.mkdirSync('reports/evidence', { recursive: true });
          const line = JSON.stringify({ ...entry, pid: process.pid }) + '\n';
          fs.appendFileSync(`reports/evidence/api-evidence-${process.pid}.jsonl`, line);
          return null;
        }
      });
      return config;
    }
  }
});
