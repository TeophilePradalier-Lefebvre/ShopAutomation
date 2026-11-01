/**
 * Pure helpers shared by UI and API specs. No Cypress state, no side effects:
 * a test that needs a unique order reference can build one without touching the
 * network or the app's internals.
 */

let sequence = 0;

/** A reference the API accepts (^SHOP-\d{5}$) and that no other test reuses. */
function uniqueReference() {
  sequence += 1;
  // 5 digits: a random block + a per-process counter, so two parallel workers
  // never collide even when they start at the same second.
  const random = String(Math.floor(Math.random() * 900)).padStart(3, '0');
  const counter = String(sequence % 100).padStart(2, '0');
  return `SHOP-${random}${counter}`;
}

/** ISO calendar date (YYYY-MM-DD) offset by `days` from today, UTC. */
function isoDaysFromToday(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

const isoToday = () => isoDaysFromToday(0);

/** A valid payload for POST /api/v1/tickets; overrides let a test bend one field. */
function ticketPayload(overrides = {}) {
  return Object.assign(
    {
      reference: uniqueReference(),
      name: 'Camille Martin',
      quantity: 2,
      description: 'The left earpiece stopped working after two days of normal use.',
      purchasedOn: isoDaysFromToday(-10),
      terms: true
    },
    overrides
  );
}

module.exports = { uniqueReference, isoDaysFromToday, isoToday, ticketPayload };
