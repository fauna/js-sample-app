import { Request } from "express";

// Define a type for paginated requests. It extends the Express Request type and
// adds a query field with nextToken and pageSize query parameters.
export interface PaginatedRequest<QueryT extends Record<string, string>>
  extends Request {
  query:
    | {
        nextToken?: string;
        pageSize?: string;
      } & QueryT;
}
