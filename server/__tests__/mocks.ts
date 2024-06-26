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
