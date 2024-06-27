import { TimeStub, QueryValueObject } from "fauna";
import { Product } from "../products/products.model";
import { Customer } from "../customers/customers.model";

export interface Order extends QueryValueObject {
  id: string;
  createdAt: TimeStub;
  customer: Customer;
  items: OrderItem[];
  status: "cart" | "processing" | "shipped" | "delivered";
  total: number;
}

export interface OrderItem extends QueryValueObject {
  order: Order;
  product: Product;
  quantity: number;
}
