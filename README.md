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

- [Node.js](https://nodejs.org/en/download/) v22.x or later.

- [Fauna CLI v4](https://docs.fauna.com/fauna/current/build/cli/v4/).

  To install the CLI, run:

    ```sh
    npm install -g fauna-shell
    ```

## Setup

1. Clone the repo and navigate to the `js-sample-app` directory:

    ```sh
    git clone git@github.com:fauna/js-sample-app.git
    cd js-sample-app
    ```

2. If you haven't already, log in to Fauna using the Fauna CLI:

    ```sh
    fauna login
    ```

3. Use the CLI to create the `ECommerce` database:

    ```sh
    # Replace 'us' with your preferred region group:
    # 'us' (United States), 'eu' (Europe), or `global`.
    fauna database create \
      --name ECommerce \
      --database us
    ```

4.  Push the `.fsl` files in the `schema`directory to the `ECommerce`
    database:

    ```sh
    # Replace 'us' with your region group.
    fauna schema push \
      --database us/ECommerce
    ```

    When prompted, accept and stage the schema.

5.  Check the status of the staged schema:

    ```sh
    fauna schema status \
      --database us/ECommerce
    ```

6.  When the status is `ready`, commit the staged schema to the database:

    ```sh
    fauna schema commit \
      --database us/ECommerce
    ```

    The commit applies the staged schema to the database. The commit creates the
    collections and user-defined functions (UDFs) defined in the `.fsl` files of the
    `schema` directory.

7. Create a key with the `server` role for the `ECommerce` database:

    ```sh
    fauna query "Key.create({ role: 'server' })" \
      --database us/ECommerce
    ```

    Copy the returned `secret`. The app can use the key's secret to authenticate
    requests to the database.

8. Make a copy of the `.env.example` file and name the copy `.env`. For example:

    ```sh
    cp .env.example .env
    ```

9.  In `.env`, set the `FAUNA_SECRET` environment variable to the secret you
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
`src/routes` directory.

Reference documentation for the endpoints is available at
https://fauna.github.io/js-sample-app/.


### Make API requests

You can use the endpoints to make API requests that read and write data from
the `ECommerce` database.

For example, with the local server running in a separate terminal tab, run the
following curl request to the `POST /products` endpoint. The request creates a
`Product` collection document in the `ECommerce` database.

```sh
curl -v \
  http://localhost:8000/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "The Old Man and the Sea",
    "price": 899,
    "description": "A book by Ernest Hemingway",
    "stock": 10,
    "category": "books"
  }' | jq .
```


## Expand the app

You can further expand the app by adding fields and endpoints.

As an example, the following steps adds a computed `totalPurchaseAmt` field to
Customer documents and related API responses:

1. If you haven't already, add the sample data:

    ```sh
    npm install && npm run test
    ```

2. In `schema/collections.fsl`, add the following `totalPurchaseAmt` computed
  field definition to the `Customer` collection:

    ```diff
    collection Customer {
      ...
      // Use a computed field to get the set of Orders for a customer.
      compute orders: Set<Order> = (customer => Order.byCustomer(customer))

    + // Use a computed field to calculate the customer's cumulative purchase total.
    + // The field sums purchase `total` values from the customer's linked Order documents.
    + compute totalPurchaseAmt: Number = (customer => customer.orders.fold(0, (sum, order) => {
    +   let order: Any = order
    +   sum + order.total
    + }))
      ...
    }
    ...
    ```

    Save `schema/collections.fsl`.

3.  Push the updated schema to the `ECommerce` database:

    ```sh
    fauna schema push \
      --database us/ECommerce
    ```

    When prompted, accept and stage the schema.

4.  Check the status of the staged schema:

    ```sh
    fauna schema status \
      --database us/ECommerce
    ```

5.  When the status is `ready`, commit the staged schema changes to the
    database:

    ```sh
    fauna schema commit \
      --database us/ECommerce
    ```

6. In `src/routes/customers/customers.controller.ts`, add the
   `totalPurchaseAmt` field to the `customerResponse` FQL template:

    ```diff
    // Project Customer document fields for consistent responses.
    const customerResponse = fql`
      customer {
        id,
        name,
    +   email,
    +   totalPurchaseAmt,
        address
      }
    `;
    ```

    Save `src/routes/customers/customers.controller.ts`.

    Customer-related endpoints use this template to project Customer
    document fields in responses.

7. Start the app server:

    ```sh
    npm install && npm run dev
    ```

8. With the local server running in a separate terminal tab, run the
   following curl request to the `POST /customers` endpoint:

    ```sh
    curl -v http://localhost:8000/customers/999 | jq .
    ```

    The response includes the computed `totalPurchaseAmt` field:

    ```json
    {
      "id": "999",
      "name": "Valued Customer",
      "email": "valuedcustomer@fauna.com",
      "totalPurchaseAmt": 27000,
      "address": {
        "street": "123 Main St",
        "city": "San Francisco",
        "state": "CA",
        "postalCode": "12345",
        "country": "United States"
      }
    }
    ```
