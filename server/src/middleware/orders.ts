import { Request, Response, NextFunction } from "express";
import { OrderStatus } from "../routes/orders/orders.model";
import { PaginatedRequest } from "../types";

export const validateOrderUpdate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { status, payment } = req.body;

  if (status && !Object.values(OrderStatus).includes(status)) {
    return res.status(400).send({
      message:
        "Status must be one of 'cart', 'processing', 'shipped', or 'delivered'.",
    });
  } else if (
    status !== undefined &&
    payment !== undefined &&
    status !== "cart"
  ) {
    return res.status(400).send({
      message:
        "Payment method may only be updated before the order has been placed.",
    });
  }

  next();
};

export const validateGetOrders = (
  req: PaginatedRequest<{ category?: string }>,
  res: Response,
  next: NextFunction
) => {
  // Extract the category query parameter from the request.
  const { pageSize, nextToken } = req.query;

  // validate the pageSize and nextToken query parameters.
  if (
    pageSize !== undefined &&
    (isNaN(Number(pageSize)) || Number(pageSize) <= 0)
  ) {
    return res.status(400).json({
      message: "Page size must be a positive integer or be omitted.",
    });
  } else if (nextToken !== undefined && typeof nextToken !== "string") {
    return res.status(400).json({
      message: "Next token must be a string or be omitted.",
    });
  }

  next();
};

export const validateOrderItem = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { productName, quantity } = req.body;

  if (!productName || typeof productName !== "string" || productName === "") {
    return res.status(400).send({
      message: "Product must be a non empty string.",
    });
  } else if (!quantity || isNaN(quantity) || quantity <= 0) {
    return res.status(400).send({
      message: "Quantity must be a positive integer.",
    });
  }

  next();
};
