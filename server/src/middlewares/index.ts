import { Request, Response, NextFunction } from 'express';

export const validateOrderUpdate = (req: Request, res: Response, next: NextFunction) => {
  const { status, payment, customerId } = req.body;
  const validFields = ['status', 'payment'];
  const receivedFields = Object.keys(req.body);

  // Check for invalid fields
  const invalidFields = receivedFields.filter(field => !validFields.includes(field));
  if (invalidFields.length > 0) {
    return res.status(400).send({ reason: `Invalid fields: ${invalidFields.join(', ')}` });
  }

  // Check for required fields and their types
  if (status && typeof status !== 'string') {
    return res.status(400).send({ reason: 'Invalid type for field: status' });
  }
  if (payment && typeof payment !== 'string') {
    return res.status(400).send({ reason: 'Invalid type for field: payment' });
  }
  if (customerId && typeof customerId !== 'string') {
    return res.status(400).send({ reason: 'Invalid type for field: customerId' });
  }

  next();
};