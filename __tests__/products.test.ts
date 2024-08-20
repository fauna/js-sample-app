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
  const productFields = [
    "id",
    "name",
    "price",
    "description",
    "stock",
    "category",
  ];

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
    it("gets all products", async () => {
      const res = await req(app).get("/products");
      expect(res.status).toEqual(200);
      expect(res.body.results.length).toBeGreaterThanOrEqual(products.length);
      for (const product of res.body.results) {
        expect(Object.keys(product).sort()).toEqual(productFields.sort());
      }
    });

    it("gets products for a specific category", async () => {
      const res = await req(app).get("/products?category=books");
      const expectedProducts = new Set(
        products
          .filter((p) => p.category.name === "books")
          .map((p) => JSON.stringify({ ...p, category: "books" }))
      );
      expect(res.status).toEqual(200);
      for (const product of res.body.results) {
        expect(product.category.name).toEqual("books");
      }
      expect(res.body.results.length).toEqual(expectedProducts.size);
    });

    it("can paginate the list of products", async () => {
      // Get the first page of orders.
      const firstResp = await req(app).get("/products?pageSize=1");
      expect(firstResp.status).toEqual(200);
      expect(firstResp.body.results.length).toEqual(1);
      // Get the second page of orders
      const secondResp = await req(app).get(
        `/products?nextToken=${firstResp.body.nextToken}`
      );
      expect(secondResp.status).toEqual(200);
      expect(secondResp.body.results.length).toEqual(1);
      // Ensure the orders returned are different.
      expect(firstResp.body.results[0].name).not.toEqual(
        secondResp.body.results[0].name
      );
    });

    it("returns a 400 if 'pageSize' is invalid", async () => {
      const notANumberRes = await req(app).get(
        "/products?pageSize=not-a-number"
      );
      expect(notANumberRes.status).toEqual(400);
      expect(notANumberRes.body.message).toEqual(
        "Page size must be a positive integer or be omitted."
      );
      const negativeNumberRes = await req(app).get("/products?pageSize=-1");
      expect(negativeNumberRes.status).toEqual(400);
      expect(negativeNumberRes.body.message).toEqual(
        "Page size must be a positive integer or be omitted."
      );
    });
  });

  describe("POST /products", () => {
    it("creates a product", async () => {
      // Create a new product.
      const product = mockProduct({ category: "electronics" });
      const res = await req(app).post(`/products`).send(product);
      productsToCleanup.push(res.body);
      // Check that the product was created successfully.
      expect(res.status).toEqual(201);
      expect(res.body.name).toEqual(product.name);
      expect(Object.keys(res.body).sort()).toEqual(productFields.sort());
    });

    it("returns a 400 if 'name' is missing or invalid", async () => {
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

    it("returns a 400 if 'price' is missing or invalid", async () => {
      const { price, ...rest } = mockProduct({ category: "electronics" });
      const missingRes = await req(app).post(`/products`).send(rest);
      expect(missingRes.status).toEqual(400);
      expect(missingRes.body.message).toEqual(
        "Price must be an integer greater than 0."
      );
      const invalidRes = await req(app)
        .post(`/products`)
        .send({ ...rest, price: "foo" });
      expect(invalidRes.status).toEqual(400);
      expect(invalidRes.body.message).toEqual(
        "Price must be an integer greater than 0."
      );
    });

    it("returns a 400 if 'description' is missing or invalid", async () => {
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

    it("returns a 400 if 'stock' is missing or invalid", async () => {
      const { stock, ...rest } = mockProduct({ category: "electronics" });
      const missingRes = await req(app).post(`/products`).send(rest);
      expect(missingRes.status).toEqual(400);
      expect(missingRes.body.message).toEqual(
        "Stock must be an integer greater than or equal to 0."
      );
      const invalidRes = await req(app)
        .post(`/products`)
        .send({ ...rest, stock: -1 });
      expect(invalidRes.status).toEqual(400);
      expect(invalidRes.body.message).toEqual(
        "Stock must be an integer greater than or equal to 0."
      );
    });

    it("returns a 400 if 'category' is missing or invalid", async () => {
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

    it("returns a 400 if the category does not exist", async () => {
      const product = mockProduct();
      const res = await req(app)
        .post(`/products`)
        .send({ ...product, category: "does not exist" });
      expect(res.status).toEqual(400);
      expect(res.body.message).toEqual("Category does not exist.");
    });

    it("returns a 409 if the product already exists", async () => {
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
    it("updates a product", async () => {
      // Create a new product.
      const product = mockProduct({ price: 10_99, category: "electronics" });
      const createRes = await req(app).post(`/products`).send(product);
      productsToCleanup.push(createRes.body);
      // Check that the product was created successfully.
      expect(createRes.status).toEqual(201);
      expect(createRes.body.price).toEqual(10_99);
      // Update the product.
      const updateRes = await req(app)
        .patch(`/products/${createRes.body.id}`)
        .send({ price: 19_99 });
      // Check that the product was updated successfully.
      expect(updateRes.status).toEqual(200);
      expect(updateRes.body.price).toEqual(19_99);
      expect(updateRes.body.name).toEqual(product.name);
      expect(Object.keys(updateRes.body).sort()).toEqual(productFields.sort());
    });

    it("returns a 404 if the product does not exist", async () => {
      const res = await req(app).patch(`/products/1234`).send({ price: 19_99 });
      expect(res.status).toEqual(404);
      expect(res.body.message).toEqual("No product with id '1234' exists.");
    });

    it("returns a 400 if 'name' is invalid", async () => {
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

    it("returns a 400 if 'price' is invalid", async () => {
      const priceAsString = await req(app)
        .patch("/products/does-not-matter")
        .send({ price: "not a number" });
      expect(priceAsString.status).toEqual(400);
      expect(priceAsString.body.message).toEqual(
        "Price must be an integer greater than 0 or be omitted."
      );
      const negativePrice = await req(app)
        .patch("/products/does-not-matter")
        .send({ price: -1 });
      expect(negativePrice.status).toEqual(400);
      expect(negativePrice.body.message).toEqual(
        "Price must be an integer greater than 0 or be omitted."
      );
    });

    it("returns a 400 if 'stock' is invalid", async () => {
      const stockAsString = await req(app)
        .patch("/products/does-not-matter")
        .send({ stock: "not a number" });
      expect(stockAsString.status).toEqual(400);
      expect(stockAsString.body.message).toEqual(
        "Stock must be an integer greater than or equal to 0 or be omitted."
      );
      const negativeStock = await req(app)
        .patch("/products/does-not-matter")
        .send({ stock: -1 });
      expect(negativeStock.status).toEqual(400);
      expect(negativeStock.body.message).toEqual(
        "Stock must be an integer greater than or equal to 0 or be omitted."
      );
    });

    it("returns a 400 if 'category' is invalid", async () => {
      const categoryAsString = await req(app)
        .patch("/products/does-not-matter")
        .send({ category: 123 });
      expect(categoryAsString.status).toEqual(400);
      expect(categoryAsString.body.message).toEqual(
        "Category must be a string or be omitted."
      );
    });

    it("returns a 400 if 'description' is invalid", async () => {
      const descriptionAsNumber = await req(app)
        .patch("/products/does-not-matter")
        .send({ description: 123 });
      expect(descriptionAsNumber.status).toEqual(400);
      expect(descriptionAsNumber.body.message).toEqual(
        "Description must be a string or be omitted."
      );
    });

    it("returns a 409 if a product with the same name already exists", async () => {
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

  describe("GET /products/by-price", () => {
    it("gets products within a price range", async () => {
      const minPrice = 10_00;
      const maxPrice = 50_00;
      const res = await req(app).get(
        `/products/by-price?minPrice=${minPrice}&maxPrice=${maxPrice}`
      );
      expect(res.status).toEqual(200);
      expect(res.body.results.length).toBeGreaterThan(0);
      for (const product of res.body.results) {
        expect(product.price).toBeGreaterThanOrEqual(minPrice);
        expect(product.price).toBeLessThanOrEqual(maxPrice);
        expect(Object.keys(product).sort()).toEqual(
          ["name", "category", "id", "description", "price", "stock"].sort()
        );
      }
    });

    it("returns an empty array if no products are within the price range", async () => {
      const minPrice = 1;
      const maxPrice = 2;
      const res = await req(app).get(
        `/products/by-price?minPrice=${minPrice}&maxPrice=${maxPrice}`
      );
      expect(res.status).toEqual(200);
      expect(res.body.results.length).toEqual(0);
    });
  });
});
