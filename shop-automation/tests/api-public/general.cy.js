// API tests - utility endpoints (/test, /ip, /http, openapi). Spec: https://dummyjson.com/openapi.json
const api = require("../../public-api/clients/apiClient");
const { expectStatus, expectErrorBody, expectNoServerError, expectList, expectShape, expectSorted } = require("../../public-api/utils/assertions");
const schemas = require("../../public-api/test-data/schemas.json");
const methods = require("../../public-api/test-data/http-methods.json");
const statusCodes = require("../../public-api/test-data/http-status-codes.json");

describe("General API", () => {
  // Data-driven: same logic, one iteration per HTTP method
  methods.forEach((method) => {
    it(`TC44-${method} - ${method} /test returns status ok`, () => {
      api.request(method, "/test").then((res) => {
        expectStatus(res, 200);
        expect(res.body.status).to.eq("ok");
        expect(res.body.method).to.eq(method);
      });
    });
  });

  it("TC45 - GET /ip returns the IP address and the user agent", () => {
    api.get("/ip").then((res) => {
      expectStatus(res, 200);
      expect(res.body.ip).to.be.a("string").and.not.be.empty;
      expect(res.body.userAgent).to.be.a("string");
    });
  });

  // Data-driven: /http/{code} simulates a status code
  statusCodes.forEach((code) => {
    it(`TC46-${code} - GET /http/${code} returns status ${code}`, () => {
      api.get(`/http/${code}`, { expectError: true }).then((res) => expectStatus(res, code));
    });
  });

  it("TC47 - GET /openapi.json returns a valid OpenAPI 3.x document", () => {
    api.get("/openapi.json").then((res) => {
      expectStatus(res, 200);
      expect(res.body.openapi).to.match(/^3\./);
      expect(res.body.paths).to.have.property("/products");
    });
  });
});
