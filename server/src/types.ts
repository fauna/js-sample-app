import { Request } from "express";

export interface PaginatedRequest<QueryT extends Record<string, string>>
  extends Request {
  query:
    | {
        nextToken?: string;
        pageSize?: string;
      } & QueryT;
}
