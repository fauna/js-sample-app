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

  describe("GET /products", () => {
    it("Gets all products", async () => {
      const res = await req(app).get(`/products`);
      expect(res.status).toEqual(200);
      expect(res.body.results.length).toBeGreaterThan(0);
    });

    it("Gets products for a specific category", async () => {
      const res = await req(app).get(`/products?category=books`);
      const expectedProducts = new Set(
        products
          .filter((p) => p.category.name === "books")
          .map((p) => JSON.stringify({ ...p, category: "books" }))
      );
      expect(res.status).toEqual(200);
      expect(res.body.nextToken).toBeUndefined();
      for (const product of res.body.results) {
        // expect(expectedProducts.has(expect.objectContaining(product))).toBe(
        //   true
        // );
        expect(expectedProducts).toEqual(
          expect.arrayContaining([expect.objectContaining(product)])
        );
      }
      expect(res.body.results.length).toEqual(expectedProducts.size);
    });
  });

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

    it("Returns a 400 if 'name' is missing or invalid", async () => {
      const { name, ...rest } = mockProduct({ category: "electronics" });
      const missingRes = await req(app).post(`/products`).send(rest);
      expect(missingRes.status).toEqual(400);
      expect(missingRes.body.message).toEqual(
        "Name must be a non-empty string."
      );
      const invalidRes = await req(app)
        .post(`/products`)
        .send({ ...rest, name: 123 });
      expect(invalidRes.status).toEqual(400);
      expect(invalidRes.body.message).toEqual(
        "Name must be a non-empty string."
      );
    });

    it("Returns a 400 if 'price' is missing or invalid", async () => {
      const { price, ...rest } = mockProduct({ category: "electronics" });
      const missingRes = await req(app).post(`/products`).send(rest);
      expect(missingRes.status).toEqual(400);
      expect(missingRes.body.message).toEqual(
        "Price must be a number greater than 0."
      );
      const invalidRes = await req(app)
        .post(`/products`)
        .send({ ...rest, price: "foo" });
      expect(invalidRes.status).toEqual(400);
      expect(invalidRes.body.message).toEqual(
        "Price must be a number greater than 0."
      );
    });

    it("Returns a 400 if 'description' is missing or invalid", async () => {
      const { description, ...rest } = mockProduct({ category: "electronics" });
      const missingRes = await req(app).post(`/products`).send(rest);
      expect(missingRes.status).toEqual(400);
      expect(missingRes.body.message).toEqual(
        "Description must be a non-empty string."
      );
      const invalidRes = await req(app)
        .post(`/products`)
        .send({ ...rest, description: 123 });
      expect(invalidRes.status).toEqual(400);
      expect(invalidRes.body.message).toEqual(
        "Description must be a non-empty string."
      );
    });

    it("Returns a 400 if 'stock' is missing or invalid", async () => {
      const { stock, ...rest } = mockProduct({ category: "electronics" });
      const missingRes = await req(app).post(`/products`).send(rest);
      expect(missingRes.status).toEqual(400);
      expect(missingRes.body.message).toEqual(
        "Stock must be a number greater than or equal to 0."
      );
      const invalidRes = await req(app)
        .post(`/products`)
        .send({ ...rest, stock: -1 });
      expect(invalidRes.status).toEqual(400);
      expect(invalidRes.body.message).toEqual(
        "Stock must be a number greater than or equal to 0."
      );
    });

    it("Returns a 400 if 'category' is missing or invalid", async () => {
      const { category, ...rest } = mockProduct();
      const missingRes = await req(app).post(`/products`).send(rest);
      expect(missingRes.status).toEqual(400);
      expect(missingRes.body.message).toEqual(
        "Category must be a non-empty string."
      );
      const invalidRes = await req(app)
        .post(`/products`)
        .send({ ...rest, category: 123 });
      expect(invalidRes.status).toEqual(400);
      expect(invalidRes.body.message).toEqual(
        "Category must be a non-empty string."
      );
    });

    it("Returns a 400 if the category does not exist", async () => {
      const product = mockProduct();
      const res = await req(app)
        .post(`/products`)
        .send({ ...product, category: "does not exist" });
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

  describe("PATCH /products/:name", () => {
    it("Updates a product", async () => {
      // Create a new product.
      const product = mockProduct({ price: 10.99, category: "electronics" });
      const createRes = await req(app).post(`/products`).send(product);
      productsToCleanup.push(createRes.body);
      // Check that the product was created successfully.
      expect(createRes.status).toEqual(201);
      expect(createRes.body.price).toEqual(10.99);
      // Update the product.
      const updateRes = await req(app)
        .patch(`/products/${createRes.body.id}`)
        .send({ price: 19.99 });
      // Check that the product was updated successfully.
      expect(updateRes.status).toEqual(200);
      expect(updateRes.body.price).toEqual(19.99);
      expect(updateRes.body.name).toEqual(product.name);
      // Check that top level internal fields are removed.
      expect(updateRes.body.ts).toBeUndefined();
      expect(updateRes.body.coll).toBeUndefined();
      // Check that nested internal fields are removed.
      expect(updateRes.body.category).toBeDefined();
      expect(updateRes.body.category.ts).toBeUndefined();
      expect(updateRes.body.category.coll).toBeUndefined;
    });

    it("Returns a 404 if the product does not exist", async () => {
      const res = await req(app).patch(`/products/1234`).send({ price: 19.99 });
      expect(res.status).toEqual(404);
      expect(res.body.message).toEqual("No product with id '1234' exists.");
    });

    it("Returns a 400 if 'name' is invalid", async () => {
      const nameAsNumber = await req(app)
        .patch("/products/does-not-matter")
        .send({ name: 123 });
      expect(nameAsNumber.status).toEqual(400);
      expect(nameAsNumber.body.message).toEqual(
        "Name must be a non-empty string or be omitted."
      );
      const nameAsEmptyString = await req(app)
        .patch("/products/does-not-matter")
        .send({ name: "" });
      expect(nameAsEmptyString.status).toEqual(400);
      expect(nameAsEmptyString.body.message).toEqual(
        "Name must be a non-empty string or be omitted."
      );
    });

    it("Returns a 400 if 'price' is invalid", async () => {
      const priceAsString = await req(app)
        .patch("/products/does-not-matter")
        .send({ price: "not a number" });
      expect(priceAsString.status).toEqual(400);
      expect(priceAsString.body.message).toEqual(
        "Price must be a number greater than 0 or be omitted."
      );
      const negativePrice = await req(app)
        .patch("/products/does-not-matter")
        .send({ price: -1 });
      expect(negativePrice.status).toEqual(400);
      expect(negativePrice.body.message).toEqual(
        "Price must be a number greater than 0 or be omitted."
      );
    });

    it("Returns a 400 if 'stock' is invalid", async () => {
      const stockAsString = await req(app)
        .patch("/products/does-not-matter")
        .send({ stock: "not a number" });
      expect(stockAsString.status).toEqual(400);
      expect(stockAsString.body.message).toEqual(
        "Stock must be a number greater than or equal to 0 or be omitted."
      );
      const negativeStock = await req(app)
        .patch("/products/does-not-matter")
        .send({ stock: -1 });
      expect(negativeStock.status).toEqual(400);
      expect(negativeStock.body.message).toEqual(
        "Stock must be a number greater than or equal to 0 or be omitted."
      );
    });

    it("Returns a 400 if 'category' is invalid", async () => {
      const categoryAsString = await req(app)
        .patch("/products/does-not-matter")
        .send({ category: 123 });
      expect(categoryAsString.status).toEqual(400);
      expect(categoryAsString.body.message).toEqual(
        "Category must be a string or be omitted."
      );
    });

    it("Returns a 400 if 'description' is invalid", async () => {
      const descriptionAsNumber = await req(app)
        .patch("/products/does-not-matter")
        .send({ description: 123 });
      expect(descriptionAsNumber.status).toEqual(400);
      expect(descriptionAsNumber.body.message).toEqual(
        "Description must be a string or be omitted."
      );
    });

    it("Returns a 409 if a product with the same name already exists", async () => {
      // Create a new product.
      const product = mockProduct({ category: "electronics" });
      const createRes = await req(app).post(`/products`).send(product);
      productsToCleanup.push(createRes.body);
      // Check that the product was created successfully.
      expect(createRes.status).toEqual(201);
      // Try to create another product with the same name.
      const updateRes = await req(app)
        .patch(`/products/${createRes.body.id}`)
        .send({ name: products[0].name });
      // Check that the product was not updated.
      expect(updateRes.status).toEqual(409);
      expect(updateRes.body.message).toEqual(
        "A product with that name already exists."
      );
    });
  });
});
