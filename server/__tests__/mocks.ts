import { faker } from "@faker-js/faker";

export const mockAddr = (overrides?: {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}) => {
  return {
    street: overrides?.street || "123 Main St",
    city: overrides?.city || "San Francisco",
    state: overrides?.state || "CA",
    postalCode: overrides?.postalCode || "12345",
    country: overrides?.country || "United States",
  };
};

export const mockCustomer = (overrides?: {
  name?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}) => {
  const ts = new Date().getTime();
  const fakeName = faker.internet.userName();
  return {
    name: overrides?.name || fakeName,
    email: overrides?.email || `${fakeName.toLowerCase()}+${ts}@fauna.com`,
    address: mockAddr(overrides?.address),
  };
};

export const mockProduct = (overrides?: {
  name?: string;
  price?: number;
  stock?: number;
  description?: string;
}) => {
  const ts = new Date().getTime();
  return {
    name: overrides?.name || `Lava Lamp (${ts})`,
    price: overrides?.price || 100.0,
    stock: overrides?.stock || 10,
    descrition: overrides?.description || "A groovy lamp for your pad.",
  };
};

export const mockCategory = (overrides?: {
  name?: string;
  description?: string;
}) => {
  const ts = new Date().getTime();
  return {
    name: overrides?.name || `Home Decor (${ts})`,
    description: overrides?.description || "Products to decorate your home.",
  };
};
