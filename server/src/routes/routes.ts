import { Router } from "express";
import customers from "./customers/customers.controller";
import products from "./products/products.controller";

const api = Router()
  .use(customers)
  .use(products);

export default Router().use("/", api);
