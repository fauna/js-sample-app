import { Request, Response, Router, NextFunction } from "express";
import { faunaClient } from "../../fauna/fauna-client";
import {
  AbortError,
  fql,
  ServiceError,
  type DocumentT,
  type Page,
} from "fauna";
import { Product } from "./products.model";
import { PaginatedRequest } from "../../types";
import { docTo } from "../../fauna/util";
import {
  validateGetProducts,
  validateProductCreate,
  validateProductUpdate,
} from "../../middleware/products";
import { errorHandler } from "../../middleware/errors";

const router = Router();

/**
 * Get a page of products. If a category query parameter is provided, return only products in that category.
 * If no category query parameter is provided, return all products. The results are paginated with a default
 * page size of 10. If a nextToken is provided, return the next page of products corresponding to that token.
 * @route {GET} /products
 * @queryparam category
 * @queryparam nextToken
 * @queryparam pageSize
 * @returns { results: Product[], nextToken: string }
 */
router.get(
  "/products",
  validateGetProducts,
  async (
    req: PaginatedRequest<{ category?: string }>,
    res: Response,
    next: NextFunction
  ) => {
    // Extract the category query parameter from the request.
    const { category, nextToken = undefined, pageSize = 10 } = req.query;

    // Convert the pageSize query parameter to a number. Page size has
    // already been validated in the validateGetProducts middleware.
    const pageSizeNumber = Number(pageSize);

    try {
      // Define an FQL query fragment that will return a page of products. This query
      // fragment will either return all products sorted by category or all products in a specific
      // category depending on whether the category query parameter is provided. This will later
      // be embedded in a larger query.
      const queryFragment =
        category === undefined
          ? // If the category query parameter is not provided, return all products sorted by category
            // using the sortedByCategory index.
            fql`Product.sortedByCategory().pageSize(${pageSizeNumber})`
          : // If the category query parameter is provided, return all products in that category
            // using the byCategory index.
            fql`Product.byCategory(Category.byName(${category}).first()).pageSize(${pageSizeNumber})`;

      // Define the main query. This query will return a page of products using the query fragment
      // defined above.
      const query = fql`
        ${queryFragment}
        // Return only the fields we want to display to the user
        // by mapping over the data returned by the index and returning a
        // new object with the desired fields.
        .map(product => {
          let product: Any = product
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
      `;

      // Note that the query return type does not need to be wrapped in a DocumentT type because
      // we are picking out the fields we want to return in the query itself as opposed to
      // returning the entire document.
      const { data: page } = await faunaClient.query<Page<Product>>(
        // If a nextToken is provided, use the Set.paginate function to get the next page of products.
        // Otherwise, use the query defined above which will fetch the first page of products.
        nextToken ? fql`Set.paginate(${nextToken})` : query
      );

      // Return the page of products and the next token to the user. The next token can be passed back to
      // the server to retrieve the next page of products.
      return res
        .status(200)
        .send({ results: page.data, nextToken: page.after });
    } catch (error: any) {
      // Pass errors to the generic error-handling middleware.
      next(error);
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
  async (req: Request, res: Response, next: NextFunction) => {
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
          let product: Any = Product.create(args)
          // Use projection to only return the fields you need.
          product {
            id,
            name,
            price,
            description,
            stock,
            category {
              id,
              name,
              description
            }
          }
        `
      );

      // Return the product, stripping out any unnecessary fields.
      return res.status(201).send(docTo<Product>(product));
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
      // Pass other errors to the generic error-handling middleware.
      next(error);
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
  async (req: Request, res: Response, next: NextFunction) => {
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
          // Use projection to only return the fields you need.
          product {
            id,
            name,
            price,
            description,
            stock,
            category {
              id,
              name,
              description
            }
          }
        `
      );

      // Return the updated product, stripping out any unnecessary fields.
      return res.send(docTo<Product>(product));
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
      // Pass other errors to the generic error-handling middleware.
      next(error);
    }
  }
);

/**
 * Find products by price and stock.
 * @route {GET} /products/by-price
 * @queryparam minPrice
 * @queryparam maxPrice
 */
router.get(
  "/products/by-price",
  async (
    req: PaginatedRequest<{ minPrice?: string; maxPrice?: string }>,
    res: Response,
    next: NextFunction
  ) => {
    // Extract the minPrice, maxPrice, minStock, and maxStock query parameters from the request.
    const {
      minPrice = 0,
      maxPrice = 10000,
      pageSize = 25,
      nextToken = undefined,
    } = req.query;

    try {
      // This is an example of a covered query.  A covered query is a query where all fields
      // returned are indexed fields. In this case, we are querying the Product collection
      // for products with a price between minPrice and maxPrice. We are also limiting the
      // number of results returned to the limit parameter. The query is covered because
      // all fields returned are indexed fields. In this case, the fields returned are
      // `name`, `description`, `price`, and `stock` are all indexed fields.
      // Covered queries are typically faster and less expensive than uncovered queries,
      // which require document reads.
      // Learn more about covered queries here: https://docs.fauna.com/fauna/current/learn/data_model/indexes#covered-queries
      const query = fql`
        Product.sortedByPriceLowToHigh({ from: ${Number(
          minPrice
        )}, to: ${Number(maxPrice)}})
        .pageSize(${Number(pageSize)}) {
          id,
          name,
          price,
          description,
          stock,
          category {
            id,
            name,
            description
          }
        }
      `;

      const { data: products } = await faunaClient.query<Page<Product>>(
        // If a nextToken is provided, use the Set.paginate function to get the next page of products.
        // Otherwise, use the query defined above which will fetch the first page of products.
        nextToken ? fql`Set.paginate(${nextToken as string})` : query, { typecheck: false }
      );

      // Return the page of products and the next token to the user. The next token can be passed back to
      // the server to retrieve the next page of products.
      return res
        .status(200)
        .send({ results: products.data, nextToken: products.after });
    } catch (error: any) {
      // Pass errors to the generic error-handling middleware.
      next(error);
    }
  }
);

// Use the middleware to handle 401 and other generic errors.
router.use(errorHandler);

export default router;
