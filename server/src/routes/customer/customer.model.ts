export interface Customer {
  id: string;
  name: string;
  email: string;
  orders: any; // TODO: Define order type
}

export type CustomerInput = Pick<Customer, "name" | "email">;
