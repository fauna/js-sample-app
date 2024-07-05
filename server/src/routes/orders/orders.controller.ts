import {
  fql,
  AbortError,
  type DocumentT,
  type Page,
  ServiceError,
} from "fauna";
import { removeInternalFields } from "../../fauna/util";
import { Request, Response, Router } from "express";
import { faunaClient } from "../../fauna/fauna-client";
import { Order, OrderItem } from "./orders.model";
import {
  validateGetOrders,
  validateOrderUpdate,
} from "../../middleware/orders";
import { PaginatedRequest } from "../../types";

const router = Router();

/**
 * Get an order by id.
 * @route {GET} /orders/:id
 * @param id
 * @returns Order
 */
router.get("/orders/:id", async (req: Request, res: Response) => {
  // Extract the id from the request parameters.
  const { id } = req.params;

  try {
    // Connect to fauna using the faunaClient. The query method accepts
    // an FQL query as a parameter as well as an optional return type. In this
    // case, we are using the DocumentT type to specify that the query will return
    // a single document representing an Order.
    const { data: order } = await faunaClient.query<DocumentT<Order>>(
      // Get the Order document by id, using the ! operator to assert that the document exists.
      // If the document does not exist, Fauna will throw a document_not_found error.
      fql`Order.byId(${id})!`
    );

    // Return the order, stripping out any unnecessary fields.
    return res.status(200).send(removeInternalFields(order));
  } catch (error: any) {
    // A ServiceError represents an error that occurred within Fauna.
    if (error instanceof ServiceError) {
      if (error.code === "invalid_argument") {
        // If the id is not valid, return a 400.
        return res
          .status(400)
          .send({ message: `Invalid id '${id}' provided.` });
      } else if (error.code === "document_not_found") {
        // If the document does not exist, return a 404.
        return res
          .status(404)
          .send({ message: `No order with id '${id}' exists.` });
      }
    }

    // Return a generic 500 if we encounter an unexpected error.
    return res.status(500).send({ message: "Internal Server Error" });
  }
});

/**
 * Update an existing order.
 * @route {PATCH} /order/:id
 * @param id
 * @bodyparam status
 * @bodyparam payment
 * @returns Order
 */
router.patch(
  "/orders/:id",
  validateOrderUpdate,
  async (req: Request, res: Response) => {
    // Extract the id from the request parameters.
    const { id } = req.params;
    // Extract the status and payment fields from the request body.
    const { status, payment = {} } = req.body;

    try {
      // Connect to fauna using the faunaClient. The query method accepts
      // an FQL query as a parameter as well as an optional return type. In this
      // case, we are using the DocumentT type to specify that the query will return
      // a single document representing an Order.
      const { data: order } = await faunaClient.query<DocumentT<Order>>(
        // Update the Order document by id, using the ! operator to assert that the document exists.
        // If the document does not exist, Fauna will throw a document_not_found error.
        // We also ensure that the status transition is valid based on the current status of the
        // order and the new status provided.
        fql`
          let order = Order.byId(${id})!
          // Check the logic transition of the order status
          if (order!.status == "cart" && (${status} != null && ${status} != "processing")) {
            abort("Invalid status transition.")
          } else if (order!.status == "processing" && (${status} != null && ${status} != "shipped")) {
            abort("Invalid status transition.")
          } else if (order!.status == "shipped" && (${status} != null && ${status} != "delivered")) {
            abort("Invalid status transition.")
          }
          order!.update(${{ status, payment }})
        `
      );

      // Return the updated order, stripping out any unnecessary fields.
      return res.status(200).send(removeInternalFields(order));
    } catch (error: any) {
      // AbortErrors are thrown when we use the abort function in our FQL query.
      if (error instanceof AbortError) {
        // Handle any aborts we've defined in our FQl as 400s.
        return res.status(400).send({ message: error.abort });
      }
      // A ServiceError represents an error that occurred within Fauna.
      if (error instanceof ServiceError) {
        if (error.code === "document_not_found") {
          // If the order does not exist, return a 404.
          return res
            .status(404)
            .send({ message: `No order with id '${id}' exists.` });
        }
      }

      // Return a generic 500 if we encounter an unexpected error.
      return res.status(500).send({ message: "Internal Server Error" });
    }
  }
);

/**
 * Get a customer's orders. The results are paginated with a default page size of 10.
 * If a nextToken is provided, return the next page of products corresponding to that token.
 * @route {GET} /customers/:id/orders
 * @param id
 * @queryparam nextToken
 * @queryparam pageSize
 * @returns { results: Order[], nextToken: string }
 */
router.get(
  "/customers/:id/orders",
  validateGetOrders,
  async (req: PaginatedRequest, res: Response) => {
    // Extract the customer id from the request parameters.
    const { id: customerId } = req.params;
    // Extract the nextToken and pageSize from the request body
    const { nextToken = undefined, pageSize = 10 } = req.query;
    // Convert the pageSize query parameter to a number. Page size has
    // already been validated in the validateGetOrders middleware.
    const pageSizeNumber = Number(pageSize);

    // Define an FQL query to retrieve a page of orders for a given customer.
    const query = fql`
      let customer: Any = Customer.byId(${customerId})!
      Order.byCustomer(customer).pageSize(${pageSizeNumber}).map((order) => {
        let order: Any = order
        {
          id: order.id,
          createdAt: order.createdAt,
          status: order.status,
          total: order.total,
          items: order.items,
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email
          }
        }
      })
    `;

    try {
      // Note that the query return type does not need to be wrapped in a DocumentT type because
      // we are picking out the fields we want to return in the query itself as opposed to
      // returning the entire document.
      const { data: page } = await faunaClient.query<Page<Order>>(
        // If a nextToken is provided, use the Set.paginate function to get the next page of orders.
        // Otherwise, use the query defined above which will fetch the first page of orders.
        nextToken ? fql`Set.paginate(${nextToken})` : query
      );

      // Return the page of orders and the next token to the user. The next token can be passed back to
      // the server to retrieve the next page of orders.
      return res
        .status(200)
        .send({ results: page.data, nextToken: page.after });
    } catch (error: any) {
      // A ServiceError represents an error that occurred within Fauna.
      if (error instanceof ServiceError) {
        if (error.code === "document_not_found") {
          // If the customer does not exist, return a 404.
          return res
            .status(404)
            .send({ message: `No customer with id '${customerId}' exists.` });
        }
      }

      // Return a generic 500 if we encounter an unexpected error.
      return res.status(500).send({ message: "Internal Server Error" });
    }
  }
);

/**
 * Get a customer's cart. Create one if it does not exist.
 * @route {POST} /customer/:id/cart
 * @param id string
 * @returns Order
 */
router.post("/customers/:id/cart", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { data: cart } = await faunaClient.query<DocumentT<Order>>(
      fql`getOrCreateCart(${id})`
    );

    return res.status(200).send(cart);
  } catch (error: any) {
    // We abort our UDF if the customer does not exist.
    if (error instanceof AbortError) {
      return res.status(400).send({
        message: error.abort,
      });
    }

    return res
      .status(500)
      .send({ message: "The request failed unexpectedly.", error });
  }
});

/**
 * Add an item to a customer's cart. Update the quantity if it already exists.
 * @route {POST} /customers/:id/cart/item
 * @param id string
 * @bodyparam productName
 * @bodyparam quantity
 * @returns OrderItem
 */
router.post("/customers/:id/cart/item", async (req: Request, res: Response) => {
  const { id: customerId } = req.params;
  const { productName, quantity } = req.body;

  if (!productName || !quantity) {
    return res.status(400).send({
      message: "You must provide a productName and quantity.",
    });
  }

  try {
    const { data: cartItem } = await faunaClient.query<DocumentT<OrderItem>>(
      fql`createOrUpdateCartItem(${customerId}, ${productName}, ${quantity})`
    );

    // TODO: we will need to strip out internal fields from the response.
    return res.status(200).send(cartItem);
  } catch (error: any) {
    // We defined several abort contitions in the updateCartItem UDF.
    // Use them to return appropriate error messages.
    if (error instanceof AbortError) {
      return res.status(400).send({
        message: error.abort,
      });
    }

    return res
      .status(500)
      .send({ message: "The request failed unexpectedly.", error });
  }
});

/**
 * Get a customer's cart
 * @route {GET} /customer/:id/cart
 * @param id string
 * @returns Cart
 * @returns 404
 */
router.get("/customers/:id/cart", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data: cart } = await faunaClient.query<DocumentT<Order>>(fql`
      let customer = Customer.byId(${id})

      if (customer == null) {
        abort("No customer with id exists.")
      }

      customer!.cart {
        total,
        status,
        items,
        createdAt
      }
    `);
    return res.status(200).send(cart);
  } catch (error: any) {
    // Handle any abort conditions we defined in the UDF.
    if (error instanceof AbortError) {
      return res.status(400).send({ message: error?.abort });
    }

    return res
      .status(500)
      .send({ message: "The request failed unexpectedly.", error });
  }
});

export default router;
