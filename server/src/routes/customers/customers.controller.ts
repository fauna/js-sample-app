import { NullDocument, ServiceError, fql } from "fauna";
import { faunaClient } from "../../fauna/fauna-client";
import { Request, Response, Router } from "express";
import { getCustomer, createCustomer } from "./customers.service";

const router = Router();

/**
 * Get a customer
 * @route {GET} /customer/:id
 * @param id string
 * @returns Customer
 */
router.get("/customers/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data: customer } = await getCustomer(id);

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
  } catch (error) {
    return res.status(500).send({ reason: "The request failed unexpectedly." });
  }
});

/**
 * Create a customer
 * @route {POST} /customer
 * @bodyparam name
 * @bodyparam email
 * @returns Customer
 */
router.post("/customers", async (req: Request, res: Response) => {
  try {
    const { name, email, address } = req.body;
    const { data: customer } = await createCustomer({ name, email, address });

    return res.status(201).send({ name: customer.name, email: customer.email });
  } catch (error) {
    // Handle errors returned by Fauna here.
    if (error instanceof ServiceError) {
      // We have a single unique constraint on the email field.
      if (error.code === "constraint_failure") {
        return res
          .status(409)
          .send({ reason: "A customer with that email already exists." });
      }
    }

    return res.status(500).send({ reason: "The request failed unexpectedly." });
  }
});

/**
 * Create or Return Cart
 * @route {POST} /customer/:id/cart
 * @param id string
 * @returns Cart
 */
router.post("/customers/:id/cart", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { data } = await faunaClient.query(fql`fetchOrCreateCustomerCart(${id})`);
    return res.status(200).send({ data });
  } catch (error: any) {
    console.log(error);
    // If the customer does not exist, return a 404.
    if (error.code == "document_not_found") {
      return res
        .status(404)
        .send({ reason: `No customer with id '${id}'` });
    }
    return res.status(500).send({ reason: "The request failed", error });
  }
});

export default router;
