import { Request, Response, Router } from "express";
import { NullDocument } from "fauna";
import { getCustomer } from "./customer.service";

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

    return res.status(200).send({ ...customer });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ reason: "The request failed unexpectedly." });
  }
});

export default router;
