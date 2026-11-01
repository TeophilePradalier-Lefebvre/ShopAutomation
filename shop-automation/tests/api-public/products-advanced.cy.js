// API tests - /products (query parameters, aliases, writes). Spec: https://dummyjson.com/openapi.json
const api = require("../../public-api/clients/apiClient");
const { expectStatus, expectErrorBody, expectNoServerError, expectList, expectShape, expectSorted } = require("../../public-api/utils/assertions");
const schemas = require("../../public-api/test-data/schemas.json");
const data = require("../../public-api/test-data/products.json");

describe("Products API - advanced", () => {
  // ---------- Query parameters ----------
  it("TC16 - limit=0 returns all products", () => {
    api.get("/products?limit=0").then((res) => {
      expectStatus(res, 200);
      expect(res.body.products).to.have.length(res.body.total);
    });
  });

  it("TC17 - select=title,price returns only these fields (+ id)", () => {
    api.get("/products?limit=5&select=title,price").then((res) => {
      expectStatus(res, 200);
      res.body.products.forEach((p) => {
        expect(p).to.have.property("id");
        expect(p).to.have.property("title");
        expect(p).to.have.property("price");
        expect(p).to.not.have.property("description");
      });
    });
  });

  it("TC18 - sortBy=price&order=desc sorts from highest to lowest", () => {
    api.get("/products?limit=20&sortBy=price&order=desc").then((res) => {
      expectSorted(res.body.products.map((p) => p.price), "desc");
    });
  });

  it("TC19 - sortBy=price&order=asc sorts from lowest to highest", () => {
    api.get("/products?limit=20&sortBy=price&order=asc").then((res) => {
      expectSorted(res.body.products.map((p) => p.price), "asc");
    });
  });

  it("TC20 - Without order, the default sort is ascending", () => {
    api.get("/products?limit=20&sortBy=price").then((res) => {
      expectSorted(res.body.products.map((p) => p.price), "asc");
    });
  });

  it("TC21 - skip beyond the total returns an empty list", () => {
    api.get("/products?skip=100000").then((res) => {
      expectStatus(res, 200);
      expect(res.body.products).to.be.an("array").and.be.empty;
    });
  });

  it("TC22 - Two consecutive pages do not overlap", () => {
    api.get("/products?limit=5&skip=0&select=title").then((p1) => {
      api.get("/products?limit=5&skip=5&select=title").then((p2) => {
        const ids1 = p1.body.products.map((p) => p.id);
        p2.body.products.forEach((p) => expect(ids1).to.not.include(p.id));
      });
    });
  });

  // ---------- Search, categories, aliases ----------
  it("TC23 - Search without result: 200, empty list, total = 0", () => {
    api.get("/products/search?q=zzzzzzqwerty").then((res) => {
      expectStatus(res, 200);
      expect(res.body.products).to.be.an("array").and.be.empty;
      expect(res.body.total).to.eq(0);
    });
  });

  it("TC24 - GET /products/category-list returns a list of strings", () => {
    api.get("/products/category-list").then((res) => {
      expectStatus(res, 200);
      expect(res.body).to.be.an("array").and.not.be.empty;
      res.body.forEach((c) => expect(c).to.be.a("string"));
      expect(res.body).to.include("beauty");
    });
  });

  it("TC25 - GET /products/categories returns slug/name/url objects", () => {
    api.get("/products/categories").then((res) => {
      expectStatus(res, 200);
      expect(res.body).to.be.an("array").and.not.be.empty;
      res.body.forEach((c) => expect(c).to.have.all.keys("slug", "name", "url"));
    });
  });

  it("TC26 - The singular alias /product/1 equals /products/1", () => {
    api.get("/product/1").then((res) => {
      expectStatus(res, 200);
      expect(res.body.id).to.eq(1);
    });
  });

  // ---------- Writes: positive ----------
  it("TC27 - PUT /products/1 updates the title", () => {
    api.put("/products/1", data.put).then((res) => {
      expectStatus(res, 200);
      expect(res.body.id).to.eq(1);
      expect(res.body.title).to.eq(data.put.title);
    });
  });

  it("TC28 - PATCH keeps the fields that were not sent", () => {
    api.get("/products/1").then((original) => {
      api.patch("/products/1", data.partialPatch).then((res) => {
        expectStatus(res, 200);
        expect(res.body.title).to.eq(data.partialPatch.title);
        expect(res.body.price).to.eq(original.body.price);
        expect(res.body.category).to.eq(original.body.category);
      });
    });
  });

  it("TC29 - POST /products/add echoes every field sent + an id", () => {
    api.post("/products/add", data.fullProduct).then((res) => {
      expectStatus(res, 201);
      expect(res.body).to.include(data.fullProduct);
      expect(res.body.id).to.be.a("number");
    });
  });

  // ---------- Writes: negative ----------
  it("TC30 - PUT on an unknown product returns 404", () => {
    api.put("/products/999999", { title: "x" }, { expectError: true }).then((res) => expectErrorBody(res, 404));
  });

  it("TC31 - PATCH on an unknown product returns 404", () => {
    api.patch("/products/999999", { title: "x" }, { expectError: true }).then((res) => expectErrorBody(res, 404));
  });

  it("TC32 - DELETE on an unknown product returns 404", () => {
    api.del("/products/999999", { expectError: true }).then((res) => expectErrorBody(res, 404));
  });
});
