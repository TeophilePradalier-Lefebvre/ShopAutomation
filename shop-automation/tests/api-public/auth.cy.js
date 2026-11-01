// API tests - /auth (core). Spec: https://dummyjson.com/openapi.json
const api = require("../../public-api/clients/apiClient");
const { expectStatus, expectErrorBody, expectNoServerError, expectList, expectShape, expectSorted } = require("../../public-api/utils/assertions");
const schemas = require("../../public-api/test-data/schemas.json");

describe("Auth API", () => {
  it("TC12 - Valid login returns 200 and an accessToken", () => {
    const creds = api.credentials();
    api.post("/auth/login", creds).then((res) => {
      expectStatus(res, 200);
      expect(res.body.accessToken).to.be.a("string").and.not.be.empty;
      expect(res.body.username).to.eq(creds.username);
    });
  });

  it("TC13 - Login with a wrong password is rejected (400)", () => {
    const body = { username: api.credentials().username, password: "wrong-password" };
    api.post("/auth/login", body, { expectError: true }).then((res) => {
      expectErrorBody(res, 400);
      expect(res.body).to.not.have.property("accessToken");
    });
  });

  it("TC14 - GET /auth/me without a token is rejected (401)", () => {
    api.get("/auth/me", { expectError: true }).then((res) => expectStatus(res, 401));
  });

  it("TC15 - GET /auth/me with a valid token returns the user", () => {
    api.login().then((login) => {
      api.get("/auth/me", { token: login.accessToken }).then((res) => {
        expectStatus(res, 200);
        expect(res.body.username).to.eq(api.credentials().username);
      });
    });
  });
});
