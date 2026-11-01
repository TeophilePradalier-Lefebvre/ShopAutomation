# Test-case inventory

44 executable test cases: **31 UI** (13 in the core screens, 6 in the support lifecycle,
12 data-driven iterations) and **13 API**. Status column = result of the latest full run
(`reports/run-full-3.log`, all passing, 0 retries).

Legend for *Type*: P positive, N negative, B boundary, V validation, F file, D date,
Dyn dynamic element, Dlg dialog, S state verification, R regression, DD data-driven,
SC schema/contract, A auth, C CRUD, H headers, E error handling.

## UI test cases

| ID | Name | Type | Data / precondition | Expected result | Status |
| --- | --- | --- | --- | --- | --- |
| UI-AUTH-01 | Signs a valid user in and shows the catalogue | P, S | `qa@example.com` / valid password | `Products` heading visible, hash `#products` | Pass |
| UI-AUTH-02 | Rejects an invalid password and stays on the form | N, V | same email, wrong password | alert `Invalid email or password`, no catalogue | Pass |
| UI-CAT-01 | Filters the catalogue on a search term | P, Dyn | search `trail backpack` | exactly 1 card (`Trail Backpack`), no empty state | Pass |
| UI-CAT-02 | Shows an explicit empty state when nothing matches | N, Dyn | search `nintendo` | 0 cards, message `No products match` | Pass |
| UI-CAT-03 | Sorts by ascending price and keeps the selected option | P, V (dropdown) | `sort=price-asc` | `have.value('price-asc')` + order Water Bottle, Smartwatch, Trail Backpack, iPhone18 | Pass |
| UI-CART-01 | Adds the identified product and verifies the cart state | P, S | click *Add to cart* inside the iPhone18 card | 4 cards before filtering, 1 after; cart row `iPhone18` qty `1`; badge `1` | Pass |
| UI-CART-02 | Increments the quantity of an existing line | P, Dyn, S | same product added twice | qty `2`, subtotal `6158.00` | Pass |
| UI-CART-03 | A global locator matches 4 buttons: scope before acting | P (locator strategy) | `[data-testid="add-to-cart"]` = 4 nodes | scoping to Smartwatch card yields 1 button, badge `1` | Pass |
| UI-CART-04 | Keeps the gift-wrap option on the cart line | P, S (checkbox) | gift wrap checked | row contains `(gift wrap)` | Pass |
| UI-CHK-01 | Waits for the synchronisation overlay instead of a fixed delay | P, Dyn | open cart with the mask visible | mask visible, `Continue checkout` becomes clickable, `Checkout` heading | Pass |
| UI-CHK-02 | Fills the card inside the payment iframe and confirms the order | P, iframe, S | card `4242 4242 4242 4242` in the iframe | `Order placed` confirmation | Pass |
| UI-CHK-03 | Recalculates the total when express delivery is selected | P, B (price) | express radio | total `3079.00` -> `3088.00` | Pass |
| UI-COOKIE-01 | Hides the banner once accepted | P, Dyn | fresh visit | banner visible -> `Accept` -> not visible | Pass |
| UI-SUP-01 | Submits a valid request, confirms it and proves it was stored | P, F (image), S | valid form + `damage.png` (`image/png`, small) | confirmation block, new row in list, `GET /api/v1/tickets` contains the reference | Pass |
| UI-SUP-02 | Blocks an empty form, names every missing field and sends nothing | N, V | submit with every field empty | one error per field, no confirmation, no API call | Pass |
| UI-SUP-03 (x2) | Accepts the lowest / highest quantity | P, B, DD | dataset `boundaries`: qty `1` and `5` | accepted, row shows `qty 1` / `qty 5` | Pass (2 iterations) |
| UI-SUP-04 (x7) | Refuses an invalid field (data-driven) | N, V, D, DD | dataset `invalid`: reference `SHOP-1234`, name `Al`, qty `6`, description of 18 chars, date tomorrow, date 400 days ago, terms unchecked | field-specific message, no confirmation | Pass (7 iterations) |
| UI-SUP-05 | Refuses an unsupported file type before calling the API | N, F | `notes.txt` | message `Only .png, .jpg or .pdf files up to 1 MB are accepted`, no zip upload request | Pass |
| UI-SUP-05b | Refuses a file heavier than 1 MB | N, F, B | `big.png` of 1.5 MB | same rejection message, no upload request | Pass |
| UI-SUP-06 | Updates the character counter live and caps the text area at 500 | P, Dyn, B | typing / 600 characters | counter follows the length, value capped at 500 | Pass |
| UI-SUP-07 | Asks for confirmation: cancel keeps the request, confirm deletes it | P, Dlg, S | request created through the API | `Cancel` keeps the row, `Confirm` deletes it and the row disappears | Pass |
| UI-SUP-08 | Keeps a submitted request after a full page reload | P, S (persistence) | submit, then `cy.reload()` | row still listed after reload | Pass |
| UI-SUP-09 | Regression: the catalogue still searches after the Support view was added | R | `/index.html#products` | search still filters to 1 card | Pass |
| UI-SUP-10 | A second user never sees another user request | N, A (isolation) | user 1 creates, user 2 logs in | user 2's list does not contain user 1's reference | Pass |

## API test cases

| ID | Method and endpoint | Type | Expected result | Status |
| --- | --- | --- | --- | --- |
| API-01 | `GET /api/v1/health` | SC, H | 200, `{status:'ok', version:'v1'}`, `Content-Type: application/json`, `no-store`, `nosniff` | Pass |
| API-02 | `POST /api/v1/auth/login` | P, SC, H | 200, 32-char `token`, user email, body never contains the password | Pass |
| API-03 | `POST /api/v1/auth/login` (wrong password) | N, E | 401 `INVALID_CREDENTIALS`, no token | Pass |
| API-04 | `GET /api/v1/products` | P, SC | 200, array of products, required fields and types, sorted by name | Pass |
| API-05 | `GET /api/v1/products?sort=&limit=&offset=` | P, B | 200, honouring `limit` / `offset` / `sort` | Pass |
| API-06 | `GET /api/v1/products?limit=0` etc. | N, B, E | 400 `INVALID_QUERY` with the offending parameter | Pass |
| API-07 | `GET /api/v1/products/:id` | P, N | 200 for a known id, 404 `PRODUCT_NOT_FOUND` otherwise | Pass |
| API-08 | `DELETE /api/v1/health`, `GET /api/v1/unknown` | N, E, H | 405 with `Allow`, 404 `NOT_FOUND` on an unknown route | Pass |
| API-09 | `GET /api/v1/tickets` without token | N, A, H | 401 with a `Bearer` challenge | Pass |
| API-10 | `POST /api/v1/tickets` with an invalid payload | N, V, E | 422 `VALIDATION_FAILED`, one message per invalid field | Pass |
| API-11 | `POST /api/v1/tickets` then `GET /api/v1/tickets/:id` | P, C, SC, H | 201 + `Location: /api/v1/tickets/<ref>` + `X-Request-Id`, read-back identical | Pass |
| API-12 | `PATCH` status, `DELETE`, then `GET` | P, C, S | 200 updated status, 204 on delete, 404 afterwards | Pass |
| API-13 | `GET`/`DELETE` another user's ticket | N, A | 403 `FORBIDDEN`, resource untouched | Pass |

## Deliberately failing labs (not part of the 44)

| Lab | What it demonstrates | Status |
| --- | --- | --- |
| `tests/labs/lab-1-overlay-actionability.cy.js` | click intercepted by the synchronisation overlay: failure of the *test* (assertion/actionability), diagnosis is "wait for the observable state", not "add a sleep" | Fails on purpose |
| `tests/labs/lab-2-stock-defect.cy.js` | button *Add to cart* stays enabled for an out-of-stock product: genuine **application defect**, reported, not "fixed" by changing the expected result | Fails on purpose |

Reproduce with `npm run labs` (evidence: `reports/labs-red.log`).
