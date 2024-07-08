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

  describe("GET /orders/:id", () => {
    it("returns a 200 if the order is retrieved successfully", async () => {
      const res = await req(app).get(`/orders/${order.id}`);
      expect(res.status).toEqual(200);
      // Check that top level internal fields are removed.
      expect(res.body.ts).toBeUndefined();
      expect(res.body.coll).toBeUndefined();
      // Check that nested internal fields are removed.
      expect(res.body.customer).toBeDefined();
      expect(res.body.customer.ts).toBeUndefined();
      expect(res.body.customer.coll).toBeUndefined();
    });

    it("returns a 404 if the order does not exist", async () => {
      const res = await req(app).get("/orders/1234");
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({
        message: "No order with id '1234' exists.",
      });
    });
  });

  describe("PATCH /orders/:id", () => {
    it("returns a 200 if the order is updated successfully", async () => {
      // Create a new customer.
      const cusotmer = mockCustomer();
      const customerRes = await req(app).post("/customers").send(cusotmer);
      customersToCleanup.push(customerRes.body);
      expect(customerRes.status).toEqual(201);
      // Create a cart for the customer.
      const cart = await req(app).post(
        `/customers/${customerRes.body.id}/cart`
      );
      // Add an item to the cart.
      const itemRes = await req(app)
        .post(`/customers/${customerRes.body.id}/cart/item`)
        .send({ productName: product.name, quantity: 1 });
      expect(itemRes.status).toEqual(200);
      // Update the status of the order.
      const orderRes = await req(app)
        .patch(`/orders/${cart.body.id}`)
        .send({ status: "processing" });
      expect(orderRes.status).toEqual(200);
      expect(orderRes.body.status).toEqual("processing");
      // Check that top level internal fields are removed.
      expect(orderRes.body.ts).toBeUndefined();
      expect(orderRes.body.coll).toBeUndefined();
      // Check that nested internal fields are removed.
      expect(orderRes.body.customer).toBeDefined();
      expect(orderRes.body.customer.ts).toBeUndefined();
      expect(orderRes.body.customer.coll).toBeUndefined;
      // Check that the product stock was decremented.
      const updatedProduct = await faunaClient.query<Product>(
        fql`Product.byName(${product.name}).first()`
      );
      expect(updatedProduct.data.stock).toEqual(product.stock - 1);
    });

    it("returns a 400 if 'status' is invalid", async () => {
      const res = await req(app).patch(`/orders/${order.id}`).send({
        status: "invalid",
      });
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({
        message:
          "Status must be one of 'cart', 'processing', 'shipped', or 'delivered'.",
      });
    });

    it("returns a 400 if the status transition is invalid", async () => {
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
        message: "Invalid status transition.",
      });
    });

    it("returns a 400 if trying to update the payment method after the order has been placed", async () => {
      const res = await req(app)
        .patch(`/orders/${order.id}`) // This order should have already been placed.
        .send({
          status: "shipped",
          payment: { method: "credit card" },
        });
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({
        message:
          "Payment method may only be updated before the order has been placed.",
      });
    });

    it("returns a 404 if the order does not exist", async () => {
      const res = await req(app)
        .patch("/orders/1234")
        .send({ status: "delivered" });
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({
        message: "No order with id '1234' exists.",
      });
    });
  });

  describe("GET /customers/:id/orders", () => {
    it("returns a list of orders for the customer", async () => {
      const res = await req(app).get(`/customers/${customer.id}/orders`);
      expect(res.status).toEqual(200);
      expect(res.body.results.length).toBeGreaterThanOrEqual(0);
      // Check that top level internal fields are removed.
      expect(res.body.results[0].ts).toBeUndefined();
      expect(res.body.results[0].coll).toBeUndefined();
      // Check that nested internal fields are removed.
      expect(res.body.results[0].customer).toBeDefined();
      expect(res.body.results[0].customer.ts).toBeUndefined();
      expect(res.body.results[0].customer.coll).toBeUndefined;
    });

    it("can paginate the list of orders", async () => {
      // Get the first page of orders.
      const firstResp = await req(app).get(
        `/customers/${customer.id}/orders?pageSize=1`
      );
      expect(firstResp.status).toEqual(200);
      expect(firstResp.body.results.length).toEqual(1);
      // Get the second page of orders
      const secondResp = await req(app).get(
        `/customers/${customer.id}/orders?nextToken=${firstResp.body.nextToken}`
      );
      expect(secondResp.status).toEqual(200);
      expect(secondResp.body.results.length).toEqual(1);
      // Ensure the orders returned are different.
      expect(firstResp.body.results[0].createdAt).not.toEqual(
        secondResp.body.results[0].createdAt
      );
    });

    it("returns a 400 if 'pageSize' is invalid", async () => {
      const notANumberRes = await req(app).get(
        `/customers/${customer.id}/orders?pageSize=not-a-number`
      );
      expect(notANumberRes.status).toEqual(400);
      expect(notANumberRes.body.message).toEqual(
        "Page size must be a positive integer or be omitted."
      );
      const negativeNumberRes = await req(app).get(
        `/customers/${customer.id}/orders?pageSize=-1`
      );
      expect(negativeNumberRes.status).toEqual(400);
      expect(negativeNumberRes.body.message).toEqual(
        "Page size must be a positive integer or be omitted."
      );
    });

    it("returns a 404 if the customer does not exist", async () => {
      const res = await req(app).get("/customers/1234/orders");
      expect(res.status).toEqual(404);
      expect(res.body.message).toEqual("No customer with id '1234' exists.");
    });
  });

  describe("GET /customers/:id/cart", () => {
    it("returns a 200 if the cart is retrieved successfully", async () => {
      const res = await req(app).get(`/customers/${customer.id}/cart`);
      expect(res.status).toEqual(200);
      expect(res.body.createdAt).toBeDefined();
      // Check that top level internal fields are removed.
      expect(res.body.ts).toBeUndefined();
      expect(res.body.coll).toBeUndefined();
      // Check that nested internal fields are removed.
      expect(res.body.customer).toBeDefined();
      expect(res.body.customer.ts).toBeUndefined();
      expect(res.body.customer.coll).toBeUndefined();
    });

    it("returns a 404 if the customer does not exist", async () => {
      const res = await req(app).get("/customers/1234/cart");
      expect(res.status).toEqual(404);
      expect(res.body.message).toEqual("No customer with id '1234' exists.");
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
      // Check that top level internal fields are removed.
      expect(cartRes.body.ts).toBeUndefined();
      expect(cartRes.body.coll).toBeUndefined();
      // Check that nested internal fields are removed.
      expect(cartRes.body.customer).toBeDefined();
      expect(cartRes.body.customer.ts).toBeUndefined();
      expect(cartRes.body.customer.coll).toBeUndefined();
    });

    it("returns a 404 if the customer does not exist", async () => {
      const res = await req(app).post("/customers/1234/cart");
      expect(res.status).toEqual(404);
      expect(res.body.message).toEqual("No customer with id '1234' exists.");
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

    it("returns a 400 if the product name is invalid", async () => {
      const res = await req(app)
        .post(`/customers/${customer.id}/cart/item`)
        .send({ productName: 123, quantity: 1 });
      expect(res.status).toEqual(400);
      expect(res.body).toEqual({
        message: "Product must be a non empty string.",
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
        message: "Quantity must be a positive integer.",
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

    it("returns a 404 if the customer does not exist", async () => {
      const res = await req(app)
        .post("/customers/1234/cart/item")
        .send({ productName: product.name, quantity: 1 });
      expect(res.status).toEqual(404);
      expect(res.body).toEqual({
        message: "No customer with id '1234' exists.",
      });
    });
  });
});
