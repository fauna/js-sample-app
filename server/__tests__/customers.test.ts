import { fql } from "fauna";
import req from "supertest";
import app from "../src/app";
import { mockAddr } from "./mocks";
import { faunaClient } from "../src/fauna/fauna-client";
import { Customer } from "../src/routes/customers/customers.model";

describe("Customer endpoints", () => {
  let alice: Customer;

  beforeAll(async () => {
    // Create a new customer to test against.
    const ts = new Date().getTime();
    const doc = {
      name: "Alice",
      email: `alice+${ts}@fauna.com`,
      address: mockAddr(),
    };
    const res = await faunaClient.query<Customer>(fql`Customer.create(${doc})`);
    alice = res.data;
  });

  afterAll(async () => {
    // Clean up our connection to Fauna.
    faunaClient.close();
  });

  describe("GET /customers/:id", () => {
    it("returns a 200 if the customer exists", async () => {
      const res = await req(app).get(`/customers/${alice.id}`);
      expect(res.status).toEqual(200);
      expect(res.body.name).toEqual(alice.name);
      expect(res.body.email).toEqual(alice.email);
    });

    it("returns a 404 if the customer does not exist", async () => {
      const res = await req(app).get("/customers/1234");
      expect(res.status).toEqual(404);
      expect(res.body.reason).toEqual("No customer with id '1234' exists.");
    });
  });

  describe("POST /customers", () => {
    it("returns a 201 if the customer is created successfully", async () => {
      const ts = new Date().getTime();
      const res = await req(app)
        .post("/customers")
        .send({
          name: "Bob",
          email: `bob+${ts}@fauna.com`,
          address: mockAddr(),
        });
      expect(res.status).toEqual(201);
      expect(res.body.name).toEqual("Bob");
      expect(res.body.email).toEqual(`bob+${ts}@fauna.com`);
    });

    it("returns a 409 if the customer already exists", async () => {
      const res = await req(app)
        .post("/customers")
        .send({ name: "Not Alice", email: alice.email, address: mockAddr() });
      expect(res.status).toEqual(409);
      expect(res.body.reason).toEqual(
        "A customer with that email already exists."
      );
    });
  });

  describe("POST /customers/:id/cart", () => {
    it("returns a 200 if the cart is created or returned successfully", async () => {
      const res = await req(app)
        .post(`/customers/${alice.id}/cart`)
        .send({});
      expect(res.status).toEqual(200);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toEqual("cart");
      expect(res.body.data.createdAt).toBeDefined();
      expect(res.body.data.total).toEqual(0);
    });

    it("returns a 404 if the customer does not exist", async () => {
      const res = await req(app).post("/customers/1234/cart");
      expect(res.status).toEqual(404);
      expect(res.body.reason).toEqual("No customer with id '1234'");
    });
  });

  describe("GET /customers/:id/cart", () => {
    it("returns a 200 if the cart is retrieved successfully", async () => {
      const res = await req(app).get(`/customers/${alice.id}/cart`);
      expect(res.status).toEqual(200);
      expect(res.body.data.items.data).toEqual([]);
      expect(res.body.data.status).toEqual("cart");
      expect(res.body.data.createdAt).toBeDefined();
    });

    it("returns a 404 if the customer does not exist", async () => {
      const res = await req(app).get("/customers/1234/cart");
      expect(res.status).toEqual(404);
      expect(res.body.reason).toEqual("No customer with id '1234'");
    });

  });

});
