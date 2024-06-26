import { Request, Response, Router } from 'express';
import { faunaClient } from "../../fauna/fauna-client";
import { fql, DocumentT, type Page } from "fauna";
import { Product } from './products.model';

const router = Router();

router.get("/products", async (req: Request, res: Response) => {
  const { category } = req.query;
  if (category !== undefined && typeof category !== "string") {
    return res.status(400).json({
      message: "Category must be a string or be omitted.",
    });
  }

  try {
    const query = category === undefined ?
                  fql`Product.sortedByCategory()` :
                  fql`Product.byCategory(Category.byName(${category}).first())`

    const products = await faunaClient.query<{data: DocumentT<Product>[], after: string}>(query)
    return res.json({
      results: products
        .data.data
        .map((product: DocumentT<Product>) => {
          // filter out Fauna object fields since our clients don't need them
          const { ts, ttl, coll, id, ...rest } = product;
          return rest;
        }),
      nextToken: products.data.after
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

export default router;
