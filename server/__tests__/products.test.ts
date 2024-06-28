import req from "supertest";
import app from "../src/app";
import { faunaClient } from "../src/fauna/fauna-client";
import { fql } from "fauna";
import { mockProduct } from "./mocks";

describe("Products", () => {
  const products: Record<
    string,
    Array<{ name: string; price: number; description: string; stock: number }>
  > = {
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

  beforeAll(async () => {
    try {
      const categoryCreates = [];
      const productCreates = [];
      for (const category of Object.keys(products)) {
        categoryCreates.push(
          faunaClient.query(fql`
         Category.byName(${category}).first() ??
            Category.create({ name: ${category}, description: "Bargain #{${category}}!" })
      `)
        );
      }
      await Promise.all(categoryCreates);
      for (const [category, categoryProducts] of Object.entries(products)) {
        for (const product of categoryProducts) {
          productCreates.push(
            faunaClient.query(fql`
         Product.byName(${product.name}).first() ??
            Product.create({
              name: ${product.name},
              price: ${product.price},
              description: ${product.description},
              stock: ${product.stock},
              category: Category.byName(${category}).first()!,
            })
        `)
          );
        }
      }
      // create all the categories
      // now create all the products
      await Promise.all(productCreates);
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  afterAll(async () => {
    // Clean up our connection to Fauna.
    faunaClient.close();
  });

  describe("GET /products", () => {
    it("Gets all products", async () => {
      const res = await req(app).get(`/products`);
      expect(res.status).toEqual(200);
    });

    it("Gets products for a specific category", async () => {
      const res = await req(app).get(`/products?category=books`);
      const expectedProducts = new Set(
        products.books.map((p) => JSON.stringify({ ...p, category: "books" }))
      );
      expect(res.status).toEqual(200);
      expect(res.body.nextToken).toBeUndefined();
      for (const product of res.body.results) {
        expect(expectedProducts.has(JSON.stringify(product))).toBe(true);
      }
      expect(res.body.results.length).toEqual(expectedProducts.size);
    });
  });

  describe("POST /products", () => {
    it("Creates a product", async () => {
      const product = mockProduct({ category: "electronics" });
      const res = await req(app).post(`/products`).send(product);
      expect(res.status).toEqual(201);
      expect(res.body.name).toEqual(product.name);
      expect(res.body.price).toEqual(product.price);
      expect(res.body.description).toEqual(product.description);
      expect(res.body.stock).toEqual(product.stock);
      expect(res.body.category).toEqual("electronics");
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
      const product = {
        name: "iPhone",
        price: 100_00,
        description: "Apple's flagship phone",
        stock: 100,
        category: "electronics",
      };
      const res = await req(app)
        .post(`/products`)
        .send({ ...product });
      expect(res.status).toEqual(409);
      expect(res.body.message).toEqual(
        "A product with that name already exists."
      );
    });
  });
});
