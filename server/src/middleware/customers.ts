import { Request, Response, NextFunction } from "express";

export const addressIsValid = (address: any) => {
  return (
    address &&
    typeof address.street === "string" &&
    typeof address.city === "string" &&
    typeof address.state === "string" &&
    typeof address.postalCode === "string" &&
    typeof address.country === "string"
  );
};

export const validateCustomerCreate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Extract fields from the request body.
  const { name, email, address } = req.body;

  // Validate the fields in the request body. They must
  // be present and valid.
  if (!name || typeof name !== "string") {
    return res.status(400).send({
      message: "Name must be a non-empty string.",
    });
  } else if (!email || typeof email !== "string") {
    return res.status(400).send({
      message: "Email must be a non-empty string.",
    });
  } else if (!address || !addressIsValid(address)) {
    return res.status(400).send({
      message:
        "Address must contain a street, city, state, postalCode and country represented as strings.",
    });
  }

  next();
};

export const validateCustomerUpdate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Extract fields from the request body.
  const { name, email, address } = req.body;

  // Validate the fields in the request body. They must
  // be valid if they are present.
  if (name !== undefined && (typeof name !== "string" || name.length === 0)) {
    return res.status(400).send({
      message: "Name must be a non-empty string or be omitted.",
    });
  } else if (
    email !== undefined &&
    (typeof email !== "string" || email.length === 0)
  ) {
    return res.status(400).send({
      message: "Email must be a non-empty string or be omitted.",
    });
  } else if (address !== undefined && !addressIsValid(address)) {
    return res.status(400).send({
      message:
        "Address must contain a street, city, state, postalCode and country represented as strings or be omitted.",
    });
  }

  next();
};
