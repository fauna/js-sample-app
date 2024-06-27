
import { Customer } from "../customers/customers.model";
import { fql } from "fauna";
import { faunaClient } from "../../fauna/fauna-client";
import { Request, Response, Router } from "express";

const router = Router();

/**
 * Get a customer's cart
 * @route {GET} /customer/:id/cart
 * @param id string
 * @returns Cart
 * @returns 404
*/
router.get("/customers/:id/cart", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { data } = await faunaClient.query<Customer>(fql`
      let customer = Customer.byId(${id})
      customer!.cart {
        total,
        status,
        items,
        createdAt
      }
    `);
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