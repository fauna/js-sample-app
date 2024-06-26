import { TimeStub } from "fauna";
import { Product } from "../product/product.model";
import { Customer } from "../customer/customer.model";

export interface Order {
  id: string;
  createdAt: TimeStub;
  customer: Customer;
  items: OrderItem[];
  status: "cart" | "processing" | "shipped" | "delivered";
  total: number;
}

export interface OrderItem {
  id: string;
  order: Order;
  product: Product;
  quantity: number;
}
