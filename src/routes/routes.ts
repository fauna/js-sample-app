import { Router } from "express";
import orders from "./orders/orders.controller";
import products from "./products/products.controller";
import customers from "./customers/customers.controller";

const api = Router().use(customers).use(products).use(orders);

export default Router().use("/", api);
