import { QueryValueObject } from "fauna";
import { Order } from "../orders/orders.model";

export interface Customer extends QueryValueObject {
  id: string;
  name: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}
