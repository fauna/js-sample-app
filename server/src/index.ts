import app from "./app";

const port = process.env.SERVICE_PORT || 8000;

app.listen(port, () => {
  console.log(`server is listening at http://localhost:${port}`);
});
