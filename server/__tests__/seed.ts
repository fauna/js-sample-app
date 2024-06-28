import { fql } from "fauna";
import { mockCustomer } from "./mocks";
import { faunaClient } from "../src/fauna/fauna-client";
import { Order } from "../src/routes/orders/orders.model";
import { Product } from "../src/routes/products/products.model";
import { Customer } from "../src/routes/customers/customers.model";

const mockProducts = {
  electronics: [
    {
      name: "iPhone",
      price: 100_00,
      description: "Apple's flagship phone",
      stock: 100,
    },
    {
      name: "Drone",
      price: 90_00,
      description: "Fly and let people wonder if you're filming them!",
      stock: 0,
    },
    {
      name: "Signature Box III",
      price: 3000_00,
      description: "Hooli's latest box!",
      stock: 1000,
    },
    {
      name: "Rapsberry Pi",
      price: 30_00,
      description: "A tiny computer",
      stock: 5,
    },
  ],
  books: [
    {
      name: "For Whom the Bell Tolls",
      price: 8_99,
      description: "A book by Ernest Hemingway",
      stock: 10,
    },
    {
      name: "Getting Started with Fauna",
      price: 19_99,
      description: "A book by Fauna, Inc.",
      stock: 0,
    },
  ],
  movies: [
    {
      name: "The Godfather",
      price: 12_99,
      description: "A movie by Francis Ford Coppola",
      stock: 10,
    },
    {
      name: "The Godfather II",
      price: 12_99,
      description: "A movie by Francis Ford Coppola",
      stock: 10,
    },
    {
      name: "The Godfather III",
      price: 12_99,
      description: "A movie by Francis Ford Coppola",
      stock: 10,
    },
  ],
};

export const seedTestData = async () => {
  // Create categories.
  const categories: Array<string> = [];
  const categoryCreates = [];
  for (const category of Object.keys(mockProducts)) {
    categories.push(category);
    categoryCreates.push(
      faunaClient.query(fql`
        let c = Category.byName(${category}).first() ??
          Category.create({ name: ${category}, description: "Bargain #{${category}}!" })
        c { name, description }
      `)
    );
  }
  await Promise.all(categoryCreates);

  // Create products.
  const products: Array<Product> = [];
  const productCreates = [];
  for (const [category, categoryProducts] of Object.entries(mockProducts)) {
    for (const product of categoryProducts) {
      products.push({ ...product, category });
      productCreates.push(
        faunaClient.query<Product>(fql`
          let p: Any = Product.byName(${product.name}).first() ??
            Product.create({
              name: ${product.name},
              price: ${product.price},
              description: ${product.description},
              stock: ${product.stock},
              category: Category.byName(${category}).first()!,
            })
          p { name, price, description, stock, category: .category!.name }
        `)
      );
    }
  }
  await Promise.all(productCreates);

  // Create a customer.

  const c = mockCustomer({ name: "Tony Stark" });
  const customer = (
    await faunaClient.query<Customer>(
      fql`Customer.byEmail(${c.email}).first()! ?? Customer.create(${c})`
    )
  ).data;

  // Create a few orders for the customer.
  for (let i = 0; i <= 3; i++) {
    await faunaClient.query(fql`
      Order.create({
        createdAt: Time.now(),
        status: "delivered",
        customer: Customer.byId(${customer.id}),
        payment: {}
      })
    `);
  }

  const order = (
    await faunaClient.query(fql`Order.where(.status == 'cart').first()`)
  ).data;

  return { customer, order, products, categories };
};
