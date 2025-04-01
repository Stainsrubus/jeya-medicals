import { StoreType } from "@/types";
import { add, format } from "date-fns";
import Elysia, { t } from "elysia";
import { Types } from "mongoose";
import { Product } from "../../models/product";
import { Favorites } from "../../models/user/favorites-model";

export const productController = new Elysia({
  prefix: "/products",
  detail: {
    tags: ["User - Product"],
  },
})
.get(
  "/",
  async ({ query }) => {
    const { page, limit, q, rating, userId, category } = query;

    const _limit = limit || 10;
    const _page = page || 1;

    let matchFilter: any = { active: true, isDeleted: false };

    if (q) {
      matchFilter.$or = [{ productName: { $regex: q, $options: "i" } }];
    }

    if (rating) {
      const ratingNumber = parseInt(rating, 10);
      if (ratingNumber >= 1 && ratingNumber <= 5) {
        matchFilter.ratings = ratingNumber;
      }
    }

    try {
      const totalPromise = Product.countDocuments(matchFilter);
      const productsPromise = Product.aggregate([
        {
          $match: matchFilter,
        },
        {
          $lookup: {
            from: "productcategories",
            localField: "category",
            foreignField: "_id",
            as: "categoryDetails",
          },
        },
        {
          $unwind: "$categoryDetails",
        },
        {
          $match: {
            "categoryDetails.active": true,
          },
        },
        {
          $addFields: {
            priority: category
              ? {
                  $cond: [
                    {
                      $eq: [
                        "$categoryDetails._id",
                        new Types.ObjectId(category),
                      ],
                    },
                    0,
                    1,
                  ],
                }
              : 1,
          },
        },
        {
          $sort: { productName: 1 },
        },
        {
          $group: {
            _id: "$categoryDetails._id",
            categoryName: { $first: "$categoryDetails.name" },
            totalProducts: { $sum: 1 },
            products: {
              $push: {
                _id: "$_id",
                productName: "$productName",
                price: "$price",
                ratings: "$ratings",
                strikePrice:"$strikePrice",
                images: "$images",
                discount:"$discount",
                onMRP:"$onMRP",
                description: "$description",
                categoryId: "$categoryDetails._id",
                categoryName: "$categoryDetails.name",
              },
            },
            priority: { $first: "$priority" },
          },
        },
        {
          $sort: { priority: 1, categoryName: 1 },
        },
        {
          $skip: (_page - 1) * _limit,
        },
        {
          $limit: _limit,
        },
      ]);

      const [total, products] = await Promise.all([totalPromise, productsPromise]);
      let userFavorites: String[] = [];

      if (userId) {
        const favorites = await Favorites.findOne({ user: userId });
        userFavorites = favorites?.products || [];
      }

      const paginatedCategories = products.map((category: any) => ({
        ...category,
        products: category.products.map((product: any) => ({
          ...product,
          favorite: userFavorites.includes(product._id.toString()),
        })),
      }));

      return {
        data: paginatedCategories,
        total,
        page: _page,
        limit: _limit,
        status: true,
      };
    } catch (error) {
      console.error(error);
      return {
        error,
        status: false,
        message: "Something went wrong",
      };
    }
  },
  {
    detail: {
      summary: "Get all active products grouped by category",
    },
    query: t.Object({
      page: t.Optional(t.Number({ default: 1 })),
      limit: t.Optional(t.Number({ default: 10 })),
      q: t.Optional(t.String({ default: "" })),
      rating: t.Optional(t.String()),
      userId: t.Optional(t.String()),
      category: t.Optional(t.String()),
    }),
  }
)

  .get(
    "/topseller",
    async ({ query }) => {
      const { page, limit, userId } = query;

      let _limit = limit || 10;
      let _page = page || 1;

      let filter: any = { active: true, topSeller: true };

      try {
        let currentServerTime = format(new Date(), "HH:mm");

        if (process.env.ENV === "PROD") {
          const updatedTime = add(new Date(), { hours: 5, minutes: 30 });
          currentServerTime = format(updatedTime, "HH:mm");
        }

        let userFavorites: String[] = [];

        if (userId) {
          const favorites = await Favorites.findOne({ user: userId });
          userFavorites = favorites?.products || [];
        }

        const products = await Product.aggregate([
          { $match: filter },
          {
            $lookup: {
              from: "timings",
              localField: "timing",
              foreignField: "_id",
              as: "timingDetails",
            },
          },
          {
            $addFields: {
              timingDetails: {
                $ifNull: ["$timingDetails", []],
              },
              available: {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: "$timingDetails",
                        as: "timing",
                        cond: {
                          $and: [
                            { $lte: ["$$timing.startTime", currentServerTime] },
                            { $gte: ["$$timing.endTime", currentServerTime] },
                          ],
                        },
                      },
                    },
                  },
                  0,
                ],
              },
            },
          },
          {
            $match: {
              available: true,
            },
          },
          {
            $lookup: {
              from: "productcategories",
              localField: "category",
              foreignField: "_id",
              as: "categoryDetails",
            },
          },
          { $unwind: "$categoryDetails" },
          {
            $match: {
              "categoryDetails.active": true, 
            },
          },
          {
            $addFields: {
              favorite: {
                $in: ["$_id", userFavorites],
              },
            },
          },
          {
            $project: {
              productName: 1,
              price: 1,
              ratings: 1,
              images: 1,
              description: 1,
              type: 1,
              available: 1,
              favorite: 1,
            },
          },
          { $skip: (_page - 1) * _limit },
          { $limit: _limit },
        ]);

        const total = await Product.countDocuments(filter);
        return {
          data: products,
          total,
          page: _page,
          limit: _limit,
          status: true,
        };
      } catch (error) {
        console.error(error);
        return {
          error,
          status: false,
          message: "Something went wrong",
        };
      }
    },
    {
      detail: {
        summary: "Get all topseller products",
      },
      query: t.Object({
        page: t.Optional(t.Number({ default: 1 })),
        limit: t.Optional(t.Number({ default: 10 })),
        userId: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/:id",
    async ({ params, query }) => {
      try {
        const { id } = params;
        const { userId } = query;

        const product: any = await Product.findById(id)
          .populate({
            path: "category",
            select: "name categoryNumber",
          })
          .populate({
            path: "brand",
            select: "name",
          })
          .exec();

        if (!product) {
          return {
            error: "Product not found",
            status: false,
          };
        }

        let userFavorites: String[] = [];

        if (userId) {
          const favorites = await Favorites.findOne({ user: userId });
          userFavorites = favorites?.products || [];
        }

        const newProduct = {
          ...product!._doc,
          favorite: userFavorites.includes(product!._id.toString()),
        };

        return {
          message: "Product Fetched Successfully",
          data: newProduct,
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
      query: t.Object({
        userId: t.Optional(t.String()),
      }),
      detail: {
        summary: "Get a product by id",
      },
    }
  )
  .get(
    "/search",
    async ({ query, store }) => {
      const { page, limit, q } = query;
      const userId = (store as StoreType)["id"];

      let _limit = limit || 10;
      let _page = page || 1;

      let filter: any = { active: true };

      if (q) {
        filter.productName = {
          $regex: q.trim().split("").join(".*"),
          $options: "i",
        };
      }

      let userFavorites: String[] = [];

      try {
        if (userId) {
          const favorites = await Favorites.findOne({ user: userId });
          userFavorites = favorites?.products || [];
        }

        let currentServerTime = format(new Date(), "HH:mm");

        if (process.env.ENV === "PROD") {
          const updatedTime = add(new Date(), { hours: 5, minutes: 30 });
          currentServerTime = format(updatedTime, "HH:mm");
        }

        console.log(currentServerTime);

        const mergedFilter = { ...filter };

        let productsPromise = Product.aggregate([
          { $match: mergedFilter },
          {
            $lookup: {
              from: "timings",
              localField: "timing",
              foreignField: "_id",
              as: "timingDetails",
            },
          },
          { $unwind: "$timingDetails" },
          {
            $addFields: {
              isAvailable: {
                $and: [
                  { $lte: ["$timingDetails.startTime", currentServerTime] },
                  { $gte: ["$timingDetails.endTime", currentServerTime] },
                ],
              },
            },
          },
          {
            $addFields: {
              favorite: {
                $in: ["$_id", userFavorites],
              },
            },
          },
          {
            $group: {
              _id: "$_id",
              productDetails: {
                $first: "$$ROOT", // Get the first product document
              },
              isAvailable: {
                $max: "$isAvailable", // Aggregate availability to ensure any true value is retained
              },
            },
          },
          {
            $addFields: {
              "productDetails.available": "$isAvailable", // Assign aggregated availability back to productDetails
            },
          },
          {
            $replaceRoot: { newRoot: "$productDetails" }, // Replace root with product details
          },
          {
            $project: {
              productName: 1,
              price: 1,
              ratings: 1,
              images: 1,
              description: 1,
              type: 1,
              favorite: 1,
              available: 1, // Include the corrected availability field
            },
          },
          { $skip: (_page - 1) * _limit },
          { $limit: _limit },
        ]);

        const totalPromise = Product.countDocuments(filter);

        const [products, total] = await Promise.all([
          productsPromise,
          totalPromise,
        ]);
        return {
          data: products,
          total,
          page: _page,
          limit: _limit,
          status: true,
        };
      } catch (error) {
        console.error(error);
        return {
          error,
          status: false,
          message: "Something went wrong",
        };
      }
    },
    {
      detail: {
        summary: "Search through all products",
      },
      query: t.Object({
        page: t.Optional(t.Number({ default: 1 })),
        limit: t.Optional(t.Number({ default: 10 })),
        q: t.Optional(t.String({ default: "" })),
      }),
    }
  );
