import req from "supertest";
import app from "../src/app";
import { faunaClient } from "../src/fauna/fauna-client";

describe("Orders", () => {
  afterAll(async () => {
    // Clean up our connection to Fauna.
    faunaClient.close();
  });

  describe("PUT /customers/:cutomerId/orders/:orderId/item", () => {
    [{}, { productName: "Lava Lamp" }, { quantity: 10 }].forEach((payload) => {
      it(`returns a 400 if it receives and invalid payload: ${payload}`, async () => {
        const res = await req(app)
          .put("/customers/1/orders/2/item")
          .send(payload);
        expect(res.status).toEqual(400);
        expect(res.body).toEqual({
          reason: "You must provide a productName and quantity.",
        });
      });
    });

    it("returns a 200 if it receives a valid payload", async () => {
      const res = await req(app).put("/customers/2/orders/2/item").send({
        productName: "Lava Lamp",
        quantity: 10,
      });
      expect(res.status).toEqual(200);
      expect(res.body.message).toEqual("Put Order Item");
    });
  });
});
