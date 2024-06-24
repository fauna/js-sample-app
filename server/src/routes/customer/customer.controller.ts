import { NextFunction, Request, Response, Router } from "express";
import { getCustomer } from "./customer.service";

const router = Router();

/**
 * Get customer
 * @route {GET} /customer/:id
 * @param id string
 * @returns Customer
 */
router.get(
  "/customer/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const customer = await getCustomer(id);
      res.json({ ...customer });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
