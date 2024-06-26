export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: Category;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  products: Product[];
}
