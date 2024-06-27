## Setting up your project

### Create a Database
To setup your project you first need to create a database.

Do this by first creating a credential for the fauna shell your account using:

```sh
fauna cloud-login
```

This will create a `cloud-us` endpoint your shell can use to communicate to your account. This will also be set as the default account for future commands.

With that setup, run:

```sh
fauna create-database E_Commerce
```

to create the database we will use for the E-Commerce application we're building.

### Push the schema

Now you've got the database we'll use. At this point we'll push our schema by running:

```
fauna schema push
```

This will use the `.fauna-project` file to push the files in the `/schema` directory.


## Set environmental variables for your server

Create a secret via the command:

```sh
fauna create-key E_Commerce admin
```

This will print out a secret.

Copy `.env.example` into a local `.env` file. Replace the secret with the secret you just created.

## To Start the Server

- run `npm install && npm run dev`.

This will start a nodemon server that will listen for local changes and auto deploy them.

## To Test

To test, first start the server. Then in another buffer run `npm run test`.

## To Build

- run `npm run build`.
