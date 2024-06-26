import { Request, Response, Router } from "express";

const router = Router();

/**
 * Put Order Item
 * @route {PUT} orders/:orderId/item
 * @param customerId
 * @param orderId
 * @bodyparam productName
 * @bodyparam quantity
 * @returns OrderItem
 */
router.put(
  "/customers/:customerId/orders/:orderId/item",
  (req: Request, res: Response) => {
    const { productName, quantity } = req.body;

    if (!productName || !quantity) {
      return res.status(400).send({
        reason: "You must provide a productName and quantity.",
      });
    }

    return res.json({
      message: "Put Order Item",
    });
  }
);

export default router;
