import { fql, NullDocument, ServiceError, type DocumentT } from "fauna";
import { faunaClient } from "../../fauna/fauna-client";
import { Request, Response, Router } from "express";
import { Customer } from "./customers.model";

const router = Router();
const toOutputModel = (customer: DocumentT<Customer>) => {
  const { id, name, email, cart, address, orders } = customer;
  return { id, name, email, cart, address, orders };
};

/**
 * Get a customer.
 * @route {GET} /customers/:id
 * @param id string
 * @returns Customer
 */
router.get("/customers/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data: customer } = await faunaClient.query<Customer>(
      fql`Customer.byId(${id})`
    );

    // If the customer does not exist, return a 404.
    if (customer instanceof NullDocument) {
      return res
        .status(404)
        .send({ reason: `No customer with id '${id}' exists.` });
    }

    return res.status(200).send(toOutputModel(customer));
  } catch (error: any) {
    return res
      .status(500)
      .send({ reason: "The request failed unexpectedly.", error });
  }
});

/**
 * Create a customer.
 * @route {POST} /customers
 * @bodyparam name
 * @bodyparam email
 * @returns Customer
 */
router.post("/customers", async (req: Request, res: Response) => {
  const { name, email, address } = req.body;

  try {
    const { data: customer } = await faunaClient.query<Customer>(
      fql`Customer.create(${{ name, email, address }})`
    );

    return res.status(201).send(toOutputModel(customer));
  } catch (error: any) {
    // Handle errors returned by Fauna here.
    if (error instanceof ServiceError) {
      // We have a single unique constraint on the email field.
      if (error.code === "constraint_failure") {
        return res
          .status(409)
          .send({ reason: "A customer with that email already exists." });
      }
    }

    return res
      .status(500)
      .send({ reason: "The request failed unexpectedly.", error });
  }
});

/**
 * Update a customer.
 * @route {PATCH} /customers/:id
 * @param id string
 * @bodyparam name
 * @bodyparam email
 * @bodyparam address
 * @returns Customer
 */
router.patch("/customers/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, address } = req.body;

  try {
    const { data: customer } = await faunaClient.query<DocumentT<Customer>>(
      fql`Customer.byId(${id})!.update(${{ name, email, address }})`
    );

    return res.status(200).send(toOutputModel(customer));
  } catch (error: any) {
    // Handle errors returned by Fauna here.
    if (error instanceof ServiceError) {
      // If the customer does not exist, return a 404.
      if (error.code === "document_not_found") {
        return res
          .status(404)
          .send({ reason: `No customer with id '${id}' exists.` });
      }
      // If there is already a customer with that email, return a 409.
      if (error.code === "constraint_failure") {
        return res
          .status(409)
          .send({ reason: "A customer with that email already exists." });
      }
    }

    return res
      .status(500)
      .send({ reason: "The request failed unexpectedly.", error });
  }
});

export default router;
