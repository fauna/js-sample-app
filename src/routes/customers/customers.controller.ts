import { fql, ServiceError, type DocumentT } from "fauna";
import { faunaClient } from "../../fauna/fauna-client";
import { Request, Response, Router, NextFunction } from "express";
import { Customer } from "./customers.model";
import { docTo } from "../../fauna/util";
import {
  validateCustomerCreate,
  validateCustomerUpdate,
} from "../../middleware/customers";
import { errorHandler } from "../../middleware/errors";

const router = Router();

// Project Customer document fields for consistent responses.
const customerResponse = fql`
  customer {
    id,
    name,
    email,
    address
  }
`;

/**
 * Get a customer by id.
 * @route {GET} /customers/:id
 * @param id
 * @returns Customer
 */
router.get(
  "/customers/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    // Extract the id from the request parameters.
    const { id } = req.params;

    try {
      // Connect to fauna using the faunaClient. The query method accepts
      // an FQL query as a parameter as well as an optional return type. In this
      // case, we are using the DocumentT type to specify that the query will return
      // a single document representing a Customer.
      const { data: customer } = await faunaClient.query<DocumentT<Customer>>(
        // Get the Customer document by id, using the ! operator to assert that the document exists.
        // If the document does not exist, Fauna will throw a document_not_found error.
        // Use projection to only return the fields you need.
        fql`let customer: Any = Customer.byId(${id})!
          // Return projected fields for the response.
          ${customerResponse}
        `
      );

      // Return the customer, stripping out any unnecessary fields.
      return res.status(200).send(docTo<Customer>(customer));
    } catch (error: unknown) {
      // Handle errors returned by Fauna here. A ServiceError represents an
      // error that occurred within Fauna.
      if (error instanceof ServiceError) {
        if (error.code === "invalid_argument") {
          // If the id is not valid, return a 400.
          return res
            .status(400)
            .send({ message: `Invalid id '${id}' provided.` });
        } else if (error.code === "document_not_found") {
          // If the document does not exist, return a 404.
          return res
            .status(404)
            .send({ message: `No customer with id '${id}' exists.` });
        }
      }
      // Pass other errors to the generic error-handling middleware.
      next(error);
    }
  }
);

/**
 * Create a new customer.
 * @route {POST} /customers
 * @bodyparam name
 * @bodyparam email
 * @bodyparam address
 * @returns Customer
 */
router.post(
  "/customers",
  validateCustomerCreate,
  async (req: Request, res: Response, next: NextFunction) => {
    // Extract fields from the request body.
    const { name, email, address } = req.body;

    try {
      // Connect to fauna using the faunaClient. The query method accepts
      // an FQL query as a parameter as well as an optional return type. In this
      // case, we are using the DocumentT type to specify that the query will return
      // a single document representing a Customer.
      const { data: customer } = await faunaClient.query<DocumentT<Customer>>(
        // Create a new Customer document with the provided fields.
        // Use projection to only return the fields you need.
        fql`let customer: Any = Customer.create(${{ name, email, address }})
          // Return projected fields for the response.
          ${customerResponse}
        `
      );

      // Return the created customer, stripping out any unnecessary fields.
      return res.status(201).send(docTo<Customer>(customer));
    } catch (error: any) {
      // Handle errors returned by Fauna here. A ServiceError represents an
      // error that occurred within Fauna.
      if (error instanceof ServiceError) {
        if (error.code === "invalid_query") {
          // If we fail due to an invalid_query error, the request body is likely invalid.
          // This could be due to missing fields, or fields of the wrong type.
          return res.status(400).send({
            message:
              "Unable to create customer, please check that the fields in your request body are valid.",
          });
        } else if (error.code === "constraint_failure") {
          // We have a single unique constraint on the email field.
          return res
            .status(409)
            .send({ message: "A customer with that email already exists." });
        }
      }
      // Pass other errors to the generic error-handling middleware.
      next(error);
    }
  }
);

/**
 * Update an existing customer.
 * @route {PATCH} /customers/:id
 * @param id
 * @bodyparam name
 * @bodyparam email
 * @bodyparam address
 * @returns Customer
 */
router.patch(
  "/customers/:id",
  validateCustomerUpdate,
  async (req: Request, res: Response, next: NextFunction) => {
    // Extract the id from the request parameters.
    const { id } = req.params;
    // Extract fields from the request body.
    const { name, email, address } = req.body;

    try {
      // Connect to fauna using the faunaClient. The query method accepts
      // an FQL query as a parameter as well as an optional return type. In this
      // case, we are using the DocumentT type to specify that the query will return
      // a single document representing a Customer.
      const { data: customer } = await faunaClient.query<DocumentT<Customer>>(
        // Get the Customer document by id, using the ! operator to assert that the document exists.
        // If the document does not exist, Fauna will throw a document_not_found error.
        // Use projection to only return the fields you need.
        fql`let customer: Any = Customer.byId(${id})!.update(${{ name, email, address }})
          // Return projected fields for the response.
          ${customerResponse}
        `
      );

      // Return the updated customer, stripping out any unnecessary fields.
      return res.status(200).send(docTo<Customer>(customer));
    } catch (error: any) {
      // Handle errors returned by Fauna here. A ServiceError represents an
      // error that occurred within Fauna.
      if (error instanceof ServiceError) {
        if (error.code === "document_not_found") {
          // If the customer does not exist, return a 404.
          return res
            .status(404)
            .send({ message: `No customer with id '${id}' exists.` });
        } else if (error.code === "constraint_failure") {
          // If there is already a customer with that email, return a 409.
          return res
            .status(409)
            .send({ message: "A customer with that email already exists." });
        }
      }
      // Pass other errors to the generic error-handling middleware.
      next(error);
    }
  }
);

// Use the middleware to handle 401 and other generic errors.
router.use(errorHandler);

export default router;
