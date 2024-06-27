import { fql } from "fauna";
import req from "supertest";
import app from "../src/app";
import { mockAddr } from "./mocks";
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
      const res = await req(app).post("/customers").send({
        name: "Not Alice",
        email: customer.email,
        address: mockAddr(),
      });
      expect(res.status).toEqual(409);
      expect(res.body.reason).toEqual(
        "A customer with that email already exists."
      );
    });
  });
});
