import { Router } from "express";
import customers from "./customers/customers.controller";
import orders from "./orders/orders.controller";
import products from "./products/products.controller";

const api = Router()
  .use(customers)
  .use(products)
  .use(orders);

export default Router().use("/", api);
