import { fql } from "fauna";
import { faunaClient } from "../../fauna/fauna-client";
import { Customer, CustomerInput } from "./customer.model";

export const getCustomer = async (id: string) => {
  return await faunaClient.query<Customer>(fql`Customer.byId(${id})`);
};

export const createCustomer = async (customer: CustomerInput) => {
  return await faunaClient.query<Customer>(fql`Customer.create(${customer})`);
};
