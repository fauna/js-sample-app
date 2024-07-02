import req from "supertest";
import app from "../src/app";
import { fql } from "fauna";
import { seedTestData } from "./seed";
import { mockCustomer } from "./mocks";
import { faunaClient } from "../src/fauna/fauna-client";
import { Order } from "../src/routes/orders/orders.model";
import { Product } from "../src/routes/products/products.model";
import { Customer } from "../src/routes/customers/customers.model";

describe("Orders", () => {
  let product: Product;
  let customer: Customer;
  let order: Order;
  let customersToCleanup: Array<Customer> = [];

  beforeAll(async () => {
    const { products: p, customer: c, orders: o } = await seedTestData();
    product = p[0];
    customer = c;
    order = o[0];
  });

  afterAll(async () => {
    // Clean up any customer we created along with their orders.
    for (const c of customersToCleanup) {
      await faunaClient.query(fql`
        // Get the customer.
        let customer = Customer.byId(${c.id})
        // Delete all orders & order items associated with the order.
        Order.byCustomer(customer).forEach(order => {
          OrderItem.byOrder(order).forEach(orderItem => orderItem!.delete())
          order!.delete()
        })
        // Delete the customer.
        customer!.delete()
      `);
    }
    // Clean up our connection to Fauna.
    faunaClient.close();
  });

  describe("GET /customers/:id/cart", () => {
    it("returns a 200 if the cart is retrieved successfully", async () => {
      const res = await req(app).get(`/customers/${customer.id}/cart`);
      expect(res.status).toEqual(200);
      expect(res.body.createdAt).toBeDefined();
    });

    it("returns a 400 if the customer does not exist", async () => {
      const res = await req(app).get("/customers/1234/cart");
      expect(res.status).toEqual(400);
      expect(res.body.message).toEqual("No customer with id exists.");
    });
  });

  describe("POST /customers/:id/cart", () => {
    it("creates the cart if it does not exist", async () => {
      // Create a new customer, they will not have a cart.
      const cust = mockCustomer();
      const customerRes = await req(app).post("/customers").send(cust);
      customersToCleanup.push(customerRes.body);
      expect(customerRes.status).toEqual(201);
      // Create the cart for the customer.
      const cartRes = await req(app).post(
        `/customers/${customerRes.body.id}/cart`
      );
      expect(cartRes.status).toEqual(200);
      expect(cartRes.body.status).toEqual("cart");
      expect(cartRes.body.total).toEqual(0);
    });

    it("returns a 400 if the customer does not exist", async () => {
      const res = await req(app).post("/customers/1234/cart");
      expect(res.status).toEqual(400);
      expect(res.body.message).toEqual("Customer does not exist.");
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
        message: "Customer does not exist.",
      });
    });
  });

  describe("POST /customers/:id/cart/item", () => {
    it("updates the cart with the new item", async () => {
      // Create a new customer.
      const cust = mockCustomer();
      const customerRes = await req(app).post("/customers").send(cust);
      customersToCleanup.push(customerRes.body);
      expect(customerRes.status).toEqual(201);
      // Add an item to the cart.
      const firstResp = await req(app)
        .post(`/customers/${customerRes.body.id}/cart/item`)
        .send({ productName: product.name, quantity: 1 });
      expect(firstResp.status).toEqual(200);
      expect(firstResp.body.quantity).toEqual(1);
      // Update the quantity of the item in the cart.
      const secondResp = await req(app)
        .post(`/customers/${customerRes.body.id}/cart/item`)
        .send({ productName: product.name, quantity: 2 });
      expect(secondResp.status).toEqual(200);
      expect(secondResp.body.quantity).toEqual(2);
    });

    [{}, { productName: "Lava Lamp" }, { quantity: 10 }].forEach((payload) => {
      it(`returns a 400 if it receives and invalid payload: ${payload}`, async () => {
        const res = await req(app).post("/customers/1/cart/item").send(payload);
        expect(res.status).toEqual(400);
        expect(res.body).toEqual({
          message: "You must provide a productName and quantity.",
        });
      });
    });

    it("returns a 400 if the customer does not exist", async () => {
      const res = await req(app)
        .post("/customers/1234/cart/item")
        .send({ productName: product.name, quantity: 1 });
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({
        message: "Customer does not exist.",
      });
    });

    it("returns a 400 if the product does not exist", async () => {
      const res = await req(app)
        .post(`/customers/${customer.id}/cart/item`)
        .send({ productName: "Bogus Product", quantity: 10 });
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({
        message: "Product does not exist.",
      });
    });

    it("return a 400 if the quantity is invalid", async () => {
      const res = await req(app)
        .post(`/customers/${customer.id}/cart/item`)
        .send({ productName: product.name, quantity: -1 });
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({
        message: "Quantity must be a non-negative integer.",
      });
    });

    it("returns a 400 if the product is out of stock", async () => {
      const res = await req(app)
        .post(`/customers/${customer.id}/cart/item`)
        .send({ productName: product.name, quantity: 100000 });
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({
        message: "Product does not have the requested quantity in stock.",
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

  describe("PATCH /orders/:id", () => {
    it("updates the order", async () => {
      // Create a new customer.
      const cusotmer = mockCustomer();
      const customerRes = await req(app).post("/customers").send(cusotmer);
      customersToCleanup.push(customerRes.body);
      expect(customerRes.status).toEqual(201);
      // Create a cart for the customer.
      const cart = await req(app).post(
        `/customers/${customerRes.body.id}/cart`
      );
      // Update the status of the order.
      const orderRes = await req(app)
        .patch(`/orders/${cart.body.id}`)
        .send({ status: "processing" });
      expect(orderRes.status).toEqual(200);
      expect(orderRes.body.status).toEqual("processing");
    });

    it("returns a 400 if the order does not exist", async () => {
      const res = await req(app)
        .patch("/orders/1234")
        .send({ status: "delivered" });
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({
        reason: "Order does not exist.",
      });
    });

    it("returns a 400 if the status is invalid", async () => {
      // Create a new customer.
      const cust = mockCustomer();
      const customerRes = await req(app).post("/customers").send(cust);
      customersToCleanup.push(customerRes.body);
      expect(customerRes.status).toEqual(201);
      // Create a cart for the customer.
      const cartRes = await req(app).post(
        `/customers/${customerRes.body.id}/cart`
      );
      // Update the status to "delivered" which is not a valid transition.
      const updateRes = await req(app)
        .patch(`/orders/${cartRes.body.id}`)
        .send({ status: "delivered" });
      expect(updateRes.status).toEqual(400);
      expect(updateRes.body).toEqual({
        reason: "Invalid status transition.",
      });
    });
  });
});
