import { QueryValueObject } from "fauna";

export interface Product extends QueryValueObject{
  name: string;
  description: string;
  price: number;
  stock: number;
  category: Category;
}

export interface Category {
  name: string;
  description: string;
  products: Product[];
}
