import { fql } from "fauna";
import req from "supertest";
import app from "../src/app";
import { faunaClient } from "../src/fauna/fauna-client";
import { Customer } from "../src/routes/customer/customer.model";

describe("Customer endpoints", () => {
  let alice: Customer;

  beforeAll(async () => {
    // Create a new customer to test against.
    const ts = new Date().getTime();
    const doc = { name: "Alice", email: `alice+${ts}@fauna.com` };
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
        .send({ name: "Bob", email: `bob+${ts}@fauna.com` });
      expect(res.status).toEqual(201);
      expect(res.body.name).toEqual("Bob");
      expect(res.body.email).toEqual(`bob+${ts}@fauna.com`);
    });

    it("returns a 409 if the customer already exists", async () => {
      const res = await req(app)
        .post("/customers")
        .send({ name: "Not Alice", email: alice.email });
      expect(res.status).toEqual(409);
      expect(res.body.reason).toEqual(
        "A customer with that email already exists."
      );
    });
  });
});
