import { fql, AbortError, type DocumentT, type Page } from "fauna";
import { Request, Response, Router } from "express";
import { faunaClient } from "../../fauna/fauna-client";
import { Order, OrderItem } from "./orders.model";
import { validateOrderUpdate } from "../../middlewares";

const router = Router();

/**
 * Get an order by its ID.
 * @route {GET} /orders/:id
 * @param id string
 * @returns Order
 */
router.get("/orders/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { data: order } = await faunaClient.query<DocumentT<Order>>(
      fql`
        let order = Order.byId(${id})
        if (order == null) { abort("No order with id exists.") }
        order
      `
    );

    return res.status(200).send(order);
  } catch (error: any) {
    // Handle any abort conditions we defined in the UDF.
    if (error instanceof AbortError) {
      return res.status(400).send({ reason: error.abort });
    }

    return res
      .status(500)
      .send({ reason: "The request failed unexpectedly.", error });
  }
});

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
 * Update a order item
 * @route {PATCH} /order/:id
 * @param id string
 * @bodyparam order
 */

router.patch(
  "/orders/:id",
  validateOrderUpdate,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, payment } = req.body;

    try {
      const { data: updatedOrder } = await faunaClient.query<DocumentT<Order>>(
        fql`
        let order = Order.byId(${id})

        if (order == null) {
          abort("Order does not exist.")
        }

        // Check the logic transition of the order status
        if (order!.status == "cart" && (${status} != null && ${status} != "processing")) {
          abort("Invalid status transition.")
        }
        if (order!.status == "processing" && (${status} != null && ${status} != "shipped")) {
          abort("Invalid status transition.")
        }
        if (order!.status == "shipped" && (${status} != null && ${status} != "delivered")) {
          abort("Invalid status transition.")
        }

        order!.update(${{ status, payment }})
      `
      );

      return res.status(200).send(updatedOrder);
    } catch (error: any) {
      if (error instanceof AbortError) {
        return res.status(400).send({
          reason: error.abort,
        });
      }
      return res
        .status(500)
        .send({ reason: "The request failed unexpectedly.", error });
    }
  }
);

/**
 * Get a customer's orders.
 * @route {POST} /customers/:id/orders
 * @param id string
 * @bodyparam pageSize
 * @bodyparam nextToken
 * @returns Order[]
 */
router.post("/customers/:id/orders", async (req: Request, res: Response) => {
  const { id: customerId } = req.params;
  const { nextToken = undefined, pageSize = 10 } = req.body;

  const q = fql`
    let customer = Customer.byId(${customerId})
    if (customer == null) abort("Customer does not exist.")
    Order.byCustomer(customer).pageSize(${pageSize})
  `;
  const qPage = fql`Set.paginate(${nextToken})`;

  try {
    const { data: page } = await faunaClient.query<Page<DocumentT<Order>>>(
      nextToken ? qPage : q
    );

    return res.status(200).send({ results: page.data, nextToken: page.after });
  } catch (error: any) {
    // Handle any abort conditions we defined in the UDF.
    if (error instanceof AbortError) {
      return res.status(400).send({ message: error.abort });
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
