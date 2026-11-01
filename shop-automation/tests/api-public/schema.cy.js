// Schema / contract tests: required fields AND data types, from test-data/schemas.json.
// Spec: https://dummyjson.com/openapi.json
const api = require("../../public-api/clients/apiClient");
const { expectStatus, expectShape } = require("../../public-api/utils/assertions");
const schemas = require("../../public-api/test-data/schemas.json");

describe("Contract (schema) validation", () => {
  // Data-driven: one iteration per resource
  [
    ["TC90", "/products/1", "product"],
    ["TC91", "/users/1", "user"],
    ["TC92", "/carts/1", "cart"],
    ["TC93", "/posts/1", "post"],
  ].forEach(([id, path, schema]) => {
    it(`${id} - GET ${path} matches the "${schema}" contract (fields and types)`, () => {
      api.get(path).then((res) => {
        expectStatus(res, 200);
        expectShape(res.body, schemas[schema]);
      });
    });
  });

  it("TC94 - POST /auth/login response matches the login contract", () => {
    api.login().then((body) => expectShape(body, schemas.loginResponse));
  });
});
