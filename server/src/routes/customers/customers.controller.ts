import { fql, NullDocument, ServiceError } from "fauna";
import { faunaClient } from "../../fauna/fauna-client";
import { Request, Response, Router } from "express";
import { Customer } from "./customers.model";

const router = Router();

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

    return res.status(200).send({
      name: customer.name,
      email: customer.email,
      orders: customer.orders,
    });
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

    return res.status(201).send({ name: customer.name, email: customer.email });
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

export default router;
