import { Request, Response, Router } from "express";
import { faunaClient } from "../../fauna/fauna-client";
import { AbortError, fql, ServiceError, type DocumentT, Page } from "fauna";
import { Product } from "./products.model";
import { removeInternalFields } from "../../fauna/util";
import {
  validateGetProducts,
  validateProductCreate,
  validateProductUpdate,
} from "../../middlewares/products";

const router = Router();

/**
 * Get a page of products. If a category query parameter is provided, return only products in that category.
 * @route {GET} /products
 * @queryparam category
 * @returns { results: Product[], nextToken: string }
 */
router.get(
  "/products",
  validateGetProducts,
  async (req: Request, res: Response) => {
    // Extract the category query parameter from the request.
    const { category } = req.query;
    // Cast the category query parameter to a string or undefined. We have already validated
    // the category query parameter in the validateGetProducts middleware.
    const categoryString = category as string | undefined;

    try {
      // Define an FQL query fragment that will return a page of products. We use the fql template
      // tag to define the query fragment. The fql template tag is a tagged template literal that
      // allows us to write FQL queries using a JavaScript template string. We will use
      // this que ry fragment later in our main query.
      const query =
        categoryString === undefined
          ? // If the category query parameter is not provided, return all products sorted by category
            // using the sortedByCategory index.
            fql`Product.sortedByCategory()`
          : // If the category query parameter is provided, return all products in that category
            // using the byCategory index.
            fql`Product.byCategory(Category.byName(${categoryString}).first())`;

      // Note that the query return type does not need to be wrapped in a DocumentT type because
      // we are picking out the fields we want to return in the map function below as opposed to
      // returning the entire document.
      const { data: page } = await faunaClient.query<Page<Product>>(fql`
        ${query}
        // Return just the Product data we want to display to the user
        // by mapping over the data and returning a new object with the desired fields.
        .map(product => {
          let category: Any = product.category
          {
            id: product.id,
            name: product.name,
            price: product.price,
            description: product.description,
            stock: product.stock,
            category: { id: category.id, name: category.name, description: category.description },
          }
        })
      `);

      // Return the page of products and the next token to the user. The next token can be passed back to
      // the server to retrieve the next page of products.
      return res.json({ results: page.data, nextToken: page.after });
    } catch (error: any) {
      // Return a generic 500 if we encounter an unexpected error.
      return res.status(500).send({ message: "Internal Server Error" });
    }
  }
);

/**
 * Create a new product.
 * @route {POST} /products
 * @bodyparam name
 * @bodyparam description
 * @bodyparam price
 * @bodyparam stock
 * @bodyparam category
 * @returns Product
 */
router.post(
  "/products",
  validateProductCreate,
  async (req: Request, res: Response) => {
    // Extract fields from the request body.
    const { name, price, description, stock, category } = req.body;

    try {
      // Connect to fauna using the faunaClient. The query method accepts
      // an FQL query as a parameter as well as an optional return type. In this
      // case, we are using the DocumentT type to specify that the query will return
      // a single document representing a Product.
      const { data: product } = await faunaClient.query<DocumentT<Product>>(
        // Using the abort function we can throw an error if a condition is not met. In this case,
        // we check if the category exists before creating the product. If the category does not exist,
        // fauna will throw an AbortError which we can handle in our catch block.
        fql`
          // Get the category by name. We can use .first() here because we know that the category
          // name is unique.
          let category = Category.byName(${category}).first()
          // If the category does not exist, abort the transaction.
          if (category == null) abort("Category does not exist.")
          // Create the product with the given values.
          let args = { name: ${name}, price: ${price}, stock: ${stock}, description: ${description}, category: category }
          Product.create(args)
        `
      );

      // Return the product, stripping out any unnecessary fields.
      return res.status(201).send(removeInternalFields(product));
    } catch (error: any) {
      // Handle errors returned by Fauna here. AbortErrors are thrown when we use the
      // abort function in our FQL query.
      if (error instanceof AbortError) {
        // Handle any aborts we've defined in our FQl as 400s.
        return res.status(400).send({ message: error.abort });
      }
      // A ServiceError represents an error that occurred within Fauna.
      if (error instanceof ServiceError) {
        if (error.code === "invalid_query") {
          // If we fail due to an invalid_query error, the request body is likely invalid.
          // This could be due to missing fields, or fields of the wrong type.
          return res.status(400).send({
            message:
              "Unable to create customer, please check that the fields in your request body are valid.",
          });
        } else if (error.code === "constraint_failure") {
          // We have a unique constraint on product name, throw a 409 if we violate that constraint.
          return res
            .status(409)
            .send({ message: "A product with that name already exists." });
        }
      }

      // Return a generic 500 if we encounter an unexpected error.
      return res.status(500).send({ message: "Internal Server Error" });
    }
  }
);

/**
 * Update an existing product.
 * @route {PATCH} /products/:id
 * @param id
 * @bodyparam price
 * @bodyparam description
 * @bodyparam stock
 * @bodyparam category
 * @returns Product
 */
router.patch(
  "/products/:id",
  validateProductUpdate,
  async (req: Request, res: Response) => {
    // Extract the id from the request parameters.
    const { id } = req.params;
    // Extract fields from the request body.
    const { price, description, stock, category, name } = req.body;

    try {
      // Connect to fauna using the faunaClient. The query method accepts
      // an FQL query as a parameter as well as an optional return type. In this
      // case, we are using the DocumentT type to specify that the query will return
      // a single document representing a Product.
      const { data: product } = await faunaClient.query<DocumentT<Product>>(
        fql`
          // Get the product by id, using the ! operator to assert that the product exists.
          // If it does not exist Fauna will throw a document_not_found error.
          let product: Any = Product.byId(${id})!
          // Get the category by name. We can use .first() here because we know that the category
          // name is unique.
          let category = Category.byName(${category ?? ""}).first()
          // If a category was provided and it does not exist, abort the transaction.
          if (${!!category} && category == null) abort("Category does not exist.")
          let fields = ${{ name, price, stock, description }}
          if (category != null) {
            // If a category was provided, update the product with the new category document as well as
            // any other fields that were provided.
            product!.update(Object.assign(fields, { category: category }))
          } else {
            // If no category was provided, update the product with the fields that were provided.
            product!.update(fields)
          }
        `
      );

      // Return the updated product, stripping out any unnecessary fields.
      return res.send(removeInternalFields(product));
    } catch (error: any) {
      // Handle errors returned by Fauna here. AbortErrors are thrown when we use the
      // abort function in our FQL query.
      if (error instanceof AbortError) {
        // Handle any aborts we've defined in our FQl as 400s.
        return res.status(400).send({ message: error.abort });
      }
      // A ServiceError represents an error that occurred within Fauna.
      if (error instanceof ServiceError) {
        if (error.code === "document_not_found") {
          // If the product does not exist, return a 404.
          return res
            .status(404)
            .send({ message: `No product with id '${id}' exists.` });
        } else if (error.code === "constraint_failure") {
          // If there is already a product with that name, return a 409.
          return res
            .status(409)
            .send({ message: "A product with that name already exists." });
        }
      }

      // Return a generic 500 if we encounter an unexpected error.
      return res.status(500).send({ message: "Internal Server Error" });
    }
  }
);

export default router;
