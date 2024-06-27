import { fql } from "fauna";
import { Request, Response, Router } from "express";
import { faunaClient } from "../../fauna/fauna-client";

const router = Router();

/**
 * Get a customer's cart. Create one if it does not exist.
 * @route {POST} /customer/:id/cart
 * @param id string
 * @returns Order
 */
router.post("/customers/:id/cart", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { data: cart } = await faunaClient.query(fql`getOrCreateCart(${id})`);

    return res.status(200).send(cart);
  } catch (error: any) {
    // We abort our UDF if the customer does not exist.
    if (error.abort) {
      return res.status(400).send({
        reason: error.abort,
      });
    }

    return res.status(500).send({ reason: "The request failed", error });
  }
});

/**
 * Add an item to a customer's cart. Update the quantity if it already exists.
 * @route {POST} /customers/:id/cart/item
 * @param id string
 * @bodyparam productName
 * @bodyparam quantity
 * @returns OrderItem
 */
router.post("/customers/:id/cart/item", async (req: Request, res: Response) => {
  const { id: customerId } = req.params;
  const { productName, quantity } = req.body;

  if (!productName || !quantity) {
    return res.status(400).send({
      reason: "You must provide a productName and quantity.",
    });
  }

  try {
    const { data: cartItem } = await faunaClient.query(
      fql`createOrUpdateCartItem(${customerId}, ${productName}, ${quantity})`
    );

    // TODO: we will need to strip out internal fields from the response.
    return res.status(200).send(cartItem);
  } catch (error: any) {
    // We defined several abort contitions in the updateCartItem UDF.
    // Use them to return appropriate error messages.
    if (error.abort) {
      return res.status(400).send({
        reason: error.abort,
      });
    }

    return res.status(500).send({
      reason: "The request failed unexpectedly.",
    });
  }
});

export default router;
