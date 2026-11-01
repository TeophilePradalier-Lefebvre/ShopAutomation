# UI package - what we chose, and how to merge it

Short version for the merge owner. Everything below is already in the repository; this page
just answers the two questions asked today: **which application / locator strategy** and
**how to fuse the UI and API suites**.

## 1. What we chose

| Question | Decision | Why |
| --- | --- | --- |
| Application under test | Our own demo shop ("SHOP"), served by `server.js` on `http://localhost:3000` | The brief allows a self-built application, and it keeps the suite deterministic: no third-party terms of service, no external outage, and we can create the controls the brief requires with real behaviour |
| Where the mandatory controls live | One screen: *Support / return request* (`/#support`) - textarea, number field, file upload, image upload, date picker, native confirm dialog, live counter | One coherent business flow instead of seven disconnected demo widgets; every control has server-side or client-side rules the tests can contradict |
| Dropdown requirement | Catalogue *sort by* selector (`UI-CAT-03`), not a synthetic select on the Support screen | It is a dropdown that actually changes the product order, so the assertion covers the value **and** its effect |
| Locator strategy | Accessible role / label via `@testing-library/cypress` (`findByRole`, `findByLabelText`) for user-facing controls; `[data-testid]` only for structural boundaries (rows, toasts) | A test written the way a user reads the page; `data-testid` reserved for nodes that have no accessible name |
| Scoping | Always scope to the component before acting (`.filter().should('have.length', 1)`), never a global `cy.contains` | Proves uniqueness instead of silently picking the first of four matching buttons (`UI-CART-03`) |
| Waiting | No `cy.wait(<ms>)` anywhere; only observable-state waits (overlay hidden, row present) | Bounded timeouts are a maximum, not a sleep |
| Cypress version | **15.21.1**, pinned in `package.json` + `package-lock.json` | Same version on both sides is the merge precondition |

## 2. How to merge

```
tests/ui/**/*.cy.js    31 UI tests   <- ours
tests/api/**/*.cy.js   13 API tests  <- SHOP API suite (kept as is; the DummyJSON suite is added in tests/api-public)
tests/labs/**/*.cy.js   2 red labs   <- deliberately failing, outside specPattern
cypress/support/        framework: commands, page objects, API client, utils
cypress/fixtures/       users.json, return-requests.json (data-driven rows)
```

`cypress.config.js` already declares both folders:

```js
specPattern: ['tests/ui/**/*.cy.js', 'tests/api/**/*.cy.js'],
```

so merging the two folders requires **no configuration change**. The only shared files are
`package.json` (keep `cypress` at the same version) and `package-lock.json` (regenerate after
the merge rather than hand-editing it).

## 3. Verify the merge

```bash
npm install
npx cypress install
npm start                        # terminal 1
npm test                         # terminal 2 -> 44/44, 0 retries
npm run test:ui                  # tests/ui only
npm run test:api                 # tests/api only
node scripts/run-parallel.js --workers 2
```

## 4. What the UI package contains beyond the specs

- `README.md` - install, run, structure, mandatory-control map, evidence index.
- `TEST_CASES.md` - the 44 test cases (id, type, data, expected result).
- `FAILURE_INVESTIGATION.md` - four failures reproduced, root cause, fix, prevention.
- `CONTRIBUTIONS.md` - who owns which folder and what they can explain.
- `reports/` - the execution logs quoted in the report (full run, reverse order, 1/2/3
  workers, the two red labs, the three injected defects before their fix).
