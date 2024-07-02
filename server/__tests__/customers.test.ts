import req from "supertest";
import app from "../src/app";
import { fql } from "fauna";
import { mockCustomer } from "./mocks";
import { seedTestData } from "./seed";
import { faunaClient } from "../src/fauna/fauna-client";
import { Customer } from "../src/routes/customers/customers.model";

describe("Customers", () => {
  let customer: Customer;
  let customersToCleanup: Array<Customer> = [];

  beforeAll(async () => {
    const { customer: c } = await seedTestData();
    customer = c;
  });

  afterAll(async () => {
    // Clean up any customers we created.
    for (const c of customersToCleanup) {
      await faunaClient.query(fql`Customer.byId(${c.id})!.delete()`);
    }
    // Clean up our connection to Fauna.
    faunaClient.close();
  });

  describe("GET /customers/:id", () => {
    it("returns a 200 if the customer exists", async () => {
      const res = await req(app).get(`/customers/${customer.id}`);
      expect(res.status).toEqual(200);
      expect(res.body.email).toEqual(customer.email);
    });

    it("returns a 404 if the customer does not exist", async () => {
      const res = await req(app).get("/customers/1234");
      expect(res.status).toEqual(404);
      expect(res.body.message).toEqual("No customer with id '1234' exists.");
    });
  });

  describe("POST /customers", () => {
    it("returns a 201 if the customer is created successfully", async () => {
      const ts = new Date().getTime();
      const bob = mockCustomer({ email: `bob+${ts}@fauna.com` });
      const res = await req(app).post("/customers").send(bob);
      customersToCleanup.push(res.body);
      expect(res.status).toEqual(201);
      expect(res.body.email).toEqual(bob.email);
    });

    it("returns a 409 if the customer already exists", async () => {
      const res = await req(app).post("/customers").send(customer);
      expect(res.status).toEqual(409);
      expect(res.body.message).toEqual(
        "A customer with that email already exists."
      );
    });
  });

  describe("PATCH /customers/:id", () => {
    it("returns a 200 if the customer is updated successfully", async () => {
      // Create a new customer named Bob.
      const ts = new Date().getTime();
      const bob = mockCustomer({ name: "Bob", email: `bob+${ts}@fauna.com` });
      const createRes = await req(app).post("/customers").send(bob);
      expect(createRes.status).toEqual(201);
      customersToCleanup.push(createRes.body);
      // Update Bob's name to Alice.
      const updateRes = await req(app)
        .patch(`/customers/${createRes.body.id}`)
        .send({ name: "Alice" });
      expect(updateRes.status).toEqual(200);
      expect(updateRes.body.name).toEqual("Alice");
      // Confirm the email did not change.
      expect(updateRes.body.email).toEqual(bob.email);
    });

    it("returns a 404 if the customer does not exist", async () => {
      const res = await req(app).patch("/customers/1234");
      expect(res.status).toEqual(404);
      expect(res.body.message).toEqual("No customer with id '1234' exists.");
    });

    it("returns a 409 if the email is already in use", async () => {
      // Create a new customer named Bob.
      const ts = new Date().getTime();
      const bob = mockCustomer({ name: "Bob", email: `bob+${ts}@fauna.com` });
      const createRes = await req(app).post("/customers").send(bob);
      expect(createRes.status).toEqual(201);
      customersToCleanup.push(createRes.body);
      // Try to update change Bob's email to an email that already exists.
      const updateRes = await req(app)
        .patch(`/customers/${createRes.body.id}`)
        .send({ email: customer.email });
      expect(updateRes.status).toEqual(409);
      expect(updateRes.body.message).toEqual(
        "A customer with that email already exists."
      );
    });
  });
});
