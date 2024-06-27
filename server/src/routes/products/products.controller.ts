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

    const products = await faunaClient.query<{data: Product[], after: string}>(fql`
      ${query}
      // just return the Product data we want to display to the user
      .map(product => {
        let category: Any = product.category
       {
         name: product.name,
         price: product.price,
         description: product.description,
         stock: product.stock,
         category: category?.name,
       }
      })
    `);
    return res.json({
      results: products.data.data,
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
