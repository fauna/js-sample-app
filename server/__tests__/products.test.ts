import req from "supertest";
import app from "../src/app";
import { fql } from "fauna";
import { faunaClient } from "../src/fauna/fauna-client";
import { seedTestData } from "./seed";
import { mockProduct } from "./mocks";
import { Product } from "../src/routes/products/products.model";

describe("Products", () => {
  let products: Array<Product>;
  let productsToCleanup: Array<Product> = [];

  beforeAll(async () => {
    const { products: p } = await seedTestData();
    products = p;
  });

  afterAll(async () => {
    // Clean up any products we created.
    for (const p of productsToCleanup) {
      await faunaClient.query(fql`Product.byName(${p.name}).first()!.delete()`);
    }
    // Clean up our connection to Fauna.
    faunaClient.close();
  });

  // describe("GET /products", () => {
  //   it("Gets all products", async () => {
  //     const res = await req(app).get(`/products`);
  //     expect(res.status).toEqual(200);
  //     expect(res.body.results.length).toBeGreaterThan(0);
  //   });

  //   it("Gets products for a specific category", async () => {
  //     const res = await req(app).get(`/products?category=books`);
  //     const expectedProducts = new Set(
  //       products
  //         .filter((p) => p.category.name === "books")
  //         .map((p) => JSON.stringify({ ...p, category: "books" }))
  //     );
  //     expect(res.status).toEqual(200);
  //     expect(res.body.nextToken).toBeUndefined();
  //     for (const product of res.body.results) {
  //       // expect(expectedProducts.has(expect.objectContaining(product))).toBe(
  //       //   true
  //       // );
  //       expect(expectedProducts).toEqual(
  //         expect.arrayContaining([expect.objectContaining(product)])
  //       );
  //     }
  //     expect(res.body.results.length).toEqual(expectedProducts.size);
  //   });
  // });

  describe("POST /products", () => {
    it("Creates a product", async () => {
      // Create a new product.
      const product = mockProduct({ category: "electronics" });
      const res = await req(app).post(`/products`).send(product);
      productsToCleanup.push(res.body);
      // Check that the product was created successfully.
      expect(res.status).toEqual(201);
      expect(res.body.name).toEqual(product.name);
      // Check that top level internal fields are removed.
      expect(res.body.ts).toBeUndefined();
      expect(res.body.coll).toBeUndefined();
      // Check that nested internal fields are removed.
      expect(res.body.category).toBeDefined();
      expect(res.body.category.ts).toBeUndefined();
      expect(res.body.category.coll).toBeUndefined();
    });

    it("Returns a 400 if the name is missing", async () => {
      const { name, ...rest } = mockProduct({ category: "electronics" });
      const res = await req(app).post(`/products`).send(rest);
      expect(res.status).toEqual(400);
      expect(res.body.message).toEqual("Name must be a non-empty string.");
    });

    it("Returns a 400 if the price is missing", async () => {
      const { price, ...rest } = mockProduct({ category: "electronics" });
      const res = await req(app).post(`/products`).send(rest);
      expect(res.status).toEqual(400);
      expect(res.body.message).toEqual(
        "Price must be a number greater than 0."
      );
    });

    it("Returns a 400 if the description is missing", async () => {
      const { description, ...rest } = mockProduct({ category: "electronics" });
      const res = await req(app).post(`/products`).send(rest);
      expect(res.status).toEqual(400);
      expect(res.body.message).toEqual(
        "Description must be a non-empty string."
      );
    });

    it("Returns a 400 if the stock is missing", async () => {
      const { stock, ...rest } = mockProduct({ category: "electronics" });
      const res = await req(app).post(`/products`).send(rest);
      expect(res.status).toEqual(400);
      expect(res.body.message).toEqual(
        "Stock must be a number greater than or equal to 0."
      );
    });

    it("Returns a 400 if the category is missing", async () => {
      const { category, ...rest } = mockProduct();
      const res = await req(app).post(`/products`).send(rest);
      expect(res.status).toEqual(400);
      expect(res.body.message).toEqual("Category must be a non-empty string.");
    });

    it("Returns a 400 if the category does not exist", async () => {
      const product = mockProduct();
      const res = await req(app)
        .post(`/products`)
        .send({ ...product, category: "non-existent" });
      expect(res.status).toEqual(400);
      expect(res.body.message).toEqual("Category does not exist.");
    });

    it("Returns a 409 if the product already exists", async () => {
      const res = await req(app)
        .post(`/products`)
        .send({ ...products[0], category: "electronics" });
      expect(res.status).toEqual(409);
      expect(res.body.message).toEqual(
        "A product with that name already exists."
      );
    });
  });

  // describe("PATCH /products/:name", () => {
  //   it("Updates a product", async () => {
  //     const product = mockProduct({ price: 10.99, category: "electronics" });
  //     const createRes = await req(app).post(`/products`).send(product);
  //     expect(createRes.status).toEqual(201);
  //     expect(createRes.body.price).toEqual(10.99);
  //     productsToCleanup.push(createRes.body);
  //     const updateRes = await req(app)
  //       .patch(`/products/${product.name}`)
  //       .send({ price: 19.99 });
  //     expect(updateRes.status).toEqual(200);
  //     expect(updateRes.body.price).toEqual(19.99);
  //     expect(updateRes.body.name).toEqual(product.name);
  //   });

  //   it("Returns a 400 if the product does not exist", async () => {
  //     const res = await req(app)
  //       .patch(`/products/notarealproduct`)
  //       .send({ price: 19.99 });
  //     expect(res.status).toEqual(400);
  //     expect(res.body.message).toEqual("Product does not exist.");
  //   });

  //   it("Returns a 400 if the price is invalid", async () => {
  //     const priceAsString = await req(app)
  //       .patch("/products/does-not-matter")
  //       .send({ price: "not a number" });
  //     expect(priceAsString.status).toEqual(400);
  //     expect(priceAsString.body.message).toEqual(
  //       "Price must be a number greater than 0 or be omitted."
  //     );
  //     const negativePrice = await req(app)
  //       .patch("/products/does-not-matter")
  //       .send({ price: -1 });
  //     expect(negativePrice.status).toEqual(400);
  //     expect(negativePrice.body.message).toEqual(
  //       "Price must be a number greater than 0 or be omitted."
  //     );
  //   });

  //   it("Returns a 400 if the stock is invalid", async () => {
  //     const stockAsString = await req(app)
  //       .patch("/products/does-not-matter")
  //       .send({ stock: "not a number" });
  //     expect(stockAsString.status).toEqual(400);
  //     expect(stockAsString.body.message).toEqual(
  //       "Stock must be a number greater than or equal to 0 or be omitted."
  //     );
  //     const negativeStock = await req(app)
  //       .patch("/products/does-not-matter")
  //       .send({ stock: -1 });
  //     expect(negativeStock.status).toEqual(400);
  //     expect(negativeStock.body.message).toEqual(
  //       "Stock must be a number greater than or equal to 0 or be omitted."
  //     );
  //   });

  //   it("Returns a 400 if the category is invalid", async () => {
  //     const categoryAsString = await req(app)
  //       .patch("/products/does-not-matter")
  //       .send({ category: 123 });
  //     expect(categoryAsString.status).toEqual(400);
  //     expect(categoryAsString.body.message).toEqual(
  //       "Category must be a string or be omitted."
  //     );
  //   });

  //   it("Returns a 400 if the description is invalid", async () => {
  //     const descriptionAsNumber = await req(app)
  //       .patch("/products/does-not-matter")
  //       .send({ description: 123 });
  //     expect(descriptionAsNumber.status).toEqual(400);
  //     expect(descriptionAsNumber.body.message).toEqual(
  //       "Description must be a string or be omitted."
  //     );
  //   });

  //   it("Returns a 400 if attempting to update the product name", async () => {
  //     const nameAsNumber = await req(app)
  //       .patch("/products/foo")
  //       .send({ name: "bar" });
  //     expect(nameAsNumber.status).toEqual(400);
  //     expect(nameAsNumber.body.message).toEqual(
  //       "Name cannot be updated. Please create a new product instead."
  //     );
  //   });
  // });
});
