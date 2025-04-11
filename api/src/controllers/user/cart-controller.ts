import { calculateRoadDistance } from "@/lib/util";
import { Config } from "@/models/config-model";
import { CouponModel } from "@/models/coupon-model";
import { Dipping } from "@/models/dippings-model";
import { Product } from "@/models/product";
import { StoreModel } from "@/models/store-model";
import { User } from "@/models/user-model";
import { Address } from "@/models/user/address-model";
import { CartModel } from "@/models/user/cart-model";
import { StoreType } from "@/types";
import { add, format } from "date-fns";
import Elysia, { t } from "elysia";
import mongoose from "mongoose";

export const userCartController = new Elysia({
  prefix: "/cart",
  detail: {
    tags: ["User - Cart"],
    security: [{ bearerAuth: [] }],
  },
})
.get(
  "/",
  async ({ store, set, query }) => {
    const userId = (store as StoreType)["id"];
    const { addressId, couponId } = query;

    try {
      const cart = await CartModel.findOne(
        {
          user: new mongoose.Types.ObjectId(userId),
          status: "active",
        },
      ).populate({
        path: "products.productId",
        select: "productName price images gst discount onMRP strikePrice",
      });

      if (!cart) {
        return { message: "No active cart found", status: false };
      }

      const user = await User.findById(userId);
      if (!user) {
        return { message: "User not found", status: false };
      }

      // Calculate total tax
      let totalTax = 0;
      let subtotal = 0;

      for (const product of cart.products) {
        let _product = product as any;
        let price = _product.productId?.price || 0;

        const productId = _product.productId?._id?.toString();

        // Check for attempts within the user's attempts array
        const attempt = user.attempts.find(a => a.productId === productId);

        if (attempt) {
          const lastAttempt = attempt.attempts[attempt.attempts.length - 1];
          if (lastAttempt?.amount) {
            price = lastAttempt.amount;
          }
        }

        _product.price = price;
        _product.totalAmount = price * _product.quantity;

        const quantity = _product.quantity || 1;

        subtotal += _product.totalAmount;

        const gstAmount = (price * quantity * (_product.productId?.gst || 0)) / 100;
        totalTax += gstAmount;
      }

      const roundedTax = Math.round(totalTax * 100) / 100;
      const totalPrice = subtotal + roundedTax;

      cart.tax = roundedTax;
      cart.subtotal = subtotal;
      cart.totalPrice = totalPrice;

      // Find available coupons
      const availableCoupons = await CouponModel.find({
        active: true,
        minPrice: { $lte: totalPrice },
        maxPrice: { $gte: totalPrice },
      }).sort({ discount: -1 });

      // Fetch store location
      let storeData = await StoreModel.findOne({});
      let storeCords = {
        lat: storeData?.latitude || "8.176293718844061",
        long: storeData?.longitude || "8.176293718844061",
      };

      // Handle address & delivery calculations
      if (addressId) {
        const config = await Config.findOne();
        if (!config) throw new Error("Config not found");

        let { freeDeliveryMinDistance = 0, deliveryFreeAfter = 0 } = config;

        const address = await Address.findById(addressId);
        if (address) {
          const {
            distance: { value: calculatedDistance },
            duration: { value: calculatedSeconds },
          } = await calculateRoadDistance(
            Number(storeCords.lat),
            Number(storeCords.long),
            Number(address.latitude),
            Number(address.longitude),
            []
          );

          cart.totalDistance = calculatedDistance;
          cart.deliverySeconds = calculatedSeconds;
          cart.platformFee = 5;

          let distanceToCharge = Math.max(calculatedDistance / 1000 - freeDeliveryMinDistance, 0);
          let deliveryFee = Math.ceil(distanceToCharge * 10);

          if (deliveryFreeAfter > 0 && totalPrice >= deliveryFreeAfter) {
            deliveryFee = 0;
          }

          cart.deliveryFee = deliveryFee;
        }
      } else {
        cart.totalDistance = 0;
        cart.deliverySeconds = 0;
        cart.deliveryFee = 0;
        cart.platformFee = 5;
      }

      await cart.save();

      return {
        message: "Cart details retrieved successfully",
        status: true,
        totalDistance: cart.totalDistance,
        cart,
        deliveryFee: cart.deliveryFee,
        platformFee: cart.platformFee,
        coupons: availableCoupons,
        deliverySeconds: cart.deliverySeconds,
        deliveryMinutes: Math.ceil(cart.deliverySeconds / 60),
      };
    } catch (error) {
      console.log(error);
      set.status = 500;
      return {
        message: "Failed to get cart",
        status: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
  {
    detail: {
      summary: "Get a user's cart",
      description: "Retrieve the user's active cart with updated pricing and delivery details.",
    },
    query: t.Object({
      addressId: t.Optional(
        t.String({
          pattern: "^[a-fA-F0-9]{24}$",
        })
      ),
      couponId: t.Optional(
        t.String({
          default: "",
        })
      ),
    }),
  }
)


.post(
  "/update",
  async ({ body, set, store }) => {
    const { products } = body;
    const userId = (store as StoreType)["id"];

    try {
      const user = await User.findById(userId);
      if (!user) {
        set.status = 404;
        return { message: "User not found", status: false };
      }

      let cart = await CartModel.findOne({ user: userId, status: "active" });

      if (!cart) {
        cart = await CartModel.create({
          user: userId,
          products: [],
          status: "active",
        });
      }

      let totalTax = 0;
      let updatedProducts = [...cart.products];

      for (const product of products) {
        const productDoc = await Product.findById(product.productId).select("price gst");
        if (!productDoc) {
          set.status = 404;
          return { message: `Product ${product.productId} not found`, status: false };
        }

        if (product.quantity < 1) {
          set.status = 400;
          return { message: `Invalid quantity for product ${product.productId}`, status: false };
        }

        const gstAmount = (productDoc.price * product.quantity * productDoc.gst) / 100;
        totalTax += gstAmount;

        const existingProductIndex = updatedProducts.findIndex(
          (p) => p.productId.toString() === product.productId
        );

        const productTotal = product.quantity * productDoc.price;

        if (existingProductIndex === -1) {
          updatedProducts.push({
            productId: productDoc._id,
            quantity: product.quantity,
            totalAmount: productTotal,
            price: productDoc.price,
            options: product.options || [],// <-- ✅ store dynamic options
          });
        } else {
          updatedProducts[existingProductIndex].quantity = product.quantity;
          updatedProducts[existingProductIndex].totalAmount = productTotal;
          updatedProducts[existingProductIndex].price = productDoc.price;
          updatedProducts[existingProductIndex].options = product.options || []; 
        }
      }

      const subtotal = updatedProducts.reduce((sum, product) => sum + product.totalAmount, 0);
      const tax = Number(totalTax.toFixed(2));
      const totalPrice = subtotal + tax;

      cart = await CartModel.findOneAndUpdate(
        { _id: cart._id },
        {
          $set: {
            products: updatedProducts,
            subtotal,
            tax,
            totalPrice,
            lastUpdated: new Date(),
          },
        },
        { new: true }
      );

      return {
        message: "Cart updated successfully",
        status: true,
        cart,
      };
    } catch (error) {
      console.error(error);
      set.status = error instanceof Error && error.message.includes("not found") ? 404 : 400;
      return {
        message: "Failed to update cart",
        status: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
)


  .post(
    "/updatequantity",
    async ({ body, set, store }) => {
      const { productId, quantity } = body;
      const userId = (store as StoreType)["id"];

      try {
        const user = await User.findById(userId);
        if (!user) {
          set.status = 404;
          throw new Error("User not found");
        }

        const cart = await CartModel.findOne({
          user: userId,
          status: "active",
        });

        if (!cart) {
          set.status = 404;
          throw new Error("Cart not found");
        }

        const productDoc = await Product.findById(productId);
        if (!productDoc) {
          set.status = 404;
          throw new Error("Product not found");
        }

        if (quantity < 1) {
          set.status = 400;
          throw new Error("Invalid quantity");
        }

        const existingProductIndex = cart.products.findIndex(
          (p) => p.productId.toString() === productId
        );

        if (existingProductIndex === -1) {
          set.status = 404;
          throw new Error("Product not found in cart");
        }

        const existingProduct = cart.products[existingProductIndex];
    

        const productGstAmount =
          (productDoc.price * productDoc.gst * quantity) / 100;

        let totalTax = productGstAmount;

        // @ts-ignore
        cart.products[existingProductIndex] = {
          ...existingProduct,
          quantity: quantity,
          totalAmount: quantity * productDoc.price,
          productId: productDoc._id,
          price: productDoc.price,
          name: productDoc.productName,
        };

        const subtotal = cart.products.reduce(
          (sum, product) => sum + product.totalAmount,
          0
        );
        const roundedTax = Math.round(totalTax * 100) / 100;

        const totalPrice = subtotal + roundedTax;

        const updatedCart = await CartModel.findOneAndUpdate(
          { _id: cart._id },
          {
            $set: {
              products: cart.products,
              subtotal,
              tax: roundedTax,
              totalPrice,
              lastUpdated: new Date(),
            },
          },
          { new: true }
        );

        return {
          message: "Cart updated successfully",
          status: true,
          cart: updatedCart,
        };
      } catch (error) {
        console.error(error);
        set.status = set.status || 400;
        return {
          message: "Failed to update cart",
          status: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    {
      detail: {
        summary: "Update product quantity",
        description: "Update product quantity for an existing product in cart",
      },
      body: t.Object({
        productId: t.String({
          pattern: "^[a-fA-F0-9]{24}$",
        }),
        quantity: t.Number({
          minimum: 1,
        }),
      }),
    }
  )
  .delete(
    "/remove-product/:productId",
    async ({ params, set, store }) => {
      const userId = (store as StoreType)["id"];
      const { productId } = params;

      try {
        let cart = await CartModel.findOne({
          user: userId,
          status: "active",
        });

        if (!cart) {
          set.status = 404;
          throw new Error("Cart not found");
        }

        cart = await CartModel.findOneAndUpdate(
          { _id: cart._id },
          {
            $pull: {
              products: { productId: new mongoose.Types.ObjectId(productId) },
            },
          },
          { new: true }
        );

        if (!cart) {
          set.status = 404;
          throw new Error("Product not found in cart");
        }

        const subtotal = cart.products.reduce(
          (sum, product) => sum + product.totalAmount,
          0
        );
        const tax = subtotal;
        const totalPrice = subtotal + tax;

        cart = await CartModel.findOneAndUpdate(
          { _id: cart._id },
          {
            $set: {
              subtotal,
              tax,
              totalPrice,
              lastUpdated: new Date(),
            },
          },
          { new: true }
        );

        return {
          message: "Product removed from cart",
          status: true,
          cart,
        };
      } catch (error) {
        set.status = 404;
        return {
          message: "Failed to remove product",
          status: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    {
      params: t.Object({
        productId: t.String({
          pattern: `^[a-fA-F0-9]{24}$`,
        }),
      }),
      detail: {
        summary: "Delete a users cart",
        description: "Delete a users cart",
      },
    }
  )
  .delete(
    "/removeall",
    async ({ set, store }) => {
      const userId = (store as StoreType)["id"];

      try {
        const cart = await CartModel.findOne({
          user: userId,
          status: "active",
        });

        if (!cart) {
          set.status = 404;
          throw new Error("Cart not found");
        }

        cart.products = [];
        cart.subtotal = 0;
        cart.tax = 0;
        cart.totalPrice = 0;

        await cart.save();

        return {
          message: "Cart removed successfully",
          status: true,
          cart,
        };
      } catch (error) {
        console.error(error);
        set.status = 500;
        return {
          message: "Failed to remove cart",
          status: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    {
      detail: {
        summary: "Delete all products from user cart.",
        description: "Delete all products from user cart.",
      },
    }
  )
  .get(
    "/count",
    async ({ store, set }) => {
      const userId = (store as StoreType)["id"];

      try {
        const cart = await CartModel.findOne({
          user: new mongoose.Types.ObjectId(userId),
          status: "active",
        });

        if (!cart) {
          return {
            message: "No active cart found",
            status: true, // Still a successful response, just no cart
            count: 0,
          };
        }

        const productCount = cart.products.length;

        return {
          message: "Cart product count retrieved successfully",
          status: true,
          count: productCount,
        };
      } catch (error) {
        console.log(error);
        set.status = 500;
        return {
          message: "Failed to get cart product count",
          status: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    {
      detail: {
        summary: "Get user's cart product count",
        description: "Retrieve the number of products in the user's active cart",
      },
    }
  )