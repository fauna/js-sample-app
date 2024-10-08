import {
  fql,
  AbortError,
  type DocumentT,
  type Page,
  ServiceError,
} from "fauna";
import { docTo } from "../../fauna/util";
import { Request, Response, Router, NextFunction } from "express";
import { faunaClient } from "../../fauna/fauna-client";
import { Order, OrderItem } from "./orders.model";
import {
  validateOrderItem,
  validateGetOrders,
  validateOrderUpdate,
} from "../../middleware/orders";
import { errorHandler } from "../../middleware/errors";
import { PaginatedRequest } from "../../types";

const router = Router();

// Define an object to use for consistent Order responses.
const orderResponse = fql`{
    id: order.id,
    payment: order.payment,
    createdAt: order.createdAt.toString(),
    status: order.status,
    total: order.total,
    items: order.items.toArray().map((item) => {
      product: {
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        description: item.product.description,
        stock: item.product.stock,
        category: {
          id: item.product.category.id,
          name: item.product.category.name,
          description: item.product.category.description
        }
      },
      quantity: item.quantity
    }),
    customer: {
      id: order.customer.id,
      name: order.customer.name,
      email: order.customer.email,
      address: order.customer.address
    }
  }
  `;

/**
 * Get an order by id.
 * @route {GET} /orders/:id
 * @param id
 * @returns Order
 */
router.get(
  "/orders/:id",
  async (req: Request, res: Response, next: NextFunction) => {
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
        fql`let order: Any = Order.byId(${id})!
        // Return the order as an OrderResponse object.
        ${orderResponse}
        `
      );

      // Return the order, stripping out any unnecessary fields.
      return res.status(200).send(docTo<Order>(order));
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
      // Pass other errors to the generic error-handling middleware.
      next(error);
    }
  }
);

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
  async (req: Request, res: Response, next: NextFunction) => {
    // Extract the id from the request parameters.
    const { id } = req.params;
    // Extract the status and payment fields from the request body.
    const { status, payment = {} } = req.body;

    // Define an FQL query to update the order. The query first retrieves the order by id
    // using the Order.byId function. If the order does not exist, Fauna will throw a document_not_found
    // error. We then use the validateOrderStatusTransition UDF to ensure that the order status transition
    // is valid. If the transition is not valid, the UDF will throw an abort error.
    const query = fql`
      let order: Any = Order.byId(${id})!
      // Validate the order status transition if a status is provided.
      if (${status !== undefined}) {
        validateOrderStatusTransition(order!.status, ${status})
      }
      // If the order status is not "cart" and a payment is provided, throw an error.
      if (order!.status != "cart" && ${payment !== undefined}) {
        abort("Can not update payment information after an order has been placed.")
      }
      // Update the order with the new status and payment information.
      order.update(${{ status, payment }})
      // Return the order as an OrderResponse object.
      ${orderResponse}
    `;

    try {
      // Connect to fauna using the faunaClient. The query method accepts
      // an FQL query as a parameter as well as an optional return type. In this
      // case, we are using the DocumentT type to specify that the query will return
      // a single document representing an Order.
      const { data: order } = await faunaClient.query<DocumentT<Order>>(
        // If the new order status is "processing" call the checkout UDF to process the checkout. The checkout
        // function definition can be found in 'server/schema/functions.fsl'. It is responsible
        // for validating that the order in a valid state to be processed and decrements the stock
        // of each product in the order. This ensures that the product stock is updated in the same transaction
        // as the order status.
        status === "processing"
          ? fql`let order: Any = checkout(${id}, ${status}, ${payment})
            ${orderResponse}
            `
          : query
      );

      // Return the updated order, stripping out any unnecessary fields.
      return res.status(200).send(docTo<Order>(order));
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
      // Pass other errors to the generic error-handling middleware.
      next(error);
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
  async (req: PaginatedRequest, res: Response, next: NextFunction) => {
    // Extract the customer id from the request parameters.
    const { id: customerId } = req.params;
    // Decode the nextToken from the query parameter, if it exists.
    const decodedNextToken = req.query.nextToken
      ? decodeURIComponent(req.query.nextToken as string)
      : undefined;

    // Extract the pageSize query parameter.
    const pageSizeNumber = Number(req.query.pageSize || 10);

    // Define an FQL query to retrieve a page of orders for a given customer.
    // Get the Customer document by id, using the ! operator to assert that the document exists.
    // If the document does not exist, Fauna will throw a document_not_found error. We then
    // use the Order.byCustomer index to retrieve all orders for that customer and map over
    // the results to return only the fields we care about.
    const query = fql`
      let customer: Any = Customer.byId(${customerId})!
      Order.byCustomer(customer).pageSize(${pageSizeNumber}).map((order) => {
        let order: Any = order
        // Return the order as an OrderResponse object.
        ${orderResponse}
      })
    `;

    try {
      // Note that the query return type does not need to be wrapped in a DocumentT type because
      // we are picking out the fields we want to return in the query itself as opposed to
      // returning the entire document.
      const { data: page } = await faunaClient.query<Page<Order>>(
        // If a nextToken is provided, use the Set.paginate function to get the next page of orders.
        // Otherwise, use the query defined above which will fetch the first page of orders.
        decodedNextToken ? fql`Set.paginate(${decodedNextToken})` : query
      );

      // Encode the nextToken before sending it back to the client.
      // The raw after cursor can contain special characters.
      const encodedNextToken = page.after ? encodeURIComponent(page.after) : null;

      // Return the page of orders and the next token to the user. The next token can be passed back to
      // the server to retrieve the next page of orders.
      return res
        .status(200)
        .send({ results: page.data, nextToken: encodedNextToken});
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
      // Pass other errors to the generic error-handling middleware.
      next(error);
    }
  }
);

/**
 * Get a customer's cart. Create one if it does not exist.
 * @route {POST} /customer/:id/cart
 * @param id
 * @returns Order
 */
router.post(
  "/customers/:id/cart",
  async (req: Request, res: Response, next: NextFunction) => {
    // Extract the id from the request parameters.
    const { id } = req.params;

    try {
      // Connect to fauna using the faunaClient. The query method accepts
      // an FQL query as a parameter as well as an optional return type. In this
      // case, we are using the DocumentT type to specify that the query will return
      // a single document representing an Order.
      const { data: cart } = await faunaClient.query<DocumentT<Order>>(
        // Call our getOrCreateCart UDF to get the customer's cart. The function
        // definition can be found 'server/schema/functions.fsl'.
        fql`let order: Any = getOrCreateCart(${id})
        // Return the cart as an OrderResponse object.
        ${orderResponse}
        `
      );

      // Return the cart, stripping out any unnecessary fields.
      return res.status(200).send(docTo<Order>(cart));
    } catch (error: any) {
      // A ServiceError represents an error that occurred within Fauna.
      if (error instanceof ServiceError) {
        if (error.code === "document_not_found") {
          // If the customer does not exist, return a 404.
          return res
            .status(404)
            .send({ message: `No customer with id '${id}' exists.` });
        }
      }
      // Pass other errors to the generic error-handling middleware.
      next(error);
    }
  }
);

/**
 * Add an item to a customer's cart. Update the quantity if it already exists.
 * @route {POST} /customers/:id/cart/item
 * @param id
 * @bodyparam product
 * @bodyparam quantity
 * @returns Order
 */
router.post(
  "/customers/:id/cart/item",
  validateOrderItem,
  async (req: Request, res: Response, next: NextFunction) => {
    // Extract the customer id from the request parameters.
    const { id: customerId } = req.params;
    // Extract the product name and quantity from the request body.
    const { productName, quantity } = req.body;

    try {
      // Connect to fauna using the faunaClient. The query method accepts
      // an FQL query as a parameter as well as an optional return type. In this
      // case, we are using the DocumentT type to specify that the query will return
      // a single document representing an OrderItem.
      const { data: cartItem } = await faunaClient.query<DocumentT<OrderItem>>(
        // Call our createOrUpdateCartItem UDF to add an item to the customer's cart. The function
        // definition can be found 'server/schema/functions.fsl'.
        fql`let order: Any = createOrUpdateCartItem(${customerId}, ${productName}, ${quantity})
        // Return the cart as an OrderResponse object.
        ${orderResponse}
        `
      );

      // Return the cart item, stripping out any unnecessary fields.
      return res.status(200).send(docTo<OrderItem>(cartItem));
    } catch (error: any) {
      // We defined several abort contitions in the updateCartItem UDF.
      // Use them to return appropriate error messages.
      if (error instanceof AbortError) {
        return res.status(400).send({
          message: error.abort,
        });
      }
      // A ServiceError represents an error that occurred within Fauna.
      if (error instanceof ServiceError) {
        if (error.code === "document_not_found") {
          // If the customer does not exist, return a 404.
          return res
            .status(404)
            .send({ message: `No customer with id '${customerId}' exists.` });
        }
      }
      // Pass other errors to the generic error-handling middleware.
      next(error);
    }
  }
);

/**
 * Get a customer's cart.
 * @route {GET} /customer/:id/cart
 * @param id
 * @returns Cart
 */
router.get(
  "/customers/:id/cart",
  async (req: Request, res: Response, next: NextFunction) => {
    // Extract the id from the request parameters.
    const { id } = req.params;

    try {
      // Connect to fauna using the faunaClient. The query method accepts
      // an FQL query as a parameter as well as an optional return type. In this
      // case, we are using the DocumentT type to specify that the query will return
      // a single document representing an Order.
      const { data: cart } = await faunaClient.query<DocumentT<Order>>(
        // Get the customer's cart by id, using the ! operator to assert that the document exists.
        // If the document does not exist, Fauna will throw a document_not_found error.
        fql`let order: Any = Customer.byId(${id})!.cart
        // Return the order as an OrderResponse object.
        ${orderResponse}
        `
      );

      // Return the cart, stripping out any unnecessary fields.
      return res.status(200).send(docTo<Order>(cart));
    } catch (error: any) {
      // A ServiceError represents an error that occurred within Fauna.
      if (error instanceof ServiceError) {
        if (error.code === "document_not_found") {
          // If the customer does not exist, return a 404.
          return res
            .status(404)
            .send({ message: `No customer with id '${id}' exists.` });
        }
      }
      // Pass other errors to the generic error-handling middleware.
      next(error);
    }
  }
);

// Use the middleware to handle 401 and other generic errors.
router.use(errorHandler);

export default router;
