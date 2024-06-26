import { fql } from "fauna";
import { faunaClient } from "../../fauna/fauna-client";
import { Customer, CustomerInput } from "./customers.model";

export const getCustomer = async (id: string) => {
  return await faunaClient.query<Customer>(fql`Customer.byId(${id})`);
};

export const createCustomer = async (customer: CustomerInput) => {
  return await faunaClient.query<Customer>(fql`Customer.create(${customer})`);
};

/**
 * Fetch a customer's cart.
 * @param id string
 */
export const getCustomerCart = async (id: string) => {
  return await faunaClient.query<Customer>(fql`
    let customer = Customer.byId(${id})
    if (customer == null) {
      // Return a 404 if we can't find the customer
      customer
    }
    customer!.cart {
      id,
      status,
      createdAt,
      payment,
      items,
      total
    }
  `);
};

/**
 * Fetch a customer's cart, creating one if it does not exist.
 */
export const fetchCreateCustomerCart = async (id: string) => {
  return await faunaClient.query<Customer>(fql`
    let customer = Customer.byId(${id})
    if (customer == null) {
      // Return a 404 if we can't find the customer
      customer
    }
    if (customer!.cart == null) {
      // Create a cart if the customer does not have one
      Order.create({
        status: 'cart',
        customer: Customer.byId(${id}),
        createdAt: Time.now(),
        payment: {}
      }) {
        id,
        status,
        createdAt,
        payment,
        items,
        total
      }

    } else {
      customer!.cart {
        id,
        status,
        createdAt,
        payment,
        items,
        total
      }
    }
  `);
};
