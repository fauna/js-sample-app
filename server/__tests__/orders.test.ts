import req from "supertest";
import app from "../src/app";
import { seedTestData } from "./seed";
import { faunaClient } from "../src/fauna/fauna-client";
import { Product } from "../src/routes/products/products.model";
import { Customer } from "../src/routes/customers/customers.model";

describe("Orders", () => {
  let product: Product;
  let customer: Customer;

  beforeAll(async () => {
    const { product: p, customer: c } = await seedTestData();
    product = p;
    customer = c;
  });

  afterAll(async () => {
    // Clean up our connection to Fauna.
    faunaClient.close();
  });

  describe("POST /customers/:id/cart", () => {
    it("returns a 200 if the cart is created or returned successfully", async () => {
      const res = await req(app).post(`/customers/${customer.id}/cart`);
      expect(res.status).toEqual(200);
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toEqual("cart");
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.total).toEqual(0);
    });

    it("returns a 400 if the customer does not exist", async () => {
      const res = await req(app).post("/customers/1234/cart");
      expect(res.status).toEqual(400);
      expect(res.body.reason).toEqual("Customer does not exist.");
    });
  });

  describe("POST /customers/:id/cart/item", () => {
    [{}, { productName: "Lava Lamp" }, { quantity: 10 }].forEach((payload) => {
      it(`returns a 400 if it receives and invalid payload: ${payload}`, async () => {
        const res = await req(app).post("/customers/1/cart/item").send(payload);
        expect(res.status).toEqual(400);
        expect(res.body).toEqual({
          reason: "You must provide a productName and quantity.",
        });
      });
    });

    it("returns a 400 if the customer does not exist", async () => {
      const res = await req(app)
        .post("/customers/1234/cart/item")
        .send({ productName: product.name, quantity: 1 });
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({
        reason: "Customer does not exist.",
      });
    });

    it("returns a 400 if the product does not exist", async () => {
      const res = await req(app)
        .post(`/customers/${customer.id}/cart/item`)
        .send({ productName: "Bogus Product", quantity: 10 });
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({
        reason: "Product does not exist.",
      });
    });

    it("return a 400 if the quantity is invalid", async () => {
      const res = await req(app)
        .post(`/customers/${customer.id}/cart/item`)
        .send({ productName: product.name, quantity: -1 });
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({
        reason: "Quantity must be a non-negative integer.",
      });
    });

    it("returns a 400 if the product is out of stock", async () => {
      const res = await req(app)
        .post(`/customers/${customer.id}/cart/item`)
        .send({ productName: product.name, quantity: 100000 });
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({
        reason: "Product does not have the requested quantity in stock.",
      });
    });

    it("updates the cart with the new item", async () => {
      // Add an item to the cart.
      const firstReq = await req(app)
        .post(`/customers/${customer.id}/cart/item`)
        .send({ productName: product.name, quantity: 1 });
      expect(firstReq.status).toEqual(200);
      expect(firstReq.body.quantity).toEqual(1);
      // Update the quantity of the item in the cart.
      const secondReq = await req(app)
        .post(`/customers/${customer.id}/cart/item`)
        .send({ productName: product.name, quantity: 2 });
      expect(secondReq.status).toEqual(200);
      expect(secondReq.body.quantity).toEqual(2);
    });
  });
});
