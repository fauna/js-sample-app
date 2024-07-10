import { Client } from "fauna";

// Create a new Fauna client with the secret and endpoint
// from the environment variables. The endpoint defaults to
// https://db.fauna.com if it is not set in the environment.
// This client will be used across the application to interact
// with Fauna.
export const faunaClient = new Client({
  secret: process.env.FAUNA_SECRET,
  endpoint: new URL(process.env.FAUNA_ENDPOINT ?? "https://db.fauna.com"),
});
