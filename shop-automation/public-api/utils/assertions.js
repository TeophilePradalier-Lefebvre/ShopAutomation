// Shared assertions: one definition of "a valid list", "an error body", "a valid shape".

const typeOf = (v) => (Array.isArray(v) ? "array" : v === null ? "null" : typeof v);

const expectStatus = (res, status) => expect(res.status, "HTTP status").to.eq(status);

const expectErrorBody = (res, status) => {
  expectStatus(res, status);
  expect(res.body.message, "error message").to.be.a("string");
};

// Used when the contract is silent: we only require that the server does not crash (no 5xx).
// The observed status is logged so it can be reported.
const expectNoServerError = (res) => {
  cy.log(`Observed status: ${res.status}`);
  expect(res.status, "no server error (5xx)").to.be.lessThan(500);
};

const expectList = (res, key) => {
  expectStatus(res, 200);
  expect(res.body[key], `${key} list`).to.be.an("array");
  expect(res.body.total, "total").to.be.a("number");
};

// shape: { field: "number" | "string" | "array" | "object" | "boolean" }
const expectShape = (obj, shape) =>
  Object.entries(shape).forEach(([field, type]) => {
    expect(obj, `field "${field}"`).to.have.property(field);
    expect(typeOf(obj[field]), `type of "${field}"`).to.eq(type);
  });

const expectSorted = (values, order) => {
  for (let i = 1; i < values.length; i++) {
    if (order === "asc") expect(values[i]).to.be.at.least(values[i - 1]);
    else expect(values[i]).to.be.at.most(values[i - 1]);
  }
};

module.exports = {
  expectStatus,
  expectErrorBody,
  expectNoServerError,
  expectList,
  expectShape,
  expectSorted,
};
