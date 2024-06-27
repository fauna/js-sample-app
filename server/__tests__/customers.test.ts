import req from "supertest";
import app from "../src/app";
import { DocumentT, fql } from "fauna";
import { mockCustomer } from "./mocks";
import { seedTestData } from "./seed";
import { faunaClient } from "../src/fauna/fauna-client";
import { Customer } from "../src/routes/customers/customers.model";

describe("Customers", () => {
  let customer: Customer;

  beforeAll(async () => {
    const { customer: c } = await seedTestData();
    customer = c;
  });

  afterAll(async () => {
    // Clean up our connection to Fauna.
    faunaClient.close();
  });

  describe("GET /customers/:id", () => {
    it("returns a 200 if the customer exists", async () => {
      const res = await req(app).get(`/customers/${customer.id}`);
      expect(res.status).toEqual(200);
      expect(res.body.name).toEqual(customer.name);
      expect(res.body.email).toEqual(customer.email);
    });

    it("returns a 404 if the customer does not exist", async () => {
      const res = await req(app).get("/customers/1234");
      expect(res.status).toEqual(404);
      expect(res.body.reason).toEqual("No customer with id '1234' exists.");
    });
  });

  describe("POST /customers", () => {
    it("returns a 201 if the customer is created successfully", async () => {
      const bob = mockCustomer({ name: "Bob" });
      const res = await req(app).post("/customers").send(bob);
      expect(res.status).toEqual(201);
      expect(res.body.name).toEqual(bob.name);
      expect(res.body.email).toEqual(bob.email);
    });

    it("returns a 409 if the customer already exists", async () => {
      const res = await req(app)
        .post("/customers")
        .send(mockCustomer({ email: customer.email }));
      expect(res.status).toEqual(409);
      expect(res.body.reason).toEqual(
        "A customer with that email already exists."
      );
    });
  });

  describe("PATCH /customers/:id", () => {
    it("returns a 200 if the customer is updated successfully", async () => {
      const res = await req(app)
        .patch(`/customers/${customer.id}`)
        .send({ name: "Alice" });
      expect(res.status).toEqual(200);
      expect(res.body.name).toEqual("Alice");
      // Ensure the email is not changed.
      expect(res.body.email).toEqual(customer.email);
    });

    it("returns a 404 if the customer does not exist", async () => {
      const res = await req(app)
        .patch("/customers/1234")
        .send({ name: "Alice" });
      expect(res.status).toEqual(404);
      expect(res.body.reason).toEqual("No customer with id '1234' exists.");
    });

    it("returns a 409 if the email is already in use", async () => {
      const newCustomer = mockCustomer();
      // Create a new customer.
      const { data } = await faunaClient.query<DocumentT<Customer>>(
        fql`Customer.create(${newCustomer})`
      );
      // Try to update the new customer with the email of the existing customer.
      const res = await req(app)
        .patch(`/customers/${data.id}`)
        .send({ email: customer.email });
      expect(res.status).toEqual(409);
      expect(res.body.reason).toEqual(
        "A customer with that email already exists."
      );
    });
  });
});
