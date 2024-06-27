import { QueryValueObject } from "fauna";
import { Order } from "../orders/orders.model";

export interface Customer extends QueryValueObject {
  id: string;
  name: string;
  email: string;
  cart: Order | null;
  orders: Order[];
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}
