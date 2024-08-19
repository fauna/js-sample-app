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
  id?: string;
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
  const fakeName = faker.internet.userName();
  return {
    ...(overrides?.id && { id: overrides.id }),
    name: overrides?.name || fakeName,
    email:
      overrides?.email ||
      `${(overrides?.name || fakeName)
        .replace(/\s/g, "")
        .toLowerCase()}@fauna.com`,
    address: mockAddr(overrides?.address),
  };
};

export const mockProduct = (overrides?: {
  name?: string;
  price?: number;
  stock?: number;
  description?: string;
  category?: string;
}) => {
  const fakeName = faker.commerce.productName();
  const fakeDescription = faker.commerce.productDescription();
  return {
    name: overrides?.name || fakeName,
    price: overrides?.price || 100.0,
    stock: overrides?.stock || 10,
    description: overrides?.description || fakeDescription,
    category: overrides?.category || faker.commerce.department(),
  };
};
