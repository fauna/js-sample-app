import dotenv from "dotenv";
dotenv.config(); // Load the .env file
import express, { Application, Request, Response } from "express";
import bodyParser from "body-parser";
import routes from "./routes/routes";

const app: Application = express();

app.use(bodyParser.json());
app.use(routes);

app.get("/ping", (req: Request, res: Response) => {
  res.send("pong");
});

export default app;
