import { Request, Response, NextFunction } from "express";
import { PaginatedRequest } from "../types";

export const validateGetProducts = (
  req: PaginatedRequest<{ category?: string }>,
  res: Response,
  next: NextFunction
) => {
  // Extract the category query parameter from the request.
  const { category, pageSize, nextToken } = req.query;

  // Validate the category query parameter. It must be a string if present.
  if (category !== undefined && typeof category !== "string") {
    return res.status(400).json({
      message: "Category must be a string or be omitted.",
    });
  } else if (
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

export const validateProductCreate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Extract fields from the request body.
  const { name, price, description, stock, category } = req.body;

  // Validate the fields in the request body. They must be present and valid.
  if (typeof name !== "string" || name.length === 0) {
    return res.status(400).json({
      message: "Name must be a non-empty string.",
    });
  } else if (typeof price !== "number" || price <= 0) {
    return res.status(400).json({
      message: "Price must be a number greater than 0.",
    });
  } else if (typeof description !== "string" || description.length === 0) {
    return res.status(400).json({
      message: "Description must be a non-empty string.",
    });
  } else if (typeof stock !== "number" || stock < 0) {
    return res.status(400).json({
      message: "Stock must be a number greater than or equal to 0.",
    });
  } else if (typeof category !== "string" || category.length === 0) {
    return res.status(400).json({
      message: "Category must be a non-empty string.",
    });
  }

  next();
};

export const validateProductUpdate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Extract fields from the request body.
  const { price, description, stock, category, name } = req.body;

  // Validate the fields in the request body. They must be valid if they are present.
  if (price !== undefined && (typeof price !== "number" || price <= 0)) {
    return res.status(400).json({
      message: "Price must be a number greater than 0 or be omitted.",
    });
  } else if (description !== undefined && typeof description !== "string") {
    return res.status(400).json({
      message: "Description must be a string or be omitted.",
    });
  } else if (stock !== undefined && (typeof stock !== "number" || stock < 0)) {
    return res.status(400).json({
      message:
        "Stock must be a number greater than or equal to 0 or be omitted.",
    });
  } else if (category !== undefined && typeof category !== "string") {
    return res.status(400).json({
      message: "Category must be a string or be omitted.",
    });
  } else if (
    name !== undefined &&
    (typeof name !== "string" || name.length === 0)
  ) {
    return res.status(400).json({
      message: "Name must be a non-empty string or be omitted.",
    });
  }

  next();
};
