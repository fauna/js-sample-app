export interface Product {
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
