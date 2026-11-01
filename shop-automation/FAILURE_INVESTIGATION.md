# Failure investigation, root cause and corrective action

This file documents the failures the suite produced while the Support / return-request
screen was automated, plus the two deliberately red labs. Every failure below was
reproduced on the current code by temporarily restoring the defect, captured in
`reports/bug-*.log`, then fixed and re-run.

Nothing here was solved by changing an expected result. When the application was wrong,
the application was fixed; when the *test* was wrong, the test was fixed and the reason is
stated.

---

## 1. `TypeError: Cannot read properties of null` - the Clear button killed the whole screen

**What failed and how it was detected.** The first attempt to run the interface tests of the
new screen reported `1 failing` and `5 not run`: every test of the spec died in the
`beforeEach` hook, with

```
TypeError: The following error originated from your application code, not from Cypress.
> Cannot read properties of null (reading 'addEventListener')
```

**Classification.** Application defect (not a locator problem, not synchronisation, not
test data). The message itself says the error comes from the application code.

**Root cause.** `public/support.js` attached the handler with `$('#clear-ticket')`, but the
markup only exposed `data-testid="clear-ticket"` - an id-based query for an element that
never had that id. `querySelector` returned `null`, `null.addEventListener` threw during
the script initialisation, so the screen was never wired: no submit handler, no counter, no
list. A single wrong selector at init time therefore broke six tests at once, which is why
the first diagnosis step was "read the error origin", not "add a wait".

**Corrective action.** Query the contract the markup actually exposes:

```js
$('[data-testid="clear-ticket"]').addEventListener('click', () => { ... });
$('[data-testid="ticket-form"]').addEventListener('submit', ...);
```

**Verification.** `reports/bug-1-clear-selector.log` (defect restored, 1 failing / 5 not
run) versus `reports/run-full-3.log` (fix in place, 6/6 of the spec, 44/44 overall).

**Prevention.** One selector contract per control: the framework only ever uses
`data-testid` for component boundaries and accessible roles/labels for user-facing
controls, so the same element cannot be addressed two different ways. The spec that opens
the screen (`UI-SUP-01`) now fails loudly the moment the initialisation throws, instead of
silently testing a dead page.

---

## 2. Two names for the same input: the purchase date was never readable

**What failed and how it was detected.** After fixing (1), three tests failed together -
`UI-SUP-01`, `UI-SUP-02`, `UI-SUP-08` - with two different symptoms in the same run:

```
AssertionError: Timed out retrying after 4000ms:
  Expected to find element: `[data-testid="ticket-purchasedOn"]`, but never found it.
```

and, from the application code, on submit:

```
TypeError: ... It was caused by an unhandled promise rejection.
> Cannot read properties of null (reading 'value')
```

**Classification.** Application defect that surfaced as a locator failure: the UI and the
form-reading code disagreed about the field's name.

**Root cause.** The markup declared `data-testid="ticket-date"` while `readForm()` looked
up `field('purchasedOn')`, i.e. `[data-testid="ticket-purchasedOn"]`. The lookup returned
`null`, `.value` threw inside the submit handler, and the request was never created. The
date rule could not be validated at all: the field was invisible to the code that was
supposed to read it.

**Corrective action.** Align the markup on the field name used by the form model
(`data-testid="ticket-purchasedOn"`), keeping `id="ticket-date"` for the `<label for>`.

**Verification.** `reports/bug-2-date-testid.log` (3 failing) versus
`reports/run-full-3.log`; the date rules are now asserted by UI-SUP-03 (valid date) and by
two data-driven rows of UI-SUP-04 (tomorrow, 400 days ago), which would have been
impossible before the fix.

**Prevention.** The page object addresses fields by their business name
(`support.field('purchasedOn')`), and the fixture rows name the same field, so a rename
breaks one place instead of five. The data-driven date rows are the regression net: they
fail if the control stops being readable.

---

## 3. The list stayed empty after a reload - an initialisation race

**What failed and how it was detected.** When the screen became stable, `UI-SUP-07` and
`UI-SUP-08` failed while the others passed:

```
AssertionError: Timed out retrying after 4000ms:
  Expected to find element: `[data-testid="ticket-row"]`, but never found it.
```

The interesting part: the list was correct after a submit, and empty after a page reload,
even though the data was still on the server.

**Classification.** Synchronisation / initialisation defect in the application (event
ordering), not a test-timing problem: no amount of waiting would have created the rows,
because the request was never sent.

**Root cause.** On a normal navigation the router dispatches `shop:support-open` when the
user clicks the nav link, and `support.js` is already listening. On a **direct load** of
`/#support` (first visit or `cy.reload()`), `app.js` runs `route()` during boot and
dispatches the same event *before* `support.js` has registered its listener. The event was
lost, `loadTickets()` was never called, and the screen showed its empty state with valid
data on the server.

**Corrective action.** `support.js` now performs the boot load itself, at the end of its
own initialisation:

```js
if (location.hash === '#support' && shop.getToken()) loadTickets();
```

**Verification.** `reports/bug-3-boot-load.log` (2 failing) versus
`reports/run-full-3.log`. `UI-SUP-08` is exactly the test that catches it: it submits,
reloads the page and asserts the row is still listed.

**Prevention.** Persistence is asserted from a fresh page load, not from in-memory state;
and the state is cross-checked against the API (`GET /api/v1/tickets`) so a screen that
merely *looks* right cannot pass.

---

## 4. A test-side failure we also had to fix: asserting an absence

**What failed.** A deletion test asserted `support.row(ref).should('not.exist')` while the
page object's `row()` internally asserted `have.length(1)` first. The two statements
contradict each other as soon as the row is gone, and the length assertion fails before the
absence assertion can run.

**Classification.** Faulty assertion / page-object design, not an application defect.

**Corrective action.** `supportPage.rowOrNone(name)` returns the filtered collection with no
length precondition, so a test can assert an absence in one of two readable ways:
`rowOrNone(ref).should('not.exist')` after a delete (UI-SUP-07), or
`rowOrNone(ref).should('have.length', 0)` / `support.emptyState()` when the list must be
empty (UI-SUP-10).

**Prevention.** Absence is asserted on a collection, never on a chain that presupposes
existence. That rule is written in the page object, where the next test author will read it.

---

## 5. The two deliberately red labs (`npm run labs`)

| Lab | Classification | What it teaches | Status |
| --- | --- | --- | --- |
| `tests/labs/lab-1-overlay-actionability.cy.js` | Test-design failure | the click is refused because the synchronisation overlay covers the button (*"is being covered by another element"*). The correct answer is to wait for the observable state (overlay hidden), never to add `cy.wait(1000)` or `{force: true}`, which would hide the very behaviour under test | fails on purpose |
| `tests/labs/lab-2-stock-defect.cy.js` | Genuine application defect, left open | *Add to cart* stays enabled for an out-of-stock product: the button accepts an order the business rules forbid. Reported to the application owner; the test keeps failing so the defect cannot be forgotten | fails on purpose |

`reports/labs-red.log` shows both: `2 of 2 failed (100%)`. They are excluded from
`specPattern`, so `npm test` stays green while the defects remain documented.

---

## Summary of the method

1. Read the failure message and its **origin** (application code vs Cypress).
2. Reproduce it in isolation (one spec, defect restored on purpose).
3. Find the root cause in the source, not in the symptom.
4. Fix the layer that is wrong - application or test - and say which.
5. Re-run and keep both logs (before / after) as evidence.
6. Add a test that would fail again if the defect came back.
