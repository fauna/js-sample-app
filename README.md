# Fauna JavaScript sample app

This sample app shows how you can use [Fauna](https://fauna.com) in a
production application.

The app uses Node.js and the Fauna JavaScript driver to create HTTP API
endpoints for an e-commerce store. The source code includes comments that highlight
best practices for the driver and Fauna Query Language (FQL) queries.

This README covers how to set up and run the app locally. For an overview of
Fauna, see the [Fauna
docs](https://docs.fauna.com/fauna/current/get_started/overview).

## Highlights

The sample app uses the following Fauna features:

- FQL queries ([Code example](/src/routes/products/products.controller.ts))

  Fauna stores data as JSON-like documents in collections. The app uses FQL
  queries to retrieve, create, and update collection documents in a Fauna
  database. The queries use:

  - [Pagination](https://docs.fauna.com/fauna/current/learn/query/pagination/)
  - [Projection](https://docs.fauna.com/fauna/current/reference/fql/projection/)
  - [FQL API methods](https://docs.fauna.com/fauna/current/reference/fql-api/),
    such as
    [`map()`](https://docs.fauna.com/fauna/current/reference/fql-api/schema-entities/set/map/)

  See [Query data with FQL](https://docs.fauna.com/fauna/current/learn/query/).

- Document relationships ([Code example](/schema/collections.fsl))

  Fauna supports dynamic one-to-one, one-to-many, and many-to-many relationships
  between documents. You can use relationships to model complex data structures
  without duplicating data. See [Document
  relationships](https://docs.fauna.com/fauna/current/learn/query/relationships/).

- Document type definitions ([Code example](/schema/collections.fsl))

  You can use document types and zero-downtime migrations to progressively
  enforce and evolve an app's data model. You define document types in
  collection schemas using Fauna Schema Language (FSL). See
  [Schema](https://docs.fauna.com/fauna/current/learn/schema/).

- User-defined functions ([Code example](/schema/functions.fsl))

  You can use user-defined functions (UDFs) to encapsulate business logic as a
  manageable, maintainable resource in Fauna. You define UDFs as FSL schema. See
  [User-defined
  functions](https://docs.fauna.com/fauna/current/learn/data-model/user-defined-functions/).

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

## Set up

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

## Run the app

The app runs an HTTP API server. From the root directory, run:

```sh
npm install && npm run dev
```

Once started, the local server is available at http://localhost:8000.

## Make HTTP API requests

The app's HTTP API endpoints are defined in `*.controller.ts` files in the
`/src/routes` directory.

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
    "name": "Alice Appleseed",
    "email": "alice.appleseed@example.com",
    "address": {
      "street": "87856 Mendota Court",
      "city": "Washington",
      "state": "DC",
      "postalCode": "20220",
      "country": "USA"
    }
  }'
```

You can view the documents for the collection in the [Fauna
Dashboard](https://dashboard.fauna.com/).

## Run tests

The app includes tests that check the app's API endpoints and create related documents
in the `ECommerce` database.

From the root directory, run:

```sh
npm install && npm run test
```

You can view documents created by the tests for each collection in the [Fauna
Dashboard](https://dashboard.fauna.com/).
