# Fauna JavaScript sample app

This sample app shows how to use [Fauna](https://fauna.com) in a production
application.

The app uses Node.js and the [Fauna v10 JavaScript
driver](https://github.com/fauna/fauna-js) to create HTTP API endpoints for an
e-commerce store. You can use the app's API endpoints to manage products,
customers, and orders for the store.

The app uses Fauna schemas and queries to:

- Read and write data with strong consistency.

- Define and handle relationships between resources, such as linking orders
  to products and customers.

- Validate data changes against business logic.

The app's source code includes comments that highlight Fauna best practices.


## Highlights

The sample app uses the following Fauna features:

- **[Document type
  enforcement](https://docs.fauna.com/fauna/current/learn/schema/#type-enforcement):**
  Collection schemas enforce a structure for the app's documents. Fauna rejects
  document writes that don't conform to the schema, ensuring data consistency.
  [Zero-downtime
  migrations](https://docs.fauna.com/fauna/current/learn/schema/#schema-migrations)
  let you safely change the schemas at any time.

- **[Relationships](https://docs.fauna.com/fauna/current/learn/query/relationships/):**
  Normalized references link documents across collections. The app's queries use
  [projection](https://docs.fauna.com/fauna/current/reference/fql/projection/)
  to dynamically retrieve linked documents, even when deeply nested. No complex
  joins, aggregations, or duplication needed.

- **[Computed
  fields](https://docs.fauna.com/fauna/current/learn/schema/#computed-fields):**
  Computed fields dynamically calculate their values at query time. For example,
  each customer's `orders` field uses a query to fetch a set of filtered orders.
  Similarly, each order's `total` is calculated at query time based on linked
  product prices and quantity.

- **[Constraints](https://docs.fauna.com/fauna/current/learn/schema/#unique-constraints):**
  The app uses constraints to ensure field values are valid. For example, the
  app uses unique constraints to ensure each customer has a unique email address
  and each product has a unique name. Similarly, check constraints ensure each
  customer has only one cart at a time and that product prices are not negative.

- **[User-defined functions
  (UDFs)](https://docs.fauna.com/fauna/current/learn/data-model/user-defined-functions/):**
  The app uses UDFs to store business logic as reusable queries. For example,
  the app uses a `checkout()` UDF to process order updates. `checkout()` calls
  another UDF, `validateOrderStatusTransition()`, to validate `status`
  transitions for orders.


## Requirements

To run the app, you'll need:

- A [Fauna account](https://dashboard.fauna.com/register). You can sign up for a
  free account at https://dashboard.fauna.com/register.

- [Node.js](https://nodejs.org/en/download/) v20.x or later

- The [Fauna CLI](https://docs.fauna.com/fauna/current/tools/shell/). To install
  the CLI, run:

    ```sh
    npm install -g fauna-shell
    ```

You should also be familiar with basic Fauna CLI commands and usage. For an
overview, see the [Fauna CLI
docs](https://docs.fauna.com/fauna/current/tools/shell/).


## Setup

1. In your terminal, clone the repo and navigate to the `js-sample-app`
   directory. For example:

    ```sh
    git clone git@github.com:fauna/js-sample-app.git
    cd js-sample-app
    ```

    The repo includes a
   [`.fauna-project`](https://docs.fauna.com/fauna/current/tools/shell/#proj-config)
   file that contains defaults for the Fauna CLI. The file indicates:

    - `ECommerce` is the default database for the project.

    - The project stores Fauna Schema Language (FSL) files in the
      `/schema` directory.

1. Log in to Fauna using the Fauna CLI:

    ```sh
    fauna cloud-login
    ```

    The command requires an email and password login. If you log in to the Fauna
    using GitHub or Netlify, you can enable email and password login using the
    [Forgot Password](https://dashboard.fauna.com/forgot-password) workflow.


1. Use the Fauna CLI to create the `ECommerce` database:

    ```sh
    fauna create-database --environment='' ECommerce
    ```

1.  Push the FSL files in the `/schema` directory to the `ECommerce`
    database:

    ```sh
    fauna schema push
    ```

    When prompted, accept and push the changes. The push creates the collections
    and user-defined functions (UDFs) defined in the FSL files of the
    `/schema` directory.

1. Create a key with the `server` role for the `ECommerce` database:

    ```sh
    fauna create-key --environment='' ECommerce server
    ```

    Copy the returned `secret`. The app can use the key's secret to authenticate
    requests to the database.

1. Make a copy of the `.env.example` file and name the copy `.env`. For example:

    ```sh
    cp .env.example .env
    ```

1.  In `.env`, set the `FAUNA_SECRET` environment variable to the secret you
    copied earlier:

    ```
    ...
    FAUNA_SECRET=fn...
    ...
    ```

## Add sample data

The app includes tests that check the app's API endpoints and create related documents
in the `ECommerce` database.

From the root directory, run:

```sh
npm install && npm run test
```

You can view documents created by the tests in the [Fauna
Dashboard](https://dashboard.fauna.com/).


## Run the app

The app runs an HTTP API server. From the root directory, run:

```sh
npm install && npm run dev
```

Once started, the local server is available at http://localhost:8000.


## HTTP API endpoints

The app's HTTP API endpoints are defined in `*.controller.ts` files in the
`/src/routes` directory.

Reference documentation for the endpoints is available at
https://fauna.github.io/js-sample-app/.


### Make API requests

You can use the endpoints to make API requests that read and write data from
the `ECommerce` database.

For example, with the local server running in a separate terminal tab, run the
following curl request to the `POST /customers` endpoint. The request creates a
`Customer` collection document in the `ECommerce` database.

```
curl -v \
  http://localhost:8000/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "address": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "postalCode": "12345",
      "country": "USA"
    }
  }'
```
