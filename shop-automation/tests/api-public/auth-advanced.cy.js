// API tests - /auth (advanced). Spec: https://dummyjson.com/openapi.json
const api = require("../../public-api/clients/apiClient");
const { expectStatus, expectErrorBody, expectNoServerError, expectList, expectShape, expectSorted } = require("../../public-api/utils/assertions");
const schemas = require("../../public-api/test-data/schemas.json");

describe("Auth API - advanced", () => {
  // ---------- Login ----------
  it("TC33 - The login response does not contain the password (security)", () => {
    api.login().then((body) => {
      expect(body).to.not.have.property("password");
      expect(body.accessToken).to.be.a("string");
      expect(body.refreshToken).to.be.a("string");
    });
  });

  it("TC34 - Login with expiresInMins is accepted", () => {
    api.post("/auth/login", { ...api.credentials(), expiresInMins: 1 }).then((res) => {
      expectStatus(res, 200);
      expect(res.body.accessToken).to.be.a("string").and.not.be.empty;
    });
  });

  it("TC35 - Login without a password is rejected (400)", () => {
    api.post("/auth/login", { username: api.credentials().username }, { expectError: true })
      .then((res) => expectErrorBody(res, 400));
  });

  it("TC36 - Login with an unknown user is rejected (400)", () => {
    api.post("/auth/login", { username: "unknown-user", password: "whatever" }, { expectError: true })
      .then((res) => {
        expectStatus(res, 400);
        expect(res.body).to.not.have.property("accessToken");
      });
  });

  it("TC37 - The alias /users/login behaves like /auth/login", () => {
    api.post("/users/login", api.credentials()).then((res) => {
      expectStatus(res, 200);
      expect(res.body.accessToken).to.be.a("string").and.not.be.empty;
    });
  });

  // ---------- Tokens ----------
  it("TC38 - GET /auth/me with an invalid token is rejected (401)", () => {
    api.get("/auth/me", { token: "this.is.not.a.token", expectError: true })
      .then((res) => expectStatus(res, 401));
  });

  it("TC39 - POST /auth/refresh with a valid refreshToken returns new tokens", () => {
    api.login().then((body) => {
      api.post("/auth/refresh", { refreshToken: body.refreshToken, expiresInMins: 30 }).then((res) => {
        expectStatus(res, 200);
        expect(res.body.accessToken).to.be.a("string").and.not.be.empty;
        expect(res.body.refreshToken).to.be.a("string").and.not.be.empty;
      });
    });
  });

  // The spec lists 401 AND 403 for /auth/refresh without saying which one applies to an
  // invalid token: the contract is ambiguous. We pin ONE code, the one observed at the first
  // run (a first run pinned to 401 failed with "expected 403 to equal 401").
  const REFRESH_INVALID_CODE = 403;

  it("TC40 - POST /auth/refresh with an invalid refreshToken is rejected (pinned code)", () => {
    api.post("/auth/refresh", { refreshToken: "invalid-token" }, { expectError: true }).then((res) => {
      cy.log(`Observed status: ${res.status}`);
      expectErrorBody(res, REFRESH_INVALID_CODE);
    });
  });

  // ---------- Logout ----------
  it("TC41 - POST /auth/logout with a valid token returns 200", () => {
    api.login().then((body) => {
      api.post("/auth/logout", undefined, { token: body.accessToken }).then((res) => {
        expectStatus(res, 200);
        expect(res.body.message).to.be.a("string");
      });
    });
  });

  it("TC42 - POST /auth/logout without a token is rejected (401)", () => {
    api.post("/auth/logout", undefined, { expectError: true }).then((res) => expectStatus(res, 401));
  });

  // ---------- Protected resources ----------
  it("TC43 - GET /auth/products/1 returns the same product as /products/1", () => {
    api.login().then((body) => {
      api.get("/products/1").then((pub) => {
        api.get("/auth/products/1", { token: body.accessToken }).then((priv) => {
          expectStatus(priv, 200);
          expect(priv.body.id).to.eq(pub.body.id);
          expect(priv.body.title).to.eq(pub.body.title);
        });
      });
    });
  });
});
