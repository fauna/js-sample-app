import req from "supertest";
import app from "../src/app";
import { seedTestData } from "./seed";
import { faunaClient } from "../src/fauna/fauna-client";
import { Product } from "../src/routes/products/products.model";
import { Customer } from "../src/routes/customers/customers.model";

describe("Orders", () => {
  let product: Product;
  let customer: Customer;
  let order: any;

  beforeAll(async () => {
    const { product: p, customer: c, order: o } = await seedTestData({ numOrders: 2 });
    product = p;
    customer = c;
    order = o;
  });

  afterAll(async () => {
    // Clean up our connection to Fauna.
    faunaClient.close();
  });

  describe("GET /customers/:id/cart", () => {
    it("returns a 200 if the cart is retrieved successfully", async () => {
      const res = await req(app).get(`/customers/${customer.id}/cart`);
      expect(res.status).toEqual(200);
    });

    it("returns a 400 if the customer does not exist", async () => {
      const res = await req(app).get("/customers/1234/cart");
      expect(res.status).toEqual(400);
      expect(res.body.reason).toEqual("No customer with id exists.");
    });
  });

  describe("POST /customers/:id/cart", () => {
    it("creates the cart", async () => {
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

  describe("POST /customers/:id/orders", () => {
    it("returns a list of orders for the customer", async () => {
      const res = await req(app).post(`/customers/${customer.id}/orders`);
      expect(res.status).toEqual(200);
      expect(res.body.results.length).toBeGreaterThanOrEqual(0);
    });

    it("can paginate the list of orders", async () => {
      // Get the first page of orders.
      const firstResp = await req(app)
        .post(`/customers/${customer.id}/orders`)
        .send({ pageSize: 1, nextToken: undefined });
      expect(firstResp.status).toEqual(200);
      expect(firstResp.body.results.length).toEqual(1);
      // Get the second page of orders
      const secondResp = await req(app)
        .post(`/customers/${customer.id}/orders`)
        .send({
          pageSize: 1,
          nextToken: firstResp.body.nextToken,
        });
      expect(secondResp.status).toEqual(200);
      expect(secondResp.body.results.length).toEqual(1);
      // Ensure the orders returned are different.
      expect(firstResp.body.results[0].createdAt).not.toEqual(
        secondResp.body.results[0].createdAt
      );
    });

    it("returns a 400 if the customer does not exist", async () => {
      const res = await req(app).post("/customers/1234/orders");
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({
        reason: "Customer does not exist.",
      });
    });
  });

  describe("POST /customers/:id/cart/item", () => {
    it("updates the cart with the new item", async () => {
      // Add an item to the cart.
      const firstResp = await req(app)
        .post(`/customers/${customer.id}/cart/item`)
        .send({ productName: product.name, quantity: 1 });
      expect(firstResp.status).toEqual(200);
      expect(firstResp.body.quantity).toEqual(1);
      // Update the quantity of the item in the cart.
      const secondResp = await req(app)
        .post(`/customers/${customer.id}/cart/item`)
        .send({ productName: product.name, quantity: 2 });
      expect(secondResp.status).toEqual(200);
      expect(secondResp.body.quantity).toEqual(2);
    });

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
  });

  describe("GET /orders/:id", () => {
    it("returns a 200 if the order is retrieved successfully", async () => {
      const res = await req(app).get(`/orders/${order.id}`);
      expect(res.status).toEqual(200);
    });

    it("returns a 400 if the order does not exist", async () => {
      const res = await req(app).get("/orders/1234");
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({
        reason: "No order with id exists.",
      });
    });
  });
});
