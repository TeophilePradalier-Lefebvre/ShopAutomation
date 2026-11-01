// Boundaries and invalid inputs. The spec is SILENT on the expected response for most of
// these inputs, so we do not invent one: the oracle is "no server error (5xx)" and the
// observed status is logged (cy.log) for the report. Spec: https://dummyjson.com/openapi.json
const api = require("../../public-api/clients/apiClient");
const { expectStatus, expectErrorBody, expectNoServerError } = require("../../public-api/utils/assertions");
const invalidInputs = require("../../public-api/test-data/invalid-inputs.json");

describe("Boundaries and invalid inputs (observed behaviour)", () => {
  // Data-driven: same logic, one iteration per row of test-data/invalid-inputs.json
  invalidInputs.forEach(({ id, label, path }) => {
    it(`${id} - ${label} does not cause a server error`, () => {
      api.get(path, { expectError: true }).then(expectNoServerError);
    });
  });

  it("TC64 - POST /products/add with an empty body returns 201 (no required field in the spec)", () => {
    api.post("/products/add", {}).then((res) => {
      expectStatus(res, 201);
      expect(res.body.id).to.be.a("number");
    });
  });

  it("TC65 - POST /products/add with a wrong-type price does not cause a server error", () => {
    api.post("/products/add", { title: "QA", price: "not-a-number" }, { expectError: true })
      .then(expectNoServerError);
  });

  it("TC66 - POST /carts/add without userId and products does not cause a server error", () => {
    api.post("/carts/add", {}, { expectError: true }).then(expectNoServerError);
  });

  it("TC67 - POST /auth/login with an empty body is rejected (400)", () => {
    api.post("/auth/login", {}, { expectError: true }).then((res) => expectErrorBody(res, 400));
  });

  it("TC68 - modifiedAfter in the future returns no product", () => {
    api.get("/products?modifiedAfter=2100-01-01T00:00:00.000Z").then((res) => {
      expectStatus(res, 200);
      expect(res.body.products).to.be.an("array").and.be.empty;
    });
  });

  it("TC69 - modifiedBefore in the distant past returns no product", () => {
    api.get("/products?modifiedBefore=1990-01-01T00:00:00.000Z").then((res) => {
      expectStatus(res, 200);
      expect(res.body.products).to.be.an("array").and.be.empty;
    });
  });
});
