# Fauna TypeScript Sample App

Welcome to the sample app! This README will help you get the app up and running
in your local environment.

## Prerequisites

In order to run the sample app, you will need Fauna account. If you don't, you
can create one at https://dashboard.fauna.com/register .

In addition to a Fauna account you will need `npm` and `node` version 20 or
greater installed.

With those in place, you will then need the latest Fauna CLI. If you do not have
it already you can install it via

```sh
$ npm install --global fauna-shell
```

## Setting up your project

### Log in to your Fauna account

If you have not done so already, log in to your Fauna account via the CLI.
Follow the prompts and choose `cloud-us` as your default endpoint.

```sh
$ fauna cloud-login
? Endpoint name cloud
? Email address (from https://dashboard.fauna.com/) <enter your account email>
? Password ***********
? Endpoints created. Which endpoint would you like to set as default? cloud-us
Configuration updated.
```

### Create a Database

Create a Database to use with the sample app:

```sh
$ fauna create-database --endpoint=cloud-us --environment='' ECommerce 
creating database ECommerce

  created database ECommerce

  To start a shell with your new database, run:

  fauna shell ECommerce

  Or, to create an application key for your database, run:

  fauna create-key ECommerce
```

You can verify that the Database is in place using the cli. From the project root, run:

```sh
$ fauna eval '1 + 1'
2
```

### Set up Database schema

With the Database in place, you can set up the application schema. With a
Fauna-based application, you manage schema in the form of FSL (Fauna Schema
Language) source files. The sample app stores these files in the `server/schema`
directory.

Push the sample app schema. Accept the changes by entering `y` when prompted:

```sh
$ fauna schema push
Connected to endpoint: cloud-us database: ECommerce
Proposed diff:

* Adding collection 'Category' to 948:1144/collections.fsl:

  + collection Category {
  +   name: String
  +   description: String
  +   compute products: Set<Product> = (category => Product.byCategory(category))
  + 
  +   unique [.name]
...

? Accept and push changes? (y/N) y
```

The Fauna CLI uses local project configuration in `.fauna-project` in order to
determine where to find your project's schema as well as what database to use by
default. The configuraton is flexible, supporting the ability to configure
multiple environments such as dev, staging, and production, targeting different
databases or even different Fauna accounts. How to do so is beyond the scope of
this readme. Refer to the [Fauna CLI
documentation](https://docs.fauna.com/fauna/current/tools/shell/) for more
information.

## Set environmental variables for the sample app API server

We now need to create a Database Key for the sample app to use. Create a Key
with the built-in `server` role using the command:

```sh
$ fauna create-key --endpoint=cloud-us --environment='' ECommerce server
Connected to endpoint: cloud-us
Connected to endpoint: cloud-us database: ECommerce
creating key for database 'ECommerce' with role 'server'

  created key for database 'ECommerce' with role 'server'.
  secret: fnXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

  To access 'ECommerce' with this key, create a client using
  the driver library for your language of choice using
  the above secret.
```

Copy `server/.env.example` into a local `server/.env` file. Replace the value of
`FAUNA_SECRET` with the API secret returned from running the create-key command.

## Start up the API server

The sample app API server is a node app which is in `server` directory. Change
to the server directory and start node:

```sh
$ cd server
$ npm install && npm run dev

added 421 packages, and audited 422 packages in 6s

51 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities

> js-sample-app-server@1.0.0 dev
> nodemon src/index.ts

[nodemon] 3.1.4
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): *.*
[nodemon] watching extensions: ts,json
[nodemon] starting `ts-node src/index.ts`
server is listening at http://localhost:8000
```

## Run tests

With the API server running, verify everything is working correctly by runnint
tests. Change to the sample app `server` directory and run tests via `npm`:

```sh
$ cd server
$ npm run test
```

Assuming all tests pass, congratulations, you have successfully set up the
sample app!
