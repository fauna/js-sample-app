import req from "supertest";
import app from "../src/app";
import { faunaClient } from "../src/fauna/fauna-client";
import { fql } from "fauna";

describe("Products", () => {

  const products: Record<string, Array<{ name: string, price: number, description: string, stock: number}>> = {
    electronics: [
      { name: "iPhone", price: 100_00, description: "Apple's flagship phone", stock: 100 },
      { name: "Drone", price: 90_00, description: "Fly and let people wonder if you're filming them!", stock: 0 },
      { name: "Signature Box III", price: 3000_00, description: "Hooli's latest box!", stock: 1000},
      { name: "Rapsberry Pi", price: 30_00, description: "A tiny computer", stock: 5 },
    ],
    books: [
      { name: "For Whom the Bell Tolls", price: 8_99, description: "A book by Ernest Hemingway", stock: 10 },
      { name: "Getting Started with Fauna", price: 19_99, description: "A book by Fauna, Inc.", stock: 0 },
    ],
    movies: [
      { name: "The Godfather", price: 12_99, description: "A movie by Francis Ford Coppola", stock: 10 },
      { name: "The Godfather II", price: 12_99, description: "A movie by Francis Ford Coppola", stock: 10 },
      { name: "The Godfather III", price: 12_99, description: "A movie by Francis Ford Coppola", stock: 10 },
    ],
  }

  beforeAll(async () => {
    try {
    const categoryCreates = [];
    const productCreates = [];
    for (const category of Object.keys(products)) {
      categoryCreates.push(faunaClient.query(fql`
         Category.byName(${category}).first() ??
            Category.create({ name: ${category}, description: "Bargain #{${category}}!" })
      `));
    }
    await Promise.all(categoryCreates);
    for (const [category, categoryProducts] of Object.entries(products)) {
      for (const product of categoryProducts) {
        productCreates.push(faunaClient.query(fql`
         Product.byName(${product.name}).first() ??
            Product.create({
              name: ${product.name},
              price: ${product.price},
              description: ${product.description},
              stock: ${product.stock},
              category: Category.byName(${category}).first()!,
            })
        `));
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
      const res = await req(app).get(`/products?category=electronics`);
        const expectedProducts = new Set(products.electronics.map(p => (JSON.stringify({ ...p, category: "electronics" }))));
      expect(res.status).toEqual(200);
      expect(res.body.nextToken).toBeUndefined();
      for (const product of res.body.results) {
        expect(expectedProducts.has(JSON.stringify(product))).toBe(true);
      }
      expect(res.body.results.length).toEqual(expectedProducts.size);
    });
  });
});
