## Setting up your project

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



## To Start

- run `npm install && npm run dev`.

## To Build

- run `npm run build`.
