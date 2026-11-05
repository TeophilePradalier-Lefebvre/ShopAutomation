# SHOP - UI & API test automation framework (Cypress)

Team project for the *Software Quality Assurance - UI & API Test Automation Challenge*
(Junia, team project). The repository contains two things:

1. **The application under test**: a demo e-commerce site ("SHOP") served by a small
   Express-free Node server, with a real JSON API (`/api/v1`), a support / return-request
   screen and a payment iframe.
2. **The automation framework**: 44 Cypress tests (31 UI + 13 API on SHOP), a page-object layer,
   an API client, data-driven fixtures, an independent-test design and a parallel runner.
   An **optional** suite of 117 tests against the public DummyJSON API is described in section 12.

The default suites run locally: no external service, no account, no network dependency
(only the optional DummyJSON suite of section 12 needs internet).

---

## 1. Prerequisites

| Requirement | Version used | Note |
| --- | --- | --- |
| Node.js | 20 to 24 (tested on 24) | `package.json` has no engine restriction beyond Node 20 |
| Cypress | **15.21.1, pinned** | see the version note in section 10 |
| `@testing-library/cypress` | 10.1.3 | semantic queries `findByRole`, `findByLabelText` |
| Linux headless | `xvfb` + GTK/NSS libraries | `apt-get install -y xvfb libgtk-3-0 libgbm1 libnss3 libasound2t64 libxss1 libxtst6 xauth` |

## 2. Install

```bash
npm install
npx cypress install     # downloads the Cypress binary
npx cypress verify
```

## 3. Run

```bash
# terminal 1 - application under test (port 3000)
npm start

# terminal 2 - UI + API suites, headless
npm test

# subsets
npm run test:ui         # tests/ui/**  (UI only)
npm run test:api        # tests/api/** (API only)

# parallel execution (one server + one Cypress process per worker)
npm run test:parallel               # 2 workers (default)
node scripts/run-parallel.js --workers 3

# interactive mode
npm run test:open
```

Expected result of `npm test`: **44 tests, 44 passing, 0 failing, 0 retries**
(Cypress reports ~47 s of test time; see section 7 for wall-clock numbers).

## 4. Project structure

```
cypress-ui-lab/
├── tests/                       # every spec, split by suite (one folder per owner)
│   ├── ui/                      # 31 UI tests
│   │   ├── 01-login.cy.js              UI-AUTH-01..02
│   │   ├── 02-catalog.cy.js            UI-CAT-01..03   (search, empty state, dropdown sort)
│   │   ├── 03-cart.cy.js               UI-CART-01..04  (scoping, quantity, gift wrap)
│   │   ├── 04-checkout.cy.js           UI-CHK-01..03   (overlay, iframe, delivery total)
│   │   ├── 05-cookie-banner.cy.js      UI-COOKIE-01
│   │   ├── 06-support.cy.js            UI-SUP-01..10   (return request lifecycle)
│   │   └── 07-support-validation.cy.js UI-SUP-03..06   (data-driven validation, files)
│   ├── api/                     # 13 API tests
│   │   ├── 01-auth-products.cy.js      API-01..08
│   │   └── 02-tickets.cy.js            API-09..13
│   ├── api-public/              # optional: 117 tests on the public DummyJSON API (section 12)
│   └── labs/                    # two deliberately red labs (outside specPattern)
├── cypress.config.js            # baseUrl, specPattern (tests/ui + tests/api), timeouts, retries
├── server.js                    # static server + JSON API /api/v1 (in-memory store)
├── public/                      # application under test (HTML / CSS / JS, payment iframe)
├── public-api/                  # client, assertions and JSON data of the DummyJSON suite
├── scripts/run-parallel.js      # parallel runner: server + Cypress per worker, log per worker
├── scripts/summarize-evidence.js # summary of the DummyJSON API evidence (reports/evidence)
├── cypress/                     # framework code only - no spec files here
│   ├── fixtures/                # users.json, return-requests.json (data-driven rows)
│   ├── support/
│   │   ├── e2e.js               # semantic queries + shared behaviour
│   │   ├── commands.js          # loginAsTestUser, acceptCookies, addProductCardToCart...
│   │   ├── apiClient.js         # apiRequest / apiLogin / apiCreateTicket
│   │   ├── utils.js             # uniqueReference, isoDaysFromToday, ticketPayload
│   │   └── pages/               # catalogPage.js, supportPage.js (page objects)
│   ├── screenshots/             # failure evidence (labs)
│   └── videos/                  # run evidence
├── reports/                     # execution logs used as evidence in the report
├── .env.example
├── HANDOVER.md                  # app/locator choices and how the UI and API suites were merged
├── TEST_CASES.md                # SHOP test-case inventory (deliverable E)
├── docs/Test_Case_Inventory.xlsx # combined inventory: UI, SHOP API and DummyJSON API
├── FAILURE_INVESTIGATION.md     # the failure story (deliverable B)
├── CONTRIBUTIONS.md             # individual contribution record (deliverable F)
└── package.json
```

`specPattern` in `cypress.config.js` lists `tests/ui/**/*.cy.js` and
`tests/api/**/*.cy.js`, so the two owners can merge their folders without editing a
single line of configuration. `tests/labs/` stays outside `specPattern` and is only run
on purpose (`npm run labs`).

## 5. Mandatory UI elements - where they are covered

| Required element | Screen | Covered by |
| --- | --- | --- |
| Text input (enter / edit / clear / validate) | Support: order reference, full name | UI-SUP-01/02/03/04, UI-CAT-01 |
| Number input (boundaries, invalid) | Support: quantity 1-5 | UI-SUP-03 (1 and 5), UI-SUP-04 (6, decimals) |
| Text area (multi-line) | Support: description 20-500 chars | UI-SUP-06 (live counter, cap at 500), UI-SUP-04 |
| File upload | Support: proof of purchase | UI-SUP-05 (`.txt` refused before any API call) |
| Image upload (accepted / rejected) | Support: `.png` accepted, `.txt` refused | UI-SUP-01 (`.png` stored), UI-SUP-05 |
| Dropdown | Catalogue: sort by | UI-CAT-03 (selected value + resulting order) |
| Date picker | Support: purchase date | UI-SUP-03 (valid), UI-SUP-04 (future, older than a year) |
| Dialog | Support: delete confirmation | UI-SUP-07 (cancel keeps, confirm deletes) |
| Dynamic elements | Toasts, ticket list, counter, cart mask | UI-SUP-01/06/08, UI-CHK-01 |

Nothing above is decorative: every control has server-side or client-side behaviour that
the tests assert (messages, stored rows, recomputed totals, hidden overlays).

## 6. API under test

Base URL: same origin as the UI, so `Cypress.config('baseUrl')` is the only configuration
(no hard-coded port, no `Cypress.env()`).

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v1/health` | service contract + safe headers |
| POST | `/api/v1/auth/login` | bearer token (32 chars), never echoes the password |
| GET | `/api/v1/products?sort=&limit=&offset=` | catalogue, pagination, 400 on bad ranges |
| GET | `/api/v1/products/:id` | single product, 404 `PRODUCT_NOT_FOUND` |
| GET/POST | `/api/v1/tickets` | list / create return requests (201 + `Location`) |
| GET/PATCH/DELETE | `/api/v1/tickets/:id` | read, change status, delete, 403 for another user |

Errors are explicit: `401` without token, `403` for another user's resource, `404`,
`405` with an `Allow` header, `422 VALIDATION_FAILED` with one message per field.

Business rules enforced by the API and by the UI: reference `^SHOP-\d{5}$`, name 3-60,
quantity 1-5, description 20-500, purchase date not in the future and not older than
365 days, photo `.png/.jpg/.jpeg/.pdf` up to 1 MB, return policy accepted.

## 7. Test independence and parallel execution

Independence rules applied in the suite:

- every test creates its own preconditions (`cy.loginAsTestUser()` logs in through the
  real API and injects a real token; `cy.acceptCookies()` dismisses the overlay);
- every created request uses a **unique reference** (`uniqueReference()`: random block +
  per-process counter), so two workers never collide;
- no test reads a record created by another test, and no test depends on a previous one;
  the current suite also passes with the spec files in reverse order
  (`reports/run-reverse-3.log`, 44/44);
- the two-user design proves isolation instead of assuming it: UI-SUP-10 and API-13
  check that a second account cannot see or delete the first account's data;
- no fixed `cy.wait(<ms>)` anywhere; only observable-state waits.

`scripts/run-parallel.js` starts **one application server per worker** on its own port
(`BASE_PORT + i`, default 3100, 3101, ...), gives each worker its own slice of the spec
files and its own log, and runs `xvfb-run -a` so two Cypress processes never fight for
display `:99`. A separate server per worker means a separate in-memory store: no shared
mutable state, which is exactly the failure mode that makes parallel suites flaky.

Measured on a 4 vCPU sandbox, same 9 specs, same runner (wall clock, includes server +
Cypress + Xvfb boot per worker):

| Configuration | Result | Wall time |
| --- | --- | --- |
| 1 worker (sequential) | 44/44 pass | 82 s |
| 2 workers | 44/44 pass | 62 s (-24 %) |
| 3 workers | 44/44 pass | 51 s (-38 %) |

For comparison, a plain `npx cypress run` (one process, no runner) reports **47 s** of
Cypress time and takes ~83 s end to end. The gain is limited by the fixed per-worker boot
cost and by the heaviest spec (`07-support-validation`, 27 s), which cannot be split
further without duplicating setup; on a larger suite or more cores the same design scales
further (`--workers 4`, or a CI matrix).

## 8. Reporting and evidence

Everything in `reports/` comes from real executions. Nothing is edited by hand.

| File | Content |
| --- | --- |
| `run-tests-layout.log` | full suite after the `tests/ui` + `tests/api` split, 44/44, 0 retry |
| `run-full-3.log` | full suite before the split (same specs, `cypress/e2e` paths), 44/44, 0 retry |
| `run-full-2.log`, `run-full-1.log` | earlier full runs (same suite shape) |
| `sequential-video-off.log` | earlier single-process baseline (`npx cypress run --config video=false`, before the split) |
| `par-1-w-workers.log`, `par-2-w-workers.log`, `par-3-w-workers.log` | parallel runs, 1/2/3 workers |
| `par-<n>/worker-<i>.log` | per-worker Cypress output (spec table, timings) |
| `run-reverse-3.log` | full suite after the split, specs in reverse order, 44/44 (order independence) |
| `bug-1-clear-selector.log`, `bug-2-date-testid.log`, `bug-3-boot-load.log` | the three reproduced application defects, before their fix |
| `labs-red.log` | the two deliberate failures (lab 1 and lab 2) |
| `evidence/api-evidence-<pid>.jsonl` | redacted request/response evidence of the DummyJSON suite (section 12) |
| `junit/` | JUnit XML report of the DummyJSON suite (`npm run test:report`) |

`grep -c "Attempt" reports/run-tests-layout.log` returns 0: no test needed its retry, so the
green result is not the product of automatic retries.

## 9. Environment variables

Copy `.env.example` to `.env` if you need non-default ports. The application server reads
`PORT`; the parallel runner reads `BASE_PORT` and `WORKERS`. There is no bundled `dotenv`,
so load the file with Node itself (`node --env-file=.env server.js`) or export the
variables in your shell / CI job. Credentials are **not** in `.env`: the two test accounts
are demo accounts of the application under test and live in `cypress/fixtures/users.json`,
which is the single place the suite reads them from. Cypress also honours
`CYPRESS_BASE_URL` if the application runs on another port.

## 10. Version note (for the oral defence)

The project runs on **Cypress 15.21.1** (pinned). The reviewer's environment is
**Cypress 16.2.0**, where `Cypress.env()` is removed. The framework therefore never uses
`Cypress.env()`: the API base URL comes from `Cypress.config('baseUrl')` (same origin) and
the suite passed a check for `Cypress.expose()` availability. No rewrite is needed to run
it under Cypress 16, but the exact 16.2.0 execution has not been performed by the team.

## 11. Known limitations

- The store is in memory: restarting the server clears it. Tests never depend on data
  from a previous run, which is why the suite is re-runnable without cleanup scripts.
  Created records are deleted by UI-SUP-07 and API-12; the rest disappears with the process.
- The GitHub Actions workflow (`.github/workflows/`) is committed but **has not been
  executed yet**: CI results are not part of the evidence in this report.
- Two labs fail on purpose (`npm run labs`) and are excluded from `specPattern`. They
  document a diagnosis exercise, not a broken suite.
- Headless Linux needs Xvfb; the parallel runner handles that itself with `xvfb-run -a`.

## 12. Optional public API suite (DummyJSON)

117 API test cases (`TC01` to `TC94`) against the public **DummyJSON** API
(`https://dummyjson.com`, documented by an OpenAPI 3 spec at `/openapi.json`), located in
`tests/api-public/`. They complement the 13 API tests of the SHOP application (`tests/api`):
SHOP's API is the API *related to the application under test*; DummyJSON adds depth on
contract, schema, boundaries, authentication, evidence and data-driven testing against a
third-party API. Inventory of all 161 cases (44 SHOP + 117 DummyJSON):
`docs/Test_Case_Inventory.xlsx`.

> This suite needs internet access, so it is **not** part of `npm test` (which stays offline).

### 12.1 Run

```bash
npm run test:api:public     # all 117 tests, no application server needed
npm run test:report         # same runner with a JUnit XML report (reports/junit/)
npm run evidence:summary    # per-process summary of reports/evidence/*.jsonl
```

`test:api:public` overrides `baseUrl` with `https://dummyjson.com` so Cypress does not wait for
the SHOP server. Single spec:

```bash
npx cypress run --config "baseUrl=https://dummyjson.com" --spec tests/api-public/products.cy.js
```

### 12.2 Configuration

`cypress.config.js`, block `expose` (read with `Cypress.expose("name")`; `Cypress.env()` is
removed in Cypress 16):

| Key | Meaning |
| --- | --- |
| `publicApiUrl` | Base URL of the API under test |
| `publicApiUsername`, `publicApiPassword` | Demo account published in the DummyJSON documentation (not a secret) |

### 12.3 Structure

```
public-api/
├── clients/apiClient.js     reusable client: URL, auth header, evidence, redaction
├── utils/assertions.js      shared assertions (status, error body, list, schema shape, sort)
└── test-data/               JSON: schemas, payloads, invalid inputs, resources, status codes
tests/api-public/            10 spec files, 117 tests (inventory: docs/Test_Case_Inventory.xlsx)
scripts/summarize-evidence.js
```

| Spec | Test IDs | Content |
| --- | --- | --- |
| `products.cy.js` | TC01-TC11 | core read, search, errors, CRUD |
| `products-advanced.cy.js` | TC16-TC32 | query parameters, sorting, aliases, PUT/PATCH/DELETE |
| `auth.cy.js` | TC12-TC15 | login, token, access restriction |
| `auth-advanced.cy.js` | TC33-TC43 | refresh, logout, invalid tokens |
| `general.cy.js` | TC44-TC47 | utility endpoints (data-driven) |
| `resources.cy.js` | TC48-TC55 | carts and users |
| `resources-extra.cy.js` | TC74-TC89 | posts, comments, todos, quotes, recipes (data-driven) |
| `boundaries.cy.js` | TC56-TC69 | invalid inputs and boundaries (data-driven) |
| `roles.cy.js` | TC70-TC73 | identity per role, data exposure |
| `schema.cy.js` | TC90-TC94 | contract validation: fields and types (data-driven) |

### 12.4 Evidence with secrets removed

Every call goes through `public-api/clients/apiClient.js`, which writes one JSON line per request to
`reports/evidence/api-evidence-<pid>.jsonl` (method, path, status, duration, request and response
preview). `password`, `accessToken`, `refreshToken`, `token` and `Authorization` are replaced by
`[REDACTED]` before anything is written. One file per Cypress process: no write conflict in parallel.

### 12.5 Design notes

- A 4xx/5xx is accepted only when the test declares it (`expectError: true`), and then its exact code is asserted.
- No fixed wait. The only time-based check is `TC03` (smoke indicator, 2000 ms).
- DummyJSON **simulates** writes: tests verify the response contract, not persistence, and cannot interfere with each other.
- Where the OpenAPI spec is silent (`TC21`, `TC23`, `TC38`, `TC44` non-GET, `TC56-TC66`), tests check that no server error (5xx) occurs or pin the observed behaviour; they are marked "Observed behaviour" in the inventory.
- `TC40`: the spec lists 401 and 403 for an invalid refresh token. A first run pinned to 401 failed (`expected 403 to equal 401`); the code is pinned to 403 and the ambiguity is documented.
- `TC73` records a security finding: `/users/1` exposes the `password` field (documented in the spec, acceptable for a demo API).
