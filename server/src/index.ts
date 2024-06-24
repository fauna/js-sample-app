import express, { Request, Response, Application } from "express";
import routes from "./routes/routes";

const app: Application = express();
const port = process.env.PORT || 8000;

app.use(routes);

app.get("/ping", (req: Request, res: Response) => {
  res.send("pong");
});

app.listen(port, () => {
  console.log(`server is listening at http://localhost:${port}`);
});
