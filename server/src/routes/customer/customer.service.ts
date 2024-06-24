import { fql } from "fauna";
import { faunaClient } from "../../fauna/fauna-client";
import { Customer } from "./customer.model";

export const getCustomer = async (id: string) => {
  return await faunaClient.query<Customer>(fql`Customer.byId(${id})`);
};
