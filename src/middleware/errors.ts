import { Request, Response, NextFunction } from "express";
import { ServiceError } from "fauna";

// Middleware to handle 401 errors
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ServiceError) {
    if (err.code === "unauthorized") {
      // If unauthorized, return an error instructing the admin to check
      // the `FAUNA_SECRET` env var.
      return res.status(401).send({
        message:
          "Unauthorized. Set the `FAUNA_SECRET` env var to a valid Fauna key's secret.",
      });
    } else {
      // Return a generic 500 if we encounter an unexpected error.
      return res.status(500).send({ message: "Internal Server Error" });
    }
  }
};
