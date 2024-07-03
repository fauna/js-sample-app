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

    it("omitts internal fauna fields", async () => {
      const res = await req(app).get(`/customers/${customer.id}`);
      expect(res.status).toEqual(200);
      // Check that top level internal fields are removed.
      expect(res.body.ts).toBeUndefined();
      expect(res.body.coll).toBeUndefined();
      // Check that nested internal fields are removed.
      expect(res.body.cart).toBeDefined();
      expect(res.body.cart.ts).toBeUndefined();
      expect(res.body.cart.coll).toBeUndefined();
    });

    it("returns a 400 if the id is invalid", async () => {
      const res = await req(app).get("/customers/foobar");
      expect(res.status).toEqual(400);
      expect(res.body.message).toEqual("Invalid id 'foobar' provided.");
    });

    it("returns a 404 if the customer does not exist", async () => {
      const res = await req(app).get("/customers/1234");
      expect(res.status).toEqual(404);
      expect(res.body.message).toEqual("No customer with id '1234' exists.");
    });
  });

  describe("POST /customers", () => {
    it("returns a 201 if the customer is created successfully", async () => {
      const cust = mockCustomer();
      const res = await req(app).post("/customers").send(cust);
      customersToCleanup.push(res.body);
      expect(res.status).toEqual(201);
      expect(res.body.email).toEqual(cust.email);
    });

    it("returns a 400 if 'name' is missing or invalid", async () => {
      const missingRes = await req(app)
        .post("/customers")
        .send({ ...mockCustomer(), name: undefined });
      expect(missingRes.status).toEqual(400);
      expect(missingRes.body.message).toEqual(
        "Name must be a non-empty string."
      );
      const invalidRes = await req(app)
        .post("/customers")
        .send({ ...mockCustomer(), name: 123 });
      expect(invalidRes.status).toEqual(400);
      expect(invalidRes.body.message).toEqual(
        "Name must be a non-empty string."
      );
    });

    it("returns a 400 if 'email' is missing or invalid", async () => {
      const missingRes = await req(app)
        .post("/customers")
        .send({ ...mockCustomer(), email: undefined });
      expect(missingRes.status).toEqual(400);
      expect(missingRes.body.message).toEqual(
        "Email must be a non-empty string."
      );
      const invalidRes = await req(app)
        .post("/customers")
        .send({ ...mockCustomer(), email: 123 });
      expect(invalidRes.status).toEqual(400);
      expect(invalidRes.body.message).toEqual(
        "Email must be a non-empty string."
      );
    });

    it("returns a 400 if 'address' is missing or invalid", async () => {
      const missingRes = await req(app)
        .post("/customers")
        .send({ ...mockCustomer(), address: undefined });
      expect(missingRes.status).toEqual(400);
      expect(missingRes.body.message).toEqual(
        "Address must contain a street, city, state, postalCode and country represented as strings."
      );
      const invalidRes = await req(app)
        .post("/customers")
        .send({ ...mockCustomer(), address: 123 });
      expect(invalidRes.status).toEqual(400);
      expect(invalidRes.body.message).toEqual(
        "Address must contain a street, city, state, postalCode and country represented as strings."
      );
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
      // Create a new customer.
      const cust = mockCustomer();
      const createRes = await req(app).post("/customers").send(cust);
      expect(createRes.status).toEqual(201);
      customersToCleanup.push(createRes.body);
      // Update the customer's name to Alice.
      const updateRes = await req(app)
        .patch(`/customers/${createRes.body.id}`)
        .send({ name: "Alice" });
      expect(updateRes.status).toEqual(200);
      expect(updateRes.body.name).toEqual("Alice");
      // Confirm the email did not change.
      expect(updateRes.body.email).toEqual(cust.email);
    });

    it("returns a 400 if 'name' is invalid", async () => {
      const res = await req(app)
        .patch("/customers/does-not-matter")
        .send({ ...mockCustomer(), name: 123 });
      expect(res.status).toEqual(400);
      expect(res.body.message).toEqual(
        "Name must be a non-empty string or be omitted."
      );
    });

    it("returns a 400 if 'email' is invalid", async () => {
      const res = await req(app)
        .patch("/customers/does-not-matter")
        .send({ ...mockCustomer(), email: 123 });
      expect(res.status).toEqual(400);
      expect(res.body.message).toEqual(
        "Email must be a non-empty string or be omitted."
      );
    });

    it("returns a 400 if 'address' is invalid", async () => {
      const res = await req(app)
        .patch("/customers/does-not-matter")
        .send({ ...mockCustomer(), address: "foobar" });
      expect(res.status).toEqual(400);
      expect(res.body.message).toEqual(
        "Address must contain a street, city, state, postalCode and country represented as strings or be omitted."
      );
    });

    it("returns a 404 if the customer does not exist", async () => {
      const res = await req(app).patch("/customers/1234");
      expect(res.status).toEqual(404);
      expect(res.body.message).toEqual("No customer with id '1234' exists.");
    });

    it("returns a 409 if the email is already in use", async () => {
      // Create a new customer.
      const cust = mockCustomer();
      const createRes = await req(app).post("/customers").send(cust);
      expect(createRes.status).toEqual(201);
      customersToCleanup.push(createRes.body);
      // Try to update the customer's email to an existing email.
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
