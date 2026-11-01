// API tests - /products (core). Spec: https://dummyjson.com/openapi.json
const api = require("../../public-api/clients/apiClient");
const { expectStatus, expectErrorBody, expectNoServerError, expectList, expectShape, expectSorted } = require("../../public-api/utils/assertions");
const schemas = require("../../public-api/test-data/schemas.json");
const data = require("../../public-api/test-data/products.json");

describe("Products API", () => {
  it("TC01 - GET /products returns 200 and a valid list", () => {
    api.get("/products?limit=10").then((res) => {
      expectStatus(res, 200);
      expect(res.body.products).to.be.an("array").and.have.length(10);
      res.body.products.forEach((p) => expectShape(p, schemas.productSummary));
    });
  });

  it("TC02 - GET /products: Content-Type header is JSON", () => {
    api.get("/products?limit=1").then((res) => {
      expect(res.headers["content-type"]).to.include("application/json");
    });
  });

  it("TC03 - GET /products: response time smoke check (< 2000 ms)", () => {
    api.get("/products?limit=10").then((res) => {
      expect(res.duration).to.be.below(2000);
    });
  });

  it("TC04 - Pagination: limit=5 and skip=5", () => {
    api.get("/products?limit=5&skip=5").then((res) => {
      expectStatus(res, 200);
      expect(res.body.limit).to.eq(5);
      expect(res.body.skip).to.eq(5);
      expect(res.body.products).to.have.length(5);
    });
  });

  it("TC05 - GET /products/1 returns the right product", () => {
    api.get("/products/1").then((res) => {
      expectStatus(res, 200);
      expect(res.body.id).to.eq(1);
      expectShape(res.body, schemas.productSummary);
    });
  });

  it("TC06 - Search: GET /products/search?q=phone", () => {
    api.get("/products/search?q=phone").then((res) => expectList(res, "products"));
  });

  it("TC07 - Category: every product belongs to the requested category", () => {
    api.get("/products/category/smartphones").then((res) => {
      expectStatus(res, 200);
      expect(res.body.products).to.be.an("array").and.not.be.empty;
      res.body.products.forEach((p) => expect(p.category).to.eq("smartphones"));
    });
  });

  it("TC08 - GET /products/999999 returns 404 with a message", () => {
    api.get("/products/999999", { expectError: true }).then((res) => expectErrorBody(res, 404));
  });

  it("TC09 - POST /products/add returns 201 and echoes the data", () => {
    api.post("/products/add", data.newProduct).then((res) => {
      expectStatus(res, 201);
      expect(res.body.title).to.eq(data.newProduct.title);
      expect(res.body.id).to.be.a("number");
    });
  });

  it("TC10 - PATCH /products/1 updates the title", () => {
    api.patch("/products/1", data.patch).then((res) => {
      expectStatus(res, 200);
      expect(res.body.id).to.eq(1);
      expect(res.body.title).to.eq(data.patch.title);
    });
  });

  it("TC11 - DELETE /products/1 returns isDeleted = true", () => {
    api.del("/products/1").then((res) => {
      expectStatus(res, 200);
      expect(res.body.isDeleted).to.eq(true);
      expect(res.body).to.have.property("deletedOn");
    });
  });
});
