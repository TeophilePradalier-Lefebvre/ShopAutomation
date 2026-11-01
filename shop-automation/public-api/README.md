# Public API suite (DummyJSON) - optional, opt-in

117 API test cases (`TC01` to `TC94`) against the public **DummyJSON** API
(`https://dummyjson.com`, documented by an OpenAPI 3 spec at `/openapi.json`).
They complement the 13 API tests of the SHOP application (`tests/api`): SHOP's API is the
API *related to the application under test*; DummyJSON adds depth on contract, schema,
boundaries, authentication, evidence and data-driven testing against a third-party API.

> This suite needs internet access, so it is **not** part of `npm test` (which stays offline).

## Run

```bash
npm run test:api:public        # all 117 tests, no application server needed
npm run test:report            # same runner with a JUnit XML report (reports/junit/)
npm run evidence:summary       # per-process summary of the API evidence
```

`test:api:public` overrides `baseUrl` with `https://dummyjson.com` so Cypress does not wait for
the SHOP server. Single spec: `npx cypress run --config "baseUrl=https://dummyjson.com" --spec tests/api-public/products.cy.js`.

## Configuration

`cypress.config.js`, block `expose` (read with `Cypress.expose("name")`; `Cypress.env()` is removed in Cypress 16):

| Key | Meaning |
|---|---|
| `publicApiUrl` | Base URL of the API under test |
| `publicApiUsername`, `publicApiPassword` | Demo account published in the DummyJSON documentation (not a secret) |

## Structure

```
public-api/
├── clients/apiClient.js     reusable client: URL, auth header, evidence, redaction
├── utils/assertions.js      shared assertions (status, error body, list, schema shape, sort)
└── test-data/               JSON: schemas, payloads, invalid inputs, resources, status codes
tests/api-public/            10 spec files, 117 tests (inventory: docs/Test_Case_Inventory.xlsx)
scripts/summarize-evidence.js
```

| Spec | Test IDs | Content |
|---|---|---|
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

## Evidence with secrets removed

Every call goes through `public-api/clients/apiClient.js`, which writes one JSON line per request to
`reports/evidence/api-evidence-<pid>.jsonl` (method, path, status, duration, request and response
preview). `password`, `accessToken`, `refreshToken`, `token` and `Authorization` are replaced by
`[REDACTED]` before anything is written. One file per Cypress process: no write conflict in parallel.

## Design notes

- A 4xx/5xx is accepted only when the test declares it (`expectError: true`), and then its exact code is asserted.
- No fixed wait. The only time-based check is `TC03` (smoke indicator, 2000 ms).
- DummyJSON **simulates** writes: tests verify the response contract, not persistence, and cannot interfere with each other.
- Where the OpenAPI spec is silent (`TC21`, `TC23`, `TC38`, `TC44` non-GET, `TC56-TC66`), tests check that no server error (5xx) occurs or pin the observed behaviour; they are marked "Observed behaviour" in the inventory.
- `TC40`: the spec lists 401 and 403 for an invalid refresh token. A first run pinned to 401 failed (`expected 403 to equal 401`); the code is pinned to 403 and the ambiguity is documented.
- `TC73` records a security finding: `/users/1` exposes the `password` field (documented in the spec, acceptable for a demo API).
