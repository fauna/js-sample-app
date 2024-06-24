import { Client } from "fauna";

export const faunaClient = new Client({
  secret: process.env.FAUNA_SECRET,
  endpoint: new URL(process.env.FAUNA_ENDPOINT ?? "https://db.fauna.com"),
});
