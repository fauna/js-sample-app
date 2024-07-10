import { QueryValueObject } from "fauna";

export interface Product extends QueryValueObject {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: Category;
}

export interface Category extends QueryValueObject {
  id: string;
  name: string;
  description: string;
}
