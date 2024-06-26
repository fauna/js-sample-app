import { Router } from "express";
import customersController from "./customers/customers.controller";

const api = Router().use(customersController);

export default Router().use("/", api);
