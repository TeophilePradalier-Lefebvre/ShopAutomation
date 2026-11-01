# Individual contribution record

> Deliverable F of the brief: the area, the files and what each member can personally explain
> during the demonstration. Every member is also expected to understand the whole framework.

## Chris KOUAO & Leynel LOWE YOUMBI - UI implementation (application screens + `tests/ui`)

| Item | Detail |
| --- | --- |
| Area | Application under test, page-object layer, shared commands, UI specs, mandatory UI controls |
| Files | `server.js`, `public/index.html`, `public/app.js`, `public/support.js`, `public/styles.css`, `cypress/support/e2e.js`, `cypress/support/commands.js`, `cypress/support/pages/*.js`, `tests/ui/01-login.cy.js` to `tests/ui/07-support-validation.cy.js`, `tests/labs/*` |
| Can explain | why the Support / return-request screen exists (textarea, number field, file and image upload, date picker, native dialog, live counter - one screen with real behaviour instead of seven disconnected mock controls); why the dropdown requirement is covered by the catalogue sort selector; scoping vs `cy.contains` (why `.filter().should('have.length', 1)` proves uniqueness and `cy.contains` does not); the iframe handling; the overlay/actionability story; why no `cy.wait(<ms>)` appears in the suite; how `UI-SUP-07`/`08` prove persistence and deletion |

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
| Suite layout | `tests/ui/**` (31 UI tests), `tests/api/**` (13 SHOP API tests), `tests/api-public/**` (117 DummyJSON tests, opt-in), `tests/labs/**` (two deliberately red labs, outside `specPattern`) |
| Default run | `npm test` runs `tests/ui` + `tests/api` (offline). `npm run test:api:public` runs the DummyJSON suite (internet) |
| Cypress version | `15.21.1`, pinned in `package.json` and `package-lock.json` (the DummyJSON suite was first run on 16.2.0; `Cypress.expose()` exists since 15.10) |
| Inventory | `TEST_CASES.md` (SHOP) and `docs/Test_Case_Inventory.xlsx` (UI, SHOP API and DummyJSON API, 161 cases) |
| Oral defence | each member presents their own area and can answer questions on the rest |
