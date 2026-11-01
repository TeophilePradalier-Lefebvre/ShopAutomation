// API tests - /carts and /users. Spec: https://dummyjson.com/openapi.json
const api = require("../../public-api/clients/apiClient");
const { expectStatus, expectErrorBody, expectList } = require("../../public-api/utils/assertions");

describe("Carts API", () => {
  it("TC48 - GET /carts/1 returns a valid cart", () => {
    api.get("/carts/1").then((res) => {
      expectStatus(res, 200);
      expect(res.body.id).to.eq(1);
      expect(res.body.products).to.be.an("array").and.not.be.empty;
      expect(res.body.total).to.be.a("number");
    });
  });

  it("TC49 - GET /carts/999999 returns 404", () => {
    api.get("/carts/999999", { expectError: true }).then((res) => expectErrorBody(res, 404));
  });

  it("TC50 - POST /carts/add returns 201 and the userId sent", () => {
    api.post("/carts/add", { userId: 1, products: [{ id: 144, quantity: 4 }] }).then((res) => {
      expectStatus(res, 201);
      expect(res.body.userId).to.eq(1);
      expect(res.body.products).to.be.an("array").and.not.be.empty;
    });
  });

  it("TC51 - GET /carts/user/1 only returns the carts of that user", () => {
    api.get("/carts/user/1").then((res) => {
      expectStatus(res, 200);
      expect(res.body.carts).to.be.an("array");
      res.body.carts.forEach((c) => expect(c.userId).to.eq(1));
    });
  });
});

describe("Users API", () => {
  it("TC52 - GET /users/1 returns a valid user", () => {
    api.get("/users/1").then((res) => {
      expectStatus(res, 200);
      expect(res.body.id).to.eq(1);
      expect(res.body.username).to.be.a("string");
      expect(res.body.email).to.include("@");
    });
  });

  it("TC53 - GET /users/search?q=John returns a list with total", () => {
    api.get("/users/search?q=John").then((res) => expectList(res, "users"));
  });

  it("TC54 - GET /users/filter?key=gender&value=female only returns women", () => {
    api.get("/users/filter?key=gender&value=female&limit=20").then((res) => {
      expectStatus(res, 200);
      expect(res.body.users).to.be.an("array").and.not.be.empty;
      res.body.users.forEach((u) => expect(u.gender).to.eq("female"));
    });
  });

  it("TC55 - POST /users/add returns 201 and the fields sent", () => {
    api.post("/users/add", { firstName: "Test", lastName: "QA", age: 25 }).then((res) => {
      expectStatus(res, 201);
      expect(res.body.firstName).to.eq("Test");
      expect(res.body.id).to.be.a("number");
    });
  });
});
