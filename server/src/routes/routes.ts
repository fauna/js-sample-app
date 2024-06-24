import { Router } from "express";
import customerController from "./customer/customer.controller";

const api = Router().use(customerController);

export default Router().use("/", api);
