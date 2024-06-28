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
        // Get the category by name. We can use .first() here because we know that the category
        // name is unique.
        let category = Category.byName(${category}).first()
        // If the category does not exist, abort the transaction.
        if (category == null) abort("Category does not exist.")
        // Create the product with the given values.
        let product: Any = Product.create({
          name: ${name},
          price: ${price},
          stock: ${stock},
          description: ${description},
          category: category
        })
        // Pick out the name, price, description, stock, and category fields from the created product.
        product { name, price, description, stock, category: .category!.name }
      `
    );

    return res.status(201).send(product);
  } catch (error: any) {
    // Handle errors returned by Fauna here.
    if (error instanceof AbortError) {
      // Handle any aborts we've defined in our FQl as 400s.
      return res.status(400).send({ message: error.abort });
    }
    if (error instanceof ServiceError) {
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

/**
 * Update a product.
 * @route {PATCH} /products/:name
 * @bodyparam price
 * @bodyparam description
 * @bodyparam stock
 * @bodyparam category
 * @returns Product
 */
router.patch("/products/:name", async (req: Request, res: Response) => {
  const { name } = req.params;
  const { price, description, stock, category, name: bodyName } = req.body;

  if (price && (typeof price !== "number" || price <= 0)) {
    return res.status(400).json({
      message: "Price must be a number greater than 0 or be omitted.",
    });
  } else if (description && typeof description !== "string") {
    return res.status(400).json({
      message: "Description must be a string or be omitted.",
    });
  } else if (stock && (typeof stock !== "number" || stock < 0)) {
    return res.status(400).json({
      message:
        "Stock must be a number greater than or equal to 0 or be omitted.",
    });
  } else if (category && typeof category !== "string") {
    return res.status(400).json({
      message: "Category must be a string or be omitted.",
    });
  } else if (bodyName !== undefined && bodyName !== name) {
    return res.status(400).json({
      message: "Name cannot be updated. Please create a new product instead.",
    });
  }

  try {
    const { data: product } = await faunaClient.query<Product>(
      fql`
        // Get the product by name. We can use .first() here because we know that the product
        // name is unique.
        let product: Any = Product.byName(${name}).first()
        // If the product does not exist, abort the transaction
        if (product == null) abort("Product does not exist.")
        // Get the category by name. We can use .first() here because we know that the category
        // name is unique.
        let category = Category.byName(${category ?? ""}).first()
        // If a category was provided and it does not exist, abort the transaction.
        if (${!!category} && category == null) abort("Category does not exist.")
        let fields = ${{ price, stock, description }}
        if (category != null) {
          // If a category was provided, update the product with the new category document as well as
          // any other fields that were provided.
          product!.update(
            Object.assign(fields, { category: category })
          ) { name, price, description, stock, category: .category!.name }
        } else {
          // If no category was provided, update the product with the fields that were provided.
          product!.update(fields) { name, price, description, stock, category: .category!.name }
        }
      `
    );

    return res.send(product);
  } catch (error: any) {
    // Handle errors returned by Fauna here.
    if (error instanceof AbortError) {
      // Handle any aborts we've defined in our FQl as 400s.
      return res.status(400).send({ message: error.abort });
    }

    return res
      .status(500)
      .send({ message: "The request failed unexpectedly.", error });
  }
});

export default router;
