import { Product } from "@/models/product";
import { User } from "@/models/user-model";
import { Favorites } from "@/models/user/favorites-model";
import { StoreType } from "@/types";
import { add, format } from "date-fns";
import Elysia, { t } from "elysia";
import { isValidObjectId } from "mongoose";

export const favoritesController = new Elysia({
  prefix: "/favorites",
  detail: {
    tags: ["User - Favorites"],
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
})
  .post(
    "/favorite",
    async ({ body, set, store }) => {
      const { productId } = body;
      const userId = (store as StoreType)["id"];

      if (!isValidObjectId(userId) || !isValidObjectId(productId)) {
        set.status = 400;
        return { message: "Invalid user or product id", status: false };
      }

      const [product, user] = await Promise.all([
        Product.findById(productId),
        User.findById(userId),
      ]);

      if (!product || !user) {
        set.status = 404;
        return { message: "Product or user not found", status: false };
      }

      let favorite = await Favorites.findOne({ user: userId });
      let action: "added" | "removed";

      if (!favorite) {
        favorite = new Favorites({ user: userId, products: [productId] });
        action = "added";
      } else if (!favorite.products.includes(productId)) {
        favorite.products.push(productId);
        action = "added";
      } else {
        favorite = await Favorites.findOneAndUpdate(
          { user: userId },
          { $pull: { products: productId } },
          { new: true }
        );
        action = "removed";
      }

      if (favorite) await favorite.save();

      return { message: `Favorite ${action} successfully`, status: true };
    },
    {
      body: t.Object({ productId: t.String() }),
      detail: {
        summary: "Add / Remove a product to favorites",
        description: "Add or remove a product to user's favorites",
      },
    }
  )
  .get(
    "/getfavorites",
    async ({ store, query }) => {
      const userId = (store as StoreType)["id"];
      const { page, limit, type } = query;

      let filter: any = { user: userId };

      let currentServerTime = format(new Date(), "HH:mm");

      if (process.env.ENV === "PROD") {
        const updatedTime = add(new Date(), { hours: 5, minutes: 30 });
        currentServerTime = format(updatedTime, "HH:mm");
      }

      try {
        let _limit = limit || 10;
        let _page = page || 1;

        const favorites = await Favorites.find(filter)
          .populate({
            path: "products",
            match: type ? { type } : {},
            select: "-dippings -foodsuggetions",
            populate: [
              {
                path: "suggetions",
                select: "name icon",
              },
              {
                path: "timing",
              },
              {
                path: "category",
                select: "_id active", // Keep active for filtering but transform later
              },
            ],
          })
          .skip((_page - 1) * _limit)
          .limit(_limit)
          .lean()
          .exec();

        const updatedFavorites = favorites.map((favorite) => {
          favorite.products = favorite.products
            .filter((product: any) => product.category?.active) // Filter based on active
            .map((product: any) => {
              const isAvailable = product?.timing.some((time: any) => {
                const isWithinTimeRange =
                  currentServerTime >= time.startTime &&
                  currentServerTime <= time.endTime;
                return isWithinTimeRange;
              });

              // Transform the category object to just the ID
              const productWithId = {
                ...product,
                category: product.category._id, // Keep only the ID in response
                available: isAvailable,
              };

              return productWithId;
            });
          return favorite;
        });

        return {
          message: "Favorites fetched successfully",
          status: true,
          favorites: updatedFavorites,
        };
      } catch (error) {
        console.error(error);

        return {
          error: error instanceof Error ? error.message : "Unknown error",
          status: false,
        };
      }
    },
    {
      detail: {
        summary: "Get user's favorites",
        description: "Get user's favorites",
      },
      query: t.Object({
        page: t.Number({
          default: 1,
        }),
        limit: t.Number({
          default: 10,
        }),
        type: t.Optional(t.String()),
      }),
    }
  );
  // .get(
  //   "/getfavorites",
  //   async ({ store, query }) => {
  //     const userId = (store as StoreType)["id"];
  //     const { page, limit, type } = query;

  //     let filter: any = { user: userId };

  //     let currentServerTime = format(new Date(), "HH:mm");

  //     if (process.env.ENV === "PROD") {
  //       const updatedTime = add(new Date(), { hours: 5, minutes: 30 });
  //       currentServerTime = format(updatedTime, "HH:mm");
  //     }

  //     try {
  //       let _limit = limit || 10;
  //       let _page = page || 1;

  //       const favorites = await Favorites.find(filter)
  //         .populate({
  //           path: "products",
  //           match: type ? { type } : {},
  //           select: "-dippings -foodsuggetions",
  //           populate: [
  //             {
  //               path: "suggetions",
  //               select: "name icon",
  //             },
  //             {
  //               path: "timing",
  //             },
  //             {
  //               path: "category", 
  //               select: "active",
  //             },
  //           ],
  //         })
  //         .skip((_page - 1) * _limit)
  //         .limit(_limit)
  //         .lean()
  //         .exec();

  //       const updatedFavorites = favorites.map((favorite) => {
  //         favorite.products = favorite.products
  //         // .filter((product: any) => product.category?.active)
  //         .map((product: any) => {
  //           const isAvailable = product?.timing.some((time: any) => {
  //             const isWithinTimeRange =
  //               currentServerTime >= time.startTime &&
  //               currentServerTime <= time.endTime;
  //             return isWithinTimeRange;

  //           });

  //           return {
  //             ...product,
  //             available: isAvailable,
  //           };
  //         });
  //         return favorite;
  //       });
  //       return {
  //         message: "Favorites fetched successfully",
  //         status: true,
  //         favorites: updatedFavorites,
  //       };
  //     } catch (error) {
  //       console.error(error);

  //       return {
  //         error: error instanceof Error ? error.message : "Unknown error",
  //         status: false,
  //       };
  //     }
  //   },
  //   {
  //     detail: {
  //       summary: "Get user's favorites",
  //       description: "Get user's favorites",
  //     },
  //     query: t.Object({
  //       page: t.Number({
  //         default: 1,
  //       }),
  //       limit: t.Number({
  //         default: 10,
  //       }),
  //       type: t.Optional(t.String()),
  //     }),
  //   }
  // );
