// API tests - posts, comments, todos, quotes, recipes. Spec: https://dummyjson.com/openapi.json
const api = require("../../public-api/clients/apiClient");
const { expectStatus, expectErrorBody, expectList } = require("../../public-api/utils/assertions");
const resources = require("../../public-api/test-data/resources.json");

describe("Other resources", () => {
  // Data-driven: the same 4 checks run for each resource in test-data/resources.json
  resources.forEach(({ name, key }) => {
    describe(`/${name}`, () => {
      it(`TC74-${name} - GET /${name} returns a paginated list (default limit = 30)`, () => {
        api.get(`/${name}`).then((res) => {
          expectList(res, key);
          expect(res.body[key]).to.not.be.empty;
          expect(res.body[key].length).to.be.at.most(30);
          expect(res.body.limit).to.eq(30);
        });
      });

      it(`TC75-${name} - GET /${name}/1 returns the resource with id 1`, () => {
        api.get(`/${name}/1`).then((res) => {
          expectStatus(res, 200);
          expect(res.body.id).to.eq(1);
        });
      });

      it(`TC76-${name} - GET /${name}/999999 returns 404 with a message`, () => {
        api.get(`/${name}/999999`, { expectError: true }).then((res) => expectErrorBody(res, 404));
      });

      it(`TC77-${name} - GET /${name}?limit=3&skip=3 respects pagination`, () => {
        api.get(`/${name}?limit=3&skip=3`).then((res) => {
          expectStatus(res, 200);
          expect(res.body[key]).to.have.length(3);
          expect(res.body.limit).to.eq(3);
          expect(res.body.skip).to.eq(3);
        });
      });
    });
  });

  // ---------- Writes (simulated by DummyJSON) ----------
  it("TC78 - POST /posts/add returns 201 and the fields sent", () => {
    api.post("/posts/add", { title: "QA test post", userId: 5 }).then((res) => {
      expectStatus(res, 201);
      expect(res.body.title).to.eq("QA test post");
      expect(res.body.id).to.be.a("number");
    });
  });

  it("TC79 - POST /todos/add returns 201 and the fields sent", () => {
    api.post("/todos/add", { todo: "Write the tests", completed: false, userId: 5 }).then((res) => {
      expectStatus(res, 201);
      expect(res.body.todo).to.eq("Write the tests");
      expect(res.body.completed).to.eq(false);
    });
  });

  it("TC80 - POST /comments/add returns 201 and the fields sent", () => {
    api.post("/comments/add", { body: "QA comment", postId: 3, userId: 5 }).then((res) => {
      expectStatus(res, 201);
      expect(res.body.body).to.eq("QA comment");
    });
  });

  it("TC81 - PATCH /todos/1 updates completed", () => {
    api.patch("/todos/1", { completed: false }).then((res) => {
      expectStatus(res, 200);
      expect(res.body.id).to.eq(1);
      expect(res.body.completed).to.eq(false);
    });
  });

  it("TC82 - DELETE /todos/1 returns isDeleted = true", () => {
    api.del("/todos/1").then((res) => {
      expectStatus(res, 200);
      expect(res.body.isDeleted).to.eq(true);
    });
  });

  // ---------- Search, random, relations ----------
  it("TC83 - GET /posts/search?q=love returns a list with total", () => {
    api.get("/posts/search?q=love").then((res) => expectList(res, "posts"));
  });

  it("TC84 - GET /recipes/search?q=pizza returns a list with total", () => {
    api.get("/recipes/search?q=pizza").then((res) => expectList(res, "recipes"));
  });

  it("TC85 - GET /todos/random returns a valid todo", () => {
    api.get("/todos/random").then((res) => {
      expectStatus(res, 200);
      expect(res.body.id).to.be.a("number");
      expect(res.body.todo).to.be.a("string");
    });
  });

  it("TC86 - GET /todos/random/3 returns exactly 3 todos", () => {
    api.get("/todos/random/3").then((res) => {
      expectStatus(res, 200);
      expect(res.body).to.be.an("array").and.have.length(3);
    });
  });

  it("TC87 - GET /quotes/random returns a quote and an author", () => {
    api.get("/quotes/random").then((res) => {
      expectStatus(res, 200);
      expect(res.body.quote).to.be.a("string");
      expect(res.body.author).to.be.a("string");
    });
  });

  it("TC88 - GET /posts/1/comments returns the comments of post 1", () => {
    api.get("/posts/1/comments").then((res) => {
      expectStatus(res, 200);
      expect(res.body.comments).to.be.an("array");
    });
  });

  it("TC89 - GET /users/1/carts returns the carts of user 1", () => {
    api.get("/users/1/carts").then((res) => {
      expectStatus(res, 200);
      expect(res.body.carts).to.be.an("array");
      res.body.carts.forEach((c) => expect(c.userId).to.eq(1));
    });
  });
});
