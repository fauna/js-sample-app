import { fql } from "fauna";
import { faunaClient } from "../../fauna/fauna-client";
import { Customer } from "./customer.model";

export const getCustomer = async (id: string): Promise<Customer> => {
  const { data } = await faunaClient.query<Customer>(fql`Customer.byId(${id})`);
  return {
    name: data.name,
    email: data.email,
    orders: data.orders,
  };
};
