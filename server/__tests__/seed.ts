import { fql } from "fauna";
import { mockCustomer, mockProduct, mockCategory } from "./mocks";
import { faunaClient } from "../src/fauna/fauna-client";
import { Product } from "../src/routes/products/products.model";
import { Customer } from "../src/routes/customers/customers.model";

export const seedTestData = async (opts?: { numOrders: number }) => {
  // Create a customer to test against.
  const customer = (
    await faunaClient.query<Customer>(fql`Customer.create(${mockCustomer()})`)
  ).data;

  // Create a category to test against
  const category = (
    await faunaClient.query<{ name: string }>(
      fql`Category.create(${mockCategory()}) { name }`
    )
  ).data;

  // Create a product to test against.
  const mock = mockProduct();
  const product = (
    await faunaClient.query<Product>(
      fql`
        let category = Category.byName(${category?.name}).first()
        Product.create({
          name: ${mock.name},
          price: ${mock.price},
          stock: ${mock.stock},
          description: ${mock.descrition},
          category: category
        })
      `
    )
  ).data;

  // Create a few orders for the customer.
  const numOrders = opts?.numOrders || 1;
  for (let i = 0; i < numOrders; i++) {
    await faunaClient.query(fql`
        Order.create({
          createdAt: Time.now(),
          status: "delivered",
          customer: Customer.byId(${customer.id}),
          payment: {}
        })
      `);
  }

  const order = (await faunaClient.query(fql`Order.all().first()`)).data;

  return { product, category, customer, order };
};
