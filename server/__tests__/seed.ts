import { fql } from "fauna";
import { mockUser, mockProduct, mockCategory } from "./mocks";
import { faunaClient } from "../src/fauna/fauna-client";
import { Product } from "../src/routes/products/products.model";
import { Category } from "../src/routes/products/products.model";
import { Customer } from "../src/routes/customers/customers.model";

export const seedTestData = async () => {
  // Create a customer to test against.
  const customer = (
    await faunaClient.query<Customer>(fql`Customer.create(${mockUser()})`)
  ).data;

  // Create a category to test against
  const category = (
    await faunaClient.query<Category>(fql`Category.create(${mockCategory()})`)
  ).data;

  // Create a product to test against.
  const mock = mockProduct();
  const product = (
    await faunaClient.query<Product>(
      fql`
        let category = Category.byName(${category.name}).first()
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

  return { product, category, customer };
};
