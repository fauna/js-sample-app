import { Request, Response, Router } from 'express';

const router = Router();

router.get("/products", (req: Request, res: Response) => {
  return res.json({
        message: "GET Products"
    });
});

export default router;
