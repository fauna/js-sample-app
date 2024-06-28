import { Request, Response, Router } from "express";
import { faunaClient } from "../../fauna/fauna-client";
import { AbortError, fql, ServiceError } from "fauna";
import { Product } from "./products.model";

const router = Router();

router.get("/products", async (req: Request, res: Response) => {
  const { category } = req.query;
  if (category !== undefined && typeof category !== "string") {
    return res.status(400).json({
      message: "Category must be a string or be omitted.",
    });
  }

  try {
    const query =
      category === undefined
        ? fql`Product.sortedByCategory()`
        : fql`Product.byCategory(Category.byName(${category}).first())`;

    const products = await faunaClient.query<{
      data: Product[];
      after: string;
    }>(fql`
      ${query}
      // just return the Product data we want to display to the user
      .map(product => {
        let category: Any = product.category
       {
         name: product.name,
         price: product.price,
         description: product.description,
         stock: product.stock,
         category: category?.name,
       }
      })
    `);
    return res.json({
      results: products.data.data,
      nextToken: products.data.after,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

/**
 * Create a product.
 * @route {POST} /products
 * @bodyparam name
 * @bodyparam price
 * @bodyparam description
 * @bodyparam stock
 * @bodyparam category
 * @returns Product
 */
router.post("/products", async (req: Request, res: Response) => {
  const { name, price, description, stock, category } = req.body;

  if (typeof name !== "string" || name.length === 0) {
    return res.status(400).json({
      message: "Name must be a non-empty string.",
    });
  } else if (typeof price !== "number" || price <= 0) {
    return res.status(400).json({
      message: "Price must be a number greater than 0.",
    });
  } else if (typeof description !== "string" || description.length === 0) {
    return res.status(400).json({
      message: "Description must be a non-empty string.",
    });
  } else if (typeof stock !== "number" || stock < 0) {
    return res.status(400).json({
      message: "Stock must be a number greater than or equal to 0.",
    });
  } else if (typeof category !== "string" || category.length === 0) {
    return res.status(400).json({
      message: "Category must be a non-empty string.",
    });
  }

  try {
    const { data: product } = await faunaClient.query<Product>(
      fql`
        let category = Category.byName(${category}).first()
        if (category == null) abort("Category does not exist.")
        Product.create({
          name: ${name},
          price: ${price},
          stock: ${stock},
          description: ${description},
          category: category
        }) { name, price, description, stock, category: category!.name }
      `
    );

    return res.status(201).send(product);
  } catch (error: any) {
    // Handle errors returned by Fauna here.
    if (error instanceof ServiceError) {
      // Handle any aborts we've defined in our FQl as 400s.
      if (error instanceof AbortError) {
        return res.status(400).send({ message: error.abort });
      }
      // We have a unique constraint on product name.
      if (error.code === "constraint_failure") {
        return res
          .status(409)
          .send({ message: "A product with that name already exists." });
      }
    }

    return res
      .status(500)
      .send({ message: "The request failed unexpectedly.", error });
  }
});

export default router;
