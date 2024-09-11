import { TimeStub, QueryValueObject } from "fauna";
import { Product } from "../products/products.model";
import { Customer } from "../customers/customers.model";

export interface Order extends QueryValueObject {
  id: string;
  createdAt: TimeStub;
  customer: Customer;
  items: OrderItem[];
  status: OrderStatus;
  total: number;
}

export interface OrderItem extends QueryValueObject {
  product: Product;
  quantity: number;
}

export enum OrderStatus {
  Cart = "cart",
  Processing = "processing",
  Shipped = "shipped",
  Delivered = "delivered",
}
