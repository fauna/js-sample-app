import express, { Request, Response, Application } from "express";

const app: Application = express();
const port = process.env.PORT || 8000;

app.get("/ping", (req: Request, res: Response) => {
  res.send("pong");
});

app.listen(port, () => {
  console.log(`server is listening at http://localhost:${port}`);
});
