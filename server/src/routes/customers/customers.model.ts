import { Order } from "../orders/orders.model";

export interface Customer {
  id: string;
  name: string;
  email: string;
  cart?: Order;
  orders: Order[];
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export type CustomerInput = Pick<Customer, "name" | "email">;
