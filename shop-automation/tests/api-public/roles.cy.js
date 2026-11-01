// Identity, roles and data exposure. DummyJSON documents no role-based access restriction,
// so we verify that each account gets ITS OWN identity and role, with two different roles.
// Spec: https://dummyjson.com/openapi.json
const api = require("../../public-api/clients/apiClient");
const { expectStatus } = require("../../public-api/utils/assertions");

describe("Roles and identity", () => {
  const me = (token, path = "/auth/me") => api.get(path, { token }).its("body");

  it("TC70 - Two accounts with different roles each get their own identity", () => {
    const creds = api.credentials();
    api.login().then((a) => {
      me(a.accessToken).then((meA) => {
        expect(meA.username).to.eq(creds.username);
        api.get("/users?limit=0&select=username,password,role").then((list) => {
          const other = list.body.users.find((u) => u.role !== meA.role);
          expect(other, "a user with another role exists").to.exist;
          api.login({ username: other.username, password: other.password }).then((b) => {
            me(b.accessToken).then((meB) => {
              expect(meB.username).to.eq(other.username);
              expect(meB.role).to.eq(other.role);
              expect(meB.role).to.not.eq(meA.role);
              expect(meB.username).to.not.eq(meA.username);
            });
          });
        });
      });
    });
  });

  it("TC71 - The alias /users/me returns the same user as /auth/me", () => {
    api.login().then((a) => {
      me(a.accessToken, "/users/me").then((user) => {
        expect(user.username).to.eq(api.credentials().username);
      });
    });
  });

  it("TC72 - GET /users/me without a token is rejected (401)", () => {
    api.get("/users/me", { expectError: true }).then((res) => expectStatus(res, 401));
  });

  it("TC73 - [Security finding] GET /users/1 exposes the password field (excessive data exposure)", () => {
    // Documented in the spec (User schema): expected on a demo API, but worth reporting.
    api.get("/users/1").then((res) => {
      expectStatus(res, 200);
      expect(res.body).to.have.property("password");
    });
  });
});
