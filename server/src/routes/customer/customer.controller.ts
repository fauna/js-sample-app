import { NullDocument, ServiceError } from "fauna";
import { Request, Response, Router } from "express";
import { getCustomer, createCustomer } from "./customer.service";

const router = Router();

/**
 * Get customer
 * @route {GET} /customer/:id
 * @param id string
 * @returns Customer
 */
router.get("/customer/:id", async (req: Request, res: Response) => {
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
 * Create customer
 * @route {PUT} /customer
 * @bodyparam name
 * @bodyparam email
 * @returns Customer
 */
router.put("/customer", async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;
    const { data: customer } = await createCustomer({ name, email });

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

export default router;
