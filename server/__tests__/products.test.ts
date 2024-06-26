import req from "supertest";
import app from "../src/app";
import { faunaClient } from "../src/fauna/fauna-client";

describe("Products", () => {

  afterAll(async () => {
    // Clean up our connection to Fauna.
    faunaClient.close();
  });

  describe("GET /products", () => {
    it("Says hi", async () => {
      const res = await req(app).get(`/products`);
      expect(res.status).toEqual(200);
      expect(res.body).toEqual({ message: "GET Products" });
    });
  });
});
