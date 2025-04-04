import { sendNotification } from "@/lib/firebase";
// import { razor } from "@/lib/razorpay";
import { generateRandomString } from "@/lib/util";
import { broadcastMessage } from "@/lib/ws-store";
import { CouponModel } from "@/models/coupon-model";
import { RestaurentModel } from "@/models/restaurent-model";
import { User } from "@/models/user-model";
import { Address } from "@/models/user/address-model";
import { CartModel } from "@/models/user/cart-model";
import { OrderModel } from "@/models/user/order-model";
import { StoreType } from "@/types";
import axios from "axios";
import Elysia, { t } from "elysia";
import mongoose from "mongoose";

export const userOrderController = new Elysia({
  prefix: "/orders",
  detail: {
    tags: ["User - Orders"],
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
})
  // .post(
  //   "/order",
  //   async ({ set, store, body }) => {
  //     const userId = (store as StoreType)["id"];

  //     const { addressId, couponId, razorPayResponse } = body;

  //     try {
  //       const cart = await CartModel.findOne({
  //         user: new mongoose.Types.ObjectId(userId),
  //         status: "active",
  //       });

  //       const user = await User.findById(userId);

  //       if (!cart) {
  //         set.status = 404;
  //         return { message: "No active cart found", status: false };
  //       }

  //       if (!user) {
  //         set.status = 404;
  //         return { message: "User not found", status: false };
  //       }

  //       const address = await Address.findById(addressId);

  //       if (!address) {
  //         set.status = 404;
  //         return { message: "Address not found", status: false };
  //       }

  //       let restaurent = await RestaurentModel.findOne({});

  //       let orderId = generateRandomString(6, "KCS");

  //       const razorPayRes = JSON.parse(
  //         razorPayResponse ? razorPayResponse : "{}"
  //       );

  //       const order = new OrderModel({
  //         user: cart.user,
  //         restaurent: restaurent?._id,
  //         products: cart.products,
  //         addressId: address._id,
  //         deliveryAgent: null,
  //         deliveryTime: null,
  //         deliverySeconds: cart.deliverySeconds,
  //         distance: cart.totalDistance,
  //         platformFee: cart.platformFee || 0,
  //         deliveryPrice: cart.deliveryFee || 0,
  //         subtotal: cart.subtotal,
  //         tax: cart.tax,
  //         totalPrice: cart.totalPrice,
  //         // temporary for launch day
  //         status: "accepted",
  //         preparationTime: 1,
  //         preparedAt: new Date(Date.now()),
  //         paymentMethod: "Online",
  //         paymentStatus: "completed",
  //         orderId,
  //         razorPayResponse: razorPayResponse ? razorPayResponse : "",
  //         razorPayId: razorPayRes ? razorPayRes["razorpay_payment_id"] : "",
  //         razorOrderId: razorPayRes ? razorPayRes["razorpay_order_id"] : "",
  //       });

  //       if (couponId) {
  //         const hisActualCouponHeUsed = await CouponModel.findById(couponId);

  //         if (hisActualCouponHeUsed) {
  //           const offer = hisActualCouponHeUsed.discount;

  //           const discountAmount = (offer / 100) * cart.totalPrice;

  //           order.couponDiscount = discountAmount;
  //           order.coupon = hisActualCouponHeUsed._id;
  //           order.couponCode = hisActualCouponHeUsed.code;

  //           order.totalPrice = cart.totalPrice - discountAmount;

  //           await order.save();
  //         }
  //       }

  //       if (!address.mapPloygonResponse || !order.mapPloygonResponse) {
  //         const response = await axios.get(
  //           `https://maps.googleapis.com/maps/api/directions/json?origin=${restaurent?.latitude},${restaurent?.longitude}&destination=${address.latitude},${address.longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`
  //         );

  //         address.mapPloygonResponse = JSON.stringify(response.data);
  //         order.mapPloygonResponse = JSON.stringify(response.data);

  //         await order.save();
  //         await address.save();
  //       }

  //       broadcastMessage(
  //         `New Order with Order ID: ${orderId} is placed by ${user.username}`
  //       );

  //       await order.save();

  //       cart.products = [];
  //       cart.subtotal = 0;
  //       cart.tax = 0;
  //       cart.totalPrice = 0;
  //       cart.deliveryFee = 0;
  //       cart.deliverySeconds = 0;
  //       cart.platformFee = 0;
  //       cart.totalDistance = 0;

  //       await cart.save();

  //       await sendNotification(
  //         user.fcmToken,
  //         "Order Placed!",
  //         `Your order #${orderId} has been placed successfully.`
  //       );

  //       return { message: "Order created successfully", status: true, order };
  //     } catch (error) {
  //       set.status = 500;
  //       return {
  //         message: "Failed to create order",
  //         status: false,
  //         error: error instanceof Error ? error.message : "Unknown error",
  //       };
  //     }
  //   },
  //   {
  //     body: t.Object({
  //       addressId: t.String({
  //         pattern: `^[a-fA-F0-9]{24}$`,
  //       }),
  //       couponId: t.Optional(t.String()),
  //       razorPayResponse: t.Optional(t.String()),
  //     }),
  //     detail: {
  //       summary: "Create order",
  //       description: "Create a new order from the user's cart",
  //     },
  //   }
  // )
  .get(
    "/trackorder",
    async ({ set, store, query }) => {
      const userId = (store as StoreType)["id"];

      const { orderId } = query;

      try {
        const order = await OrderModel.findOne(
          {
            user: userId,
            orderId,
          },
          "-user -products.suggestions -dipps"
        )
          .populate("addressId")
          .populate({
            path: "products.productId",
            select: "productName price images",
          })
          .populate({
            path: "deliveryAgent",
            select: "name phone",
          })
          .exec();

        if (!order) {
          set.status = 404;
          return { message: "Order not found", status: false };
        }

        const restaurent = await RestaurentModel.findOne({});

        if (!restaurent) {
          set.status = 404;
          return { message: "Restaurent not found", status: false };
        }

        const address = await Address.findById(order.addressId);

        if (!address) {
          set.status = 404;
          return { message: "Address not found", status: false };
        }

        const preparingTime = order.preparationTime;
        const preparationStatusUpdatedAt: any = new Date(order.preparedAt);
        const currentTime: any = new Date();

        const elapsedMinutes = Math.floor(
          (currentTime - preparationStatusUpdatedAt) / (1000 * 60)
        );

        const pendingTime = Math.max(preparingTime - elapsedMinutes, 0);

        let buttontext = "Order Placed";
        let description = "Order Confirmed, Preparing Soon\n";

        if (order.status == "pending") {
          buttontext = "Order Placed";
          description = "Order Placed Successfully";
        } else if (order.status == "accepted") {
          buttontext = "Cooking";
          description = "Order is being prepared.";
        } else if (order.status == "picked") {
          buttontext = "Out for Delivery";
          description = "Your order is on the way!";
        } else if (order.status == "delivered") {
          buttontext = "Delivered";
          description = "Your order has arrived";
        } else if (order.status == "rejected") {
          buttontext = "Cancelled";
          description = "Order has been Cancelled";
        }

        return {
          message: "Order Fetched Successfully",
          status: true,
          order,
          pendingTime,
          buttontext,
          description,
          cords: {
            lat: restaurent.latitude,
            long: restaurent.longitude,
          },
          mapPolygon: JSON.parse(order.mapPloygonResponse),
        };
      } catch (error) {
        set.status = 500;
        console.log(error);
        return {
          message: "Failed to fetch order",
          status: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    {
      query: t.Object({
        orderId: t.String(),
      }),
      detail: {
        summary: "Track order",
        description: "Get the order details of the authenticated user",
      },
    }
  )
  .get(
    "/haveactiveorder",
    async ({ set, store }) => {
      const userId = (store as StoreType)["id"];

      try {
        const order = await OrderModel.find(
          {
            user: userId,
            status: {
              $nin: ["cancelled", "delivered", "rejected"],
            },
          },
          "orderId _id deliverySeconds status"
        )
          .sort({ createdAt: -1 })
          .lean()
          .exec();

        if (!order) {
          return { message: "Order not found", status: false };
        }

        let buttontext = "Order Placed";
        let description = "Order Confirmed, Preparing Soon\n";

        let stateGif = "uploads/delivery.gif";

        let _orders = order.map((o) => {
          if (o.status == "pending") {
            buttontext = "Order Placed";
            description = "Order Placed Successfully";
          } else if (o.status == "accepted") {
            buttontext = "Cooking";
            description = "Order is being prepared.\n";
          } else if (o.status == "picked") {
            buttontext = "OutFor Delivery";
            description = "Your order is on the way!\n";
          } else if (o.status == "delivered") {
            buttontext = "Delivered";
            description = "Your order has arrived\n";
          }

          return {
            ...o,
            buttontext,
            description,
            stateGif,
          };
        });

        return {
          message: "Order Fetched Successfully",
          status: true,
          order: _orders,
        };
      } catch (error) {
        set.status = 500;
        return {
          message: "Failed to fetch order",
          status: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    {
      detail: {
        summary: "Find if user has an active order",
        description: "Get if the user has an active order",
      },
    }
  )
  .get(
    "/orderhistory",
    async ({ set, store }) => {
      const userId = (store as StoreType)["id"];

      try {
        const orders = await OrderModel.find(
          { user: userId },
          "-user -products.suggestions -dipps -products.dips -addressId"
        )
          .populate({
            path: "products.productId",
            select: "productName price images",
          })
          .populate({
            path: "deliveryAgent",
            select: "name phone",
          })
          .sort({ createdAt: -1 })
          .lean()
          .exec();

        return {
          message: "Order Fetched Successfully",
          status: true,
          orders,
        };
      } catch (error) {
        set.status = 500;
        return {
          message: "Failed to fetch order",
          status: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    {
      detail: {
        summary: "Get order history",
        description: "Get the order history of the authenticated user",
      },
    }
  )
  // .patch(
  //   "/rateorder",
  //   async ({ set, store, body }) => {
  //     const userId = (store as StoreType)["id"];

  //     const { orderId, rating, feedback } = body;

  //     try {
  //       const order = await OrderModel.findOneAndUpdate(
  //         { user: userId, _id: orderId },
  //         { $set: { rating: rating || 0, feedback: feedback || "" } },
  //         { new: true }
  //       );

  //       if (!order) {
  //         set.status = 404;
  //         return { message: "Order not found", status: false };
  //       }

  //       return {
  //         message: "Order rated successfully",
  //         status: true,
  //         order,
  //       };
  //     } catch (error) {
  //       set.status = 500;
  //       return {
  //         message: "Failed to rate order",
  //         status: false,
  //         error: error instanceof Error ? error.message : "Unknown error",
  //       };
  //     }
  //   },
  //   {
  //     body: t.Object({
  //       orderId: t.String({
  //         pattern: `^[a-fA-F0-9]{24}$`,
  //       }),
  //       rating: t.Optional(t.Number()),
  //       feedback: t.Optional(
  //         t.String({
  //           minLength: 1,
  //           maxLength: 500,
  //           default: "",
  //         })
  //       ),
  //     }),
  //     detail: {
  //       summary: "Rate order",
  //       description: "Rate an order",
  //     },
  //   }
  // )
  .get(
    "/:id",
    async ({ params }) => {
      try {
        const { id } = params;

        const product = await OrderModel.findById(id)
          .populate({
            path: "restaurent",
            select: "restaurentName restaurentAddress restaurentImage",
          })
          .populate({
            path: "addressId",
            select: "receiverName landmark area flatorHouseno receiverMobile",
          })
          .populate({
            path: "products.productId",
            select: "images productName",
          });

        return {
          message: "Order Fetched Successfully",
          data: product,
          status: true,
        };
      } catch (error) {
        console.error(error);
        return {
          error,
          status: "error",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Get a Order by id",
      },
    }
  )
  // .post(
  //   "/cancel/:orderId",
  //   async ({ params, store, set }) => {
  //     const userId = (store as StoreType)["id"];

  //     try {
  //       const { orderId } = params;

  //       const order = await OrderModel.findOne({ _id: orderId, user: userId });

  //       if (!order) {
  //         set.status = 404;
  //         return { message: "Order not found", status: false };
  //       }

  //       const cancelableStatus = ["pending", "accepted", "assigned"];

  //       if (!cancelableStatus.includes(order.status)) {
  //         return {
  //           message: "Order cannot be cancelled",
  //           status: false,
  //         };
  //       }

  //       const user = await User.findById(order?.user);

  //       if (!user) {
  //         set.status = 404;
  //         return { message: "User not found", status: false };
  //       }

  //       await sendNotification(
  //         user.fcmToken,
  //         "Order Cancelled",
  //         `Your order ${order.orderId} has been cancelled. Contact support for assistance.`
  //       );

  //       broadcastMessage(
  //         `A Order with Order ID: ${order.orderId} is cancelled by User, ${user.username}`
  //       );

  //       order.status = "cancelled";

  //       await order?.save();

  //       return {
  //         message: "Order cancelled successfully",
  //         status: true,
  //       };
  //     } catch (error) {
  //       console.error(error);
  //       return {
  //         error,
  //         status: "error",
  //       };
  //     }
  //   },
  //   {
  //     params: t.Object({
  //       orderId: t.String(),
  //     }),
  //     detail: {
  //       summary: "Cancel Order by id",
  //     },
  //   }
  // )
  // .post(
  //   "/createpayorder",
  //   async ({ body, set }) => {
  //     try {
  //       const { totalPrice } = body;

  //       const response: any = await razor.orders.create({
  //         amount: +totalPrice * 100,
  //         currency: "INR",
  //       });

  //       if (response?.error) {
  //         set.status = 500;
  //         return { message: "Failed to create order", status: false };
  //       }

  //       return {
  //         message: "Order created successfully",
  //         status: true,
  //         data: response,
  //       };
  //     } catch (error) {
  //       set.status = 500;
  //       console.error(error);
  //       return {
  //         error,
  //         status: "error",
  //       };
  //     }
  //   },
  //   {
  //     body: t.Object({
  //       totalPrice: t.String(),
  //     }),
  //     detail: {
  //       summary: "Create Order for Payment",
  //     },
  //   }
  // )
  // .post(
  //   "/createtipspaymentorder",
  //   async ({ body, set }) => {
  //     try {
  //       const { totalPrice, orderId } = body;

  //       const order = await OrderModel.findById(orderId);

  //       if (!order) {
  //         set.status = 404;
  //         return { message: "Order not found", status: false };
  //       }

  //       const response: any = await razor.orders.create({
  //         amount: +totalPrice * 100,
  //         currency: "INR",
  //       });

  //       if (response?.error) {
  //         set.status = 500;
  //         return { message: "Failed to create order", status: false };
  //       }

  //       order.tipsRazorPayId = response.id;
  //       order.tips = +totalPrice;

  //       await order.save();

  //       return {
  //         message: "Order created successfully",
  //         status: true,
  //         data: response,
  //       };
  //     } catch (error) {
  //       set.status = 500;
  //       console.error(error);
  //       return {
  //         error,
  //         status: "error",
  //       };
  //     }
  //   },
  //   {
  //     body: t.Object({
  //       totalPrice: t.String(),
  //       orderId: t.String(),
  //     }),
  //     detail: {
  //       summary: "Create Order for tips Payment",
  //     },
  //   }
  // )
  // .post(
  //   "/tipspaymentsuccess",
  //   async ({ body, set }) => {
  //     const { orderId, razorPayResponse } = body;

  //     try {
  //       const order = await OrderModel.findById(orderId);

  //       if (!order) {
  //         return {
  //           message: "Order not found",
  //           status: false,
  //         };
  //       }

  //       order.tipsRazorPayResponse = razorPayResponse;

  //       await order.save();
  //     } catch (error) {
  //       set.status = 500;
  //       console.error(error);
  //       return {
  //         error,
  //         status: "error",
  //       };
  //     }
  //   },
  //   {
  //     body: t.Object({
  //       razorPayResponse: t.String(),
  //       orderId: t.String(),
  //     }),
  //     detail: {
  //       summary: "Tips Payment Success",
  //     },
  //   }
  // );
