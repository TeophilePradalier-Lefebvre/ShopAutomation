# Individual contribution record

> Deliverable F of the brief: the area, the files and what each member can personally explain
> during the demonstration. Every member is also expected to understand the whole framework.

## Chris KOUAO - UI implementation: shop journey (specs 01 to 05 + labs)

| Item | Detail |
| --- | --- |
| Area | Shop journey (login, catalogue, cart, checkout, cookie banner), the two deliberately red labs, shared Cypress support layer |
| UI specs | `tests/ui/01-login.cy.js`, `02-catalog.cy.js`, `03-cart.cy.js`, `04-checkout.cy.js`, `05-cookie-banner.cy.js` (13 tests) |
| Labs (red on purpose) | `tests/labs/lab-1-overlay-actionability`, `tests/labs/lab-2-stock-defect` |
| Application code | `public/app.js`, `public/payment.html`, `public/styles.css`, the login / catalogue / cart / checkout views of `public/index.html`, `server.js` (server, login, products) |
| Cypress framework | `cypress/support/e2e.js`, `cypress/support/commands.js`, `cypress/support/pages/catalogPage.js` |
| Mandatory controls | dropdown (catalogue sort selector), checkbox (gift wrap), radio (express delivery), payment iframe, overlay and cookie banner |
| Documentation | `HANDOVER.md` (choice of the application and of the locators), `FAILURE_INVESTIGATION.md` section 5 (labs) |
| Can explain | why the dropdown requirement is covered by the catalogue sort selector; scoping vs `cy.contains` (why `.filter().should('have.length', 1)` proves uniqueness and `cy.contains` does not); the iframe handling of the payment page; the overlay/actionability story (lab 1) and the stock defect (lab 2); why no `cy.wait(<ms>)` appears in the suite |

## Leynel LOWE YOUMBI - UI implementation: Support / return-request screen (specs 06 and 07)

| Item | Detail |
| --- | --- |
| Area | Support / return-request screen, its server-side validation, the page object and the data used by the Support specs |
| UI specs | `tests/ui/06-support.cy.js` (6 tests), `tests/ui/07-support-validation.cy.js` (12 tests, including 9 data-driven iterations) |
| Application code | `public/support.js`, the Support view of `public/index.html`, `server.js` (`validateTicket()` and the `/tickets` routes) |
| Cypress framework | `cypress/support/pages/supportPage.js`, `cypress/fixtures/return-requests.json`, `cypress/fixtures/users.json` |
| Mandatory controls | text field, number field, textarea with live counter, file and image upload, date picker, native confirmation dialog |
| Documentation | `FAILURE_INVESTIGATION.md` sections 1 to 4, `README.md` section 5 (map of the controls) |
| Can explain | why the Support / return-request screen exists (one screen with real behaviour instead of seven disconnected mock controls); how each control is exercised and asserted; how the data-driven validation specs produce one reported iteration per data row; how `UI-SUP-07`/`08` prove persistence and deletion; how the native dialog is handled |

> Chris and Leynel each present their own block and can answer questions on the other's, as required by this file.

## Teophile PRADALIER-LEFEBVRE - API framework and integration

| Item | Detail |
| --- | --- |
| Area | API layer (SHOP and DummyJSON), configuration, merge of the UI and API projects |
| Files | `cypress/support/apiClient.js`, `cypress/support/utils.js`, `public-api/clients/apiClient.js`, `public-api/utils/assertions.js`, `public-api/test-data/*.json`, `cypress.config.js` (`expose` block, `evidence` task), `package.json` scripts, `tests/api-public/auth.cy.js`, `auth-advanced.cy.js`, `roles.cy.js` |
| Can explain | why the SHOP API base URL is derived from `baseUrl`; why public values use `Cypress.expose()` and not `Cypress.env()` (removed in Cypress 16); how the client centralises URL, bearer token and evidence; how secrets are redacted before being written; why a 4xx is only accepted with `expectError: true`; why the DummyJSON suite is opt-in; how the two suites share one Cypress version and one config |

## Elysee Shalom MOUKOUMI - API test design and inventory

| Item | Detail |
| --- | --- |
| Area | API test strategy, scenario design, contract/boundary/negative cases, test data, inventory |
| Files | `tests/api/01-auth-products.cy.js`, `tests/api/02-tickets.cy.js`, `tests/api-public/products.cy.js`, `products-advanced.cy.js`, `cypress/fixtures/users.json`, `cypress/fixtures/return-requests.json`, `TEST_CASES.md`, `docs/Test_Case_Inventory.xlsx` |
| Can explain | how status code, schema, headers, boundaries, 401/403/405/422 and CRUD are asserted on the SHOP API; which cases come from the OpenAPI spec and which are "observed behaviour" because the spec is silent (`TC21`, `TC23`, `TC38`, `TC56-TC66`); why DummyJSON write tests check the response contract and not persistence; how one data row produces one reported iteration |

## Illia NALYVAIKO - parallel execution, evidence, failure analysis, documentation

| Item | Detail |
| --- | --- |
| Area | Parallel runner, execution evidence, failure investigation, README, presentation |
| Files | `scripts/run-parallel.js`, `scripts/summarize-evidence.js`, `reports/*`, `README.md`, `FAILURE_INVESTIGATION.md`, `tests/api-public/general.cy.js`, `resources.cy.js`, `resources-extra.cy.js`, `boundaries.cy.js`, `schema.cy.js`, presentation deck |
| Can explain | why each worker gets its own server and its own display; the measured 1/2/3-worker wall times; how to investigate a failure that only appears in parallel; how the evidence files prove concurrency; the reproduced application defects and their fixes; the `TC40` story (spec lists 401 and 403, first run pinned to 401 failed, code pinned to 403 from observation) |

## Merge and shared work

| Item | Detail |
| --- | --- |
| Suite layout | `tests/ui/**` (31 UI tests: 13 shop + 18 Support), `tests/api/**` (13 SHOP API tests), `tests/api-public/**` (117 DummyJSON tests, opt-in), `tests/labs/**` (two deliberately red labs, outside `specPattern`) |
| Default run | `npm test` runs `tests/ui` + `tests/api` (offline). `npm run test:api:public` runs the DummyJSON suite (internet) |
| Cypress version | `15.21.1`, pinned in `package.json` and `package-lock.json` (the DummyJSON suite was first run on 16.2.0; `Cypress.expose()` exists since 15.10) |
| Inventory | `TEST_CASES.md` (SHOP) and `docs/Test_Case_Inventory.xlsx` (UI, SHOP API and DummyJSON API, 161 cases) |
| Oral defence | each member presents their own area and can answer questions on the rest |
