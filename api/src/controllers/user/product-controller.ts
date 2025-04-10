import { StoreType } from "@/types";
import { add, format } from "date-fns";
import Elysia, { t } from "elysia";
import { Types } from "mongoose";
import { Product } from "../../models/product";
import { Favorites } from "../../models/user/favorites-model";
import { NegotiateOffer } from "@/models/offer-model";
import { User } from "@/models/user-model";

export const productController = new Elysia({
  prefix: "/products",
  detail: {
    tags: ["User - Product"],
  },
})
.get(
  "/",
  async ({ query }) => {
    const { page, limit, q, rating, userId, category, brand, minPrice, maxPrice } = query;

    const _limit = limit || 10;
    const _page = page || 1;

    let matchFilter: any = { active: true, isDeleted: false };

    // Search filter
    if (q) {
      matchFilter.$or = [{ productName: { $regex: q, $options: "i" } }];
    }

    // Rating filter
    if (rating) {
      const ratingNumber = parseInt(rating, 10);
      if (ratingNumber >= 1 && ratingNumber <= 5) {
        matchFilter.ratings = ratingNumber;
      }
    }

    // Price range filter
    if (minPrice || maxPrice) {
      matchFilter.price = {};
      if (minPrice) matchFilter.price.$gte = parseFloat(minPrice);
      if (maxPrice) matchFilter.price.$lte = parseFloat(maxPrice);
    }

    try {
      // Convert category and brand to arrays if they're comma-separated strings
      const categoryIds = category 
        ? category.split(',').map((id: string) => new Types.ObjectId(id.trim()))
        : [];
      
      const brandIds = brand 
        ? brand.split(',').map((id: string) => new Types.ObjectId(id.trim()))
        : [];

      const totalPromise = Product.countDocuments(matchFilter);
      
      const aggregationPipeline: any[] = [
        {
          $match: matchFilter,
        },
        // Lookup for categories
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
            ...(categoryIds.length > 0 ? { "categoryDetails._id": { $in: categoryIds } } : {})
          },
        },
        // Lookup for brands
        {
          $lookup: {
            from: "brands",
            localField: "brand",
            foreignField: "_id",
            as: "brandDetails",
          },
        },
        {
          $unwind: "$brandDetails",
        },
        {
          $match: {
            "brandDetails.active": true,
            ...(brandIds.length > 0 ? { "brandDetails._id": { $in: brandIds } } : {})
          },
        },
        // Add priority fields for sorting
        {
          $addFields: {
            categoryPriority: {
              $cond: [
                { $in: ["$categoryDetails._id", categoryIds] },
                0, // Higher priority for selected categories
                1
              ]
            },
            brandPriority: {
              $cond: [
                { $in: ["$brandDetails._id", brandIds] },
                0, // Higher priority for selected brands
                1
              ]
            },
            // Add a combined priority field
            combinedPriority: {
              $add: [
                { $cond: [{ $in: ["$categoryDetails._id", categoryIds] }, 0, 1] },
                { $cond: [{ $in: ["$brandDetails._id", brandIds] }, 0, 1] }
              ]
            }
          },
        },
        {
          $sort: { 
            combinedPriority: 1, // Sort by combined priority first
            categoryPriority: 1, 
            brandPriority: 1, 
            productName: 1 
          },
        },
        // Group by category
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
                strikePrice: "$strikePrice",
                images: "$images",
                discount: "$discount",
                onMRP: "$onMRP",
                description: "$description",
                categoryId: "$categoryDetails._id",
                categoryName: "$categoryDetails.name",
                brandId: "$brandDetails._id",
                brandName: "$brandDetails.name",
              },
            },
            categoryPriority: { $first: "$categoryPriority" },
            brandPriority: { $first: "$brandPriority" },
          },
        },
        {
          $sort: { 
            categoryPriority: 1, 
            brandPriority: 1, 
            categoryName: 1 
          },
        },
        // Pagination at the category level
        {
          $skip: (_page - 1) * _limit,
        },
        {
          $limit: _limit,
        },
      ];

      const [total, products] = await Promise.all([
        totalPromise, 
        Product.aggregate(aggregationPipeline)
      ]);

      let userFavorites: string[] = [];

      if (userId) {
        const favorites = await Favorites.findOne({ user: userId });
        userFavorites = favorites?.products?.map((p: any) => p.toString()) || [];
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
      summary: "Get all active products grouped by category with filters",
      description: "Supports filtering by multiple categories, brands, price ranges, and ratings. Categories and brands can be comma-separated for multiple values."
    },
    query: t.Object({
      page: t.Optional(t.Number({ default: 1 })),
      limit: t.Optional(t.Number({ default: 10 })),
      q: t.Optional(t.String({ default: "" })),
      rating: t.Optional(t.String()),
      userId: t.Optional(t.String()),
      category: t.Optional(t.String({ description: "Comma-separated category IDs" })),
      brand: t.Optional(t.String({ description: "Comma-separated brand IDs" })),
      minPrice: t.Optional(t.String()),
      maxPrice: t.Optional(t.String()),
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
              strikePrice:1,
              images: 1,
              description: 1,
              favorite: 1,
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
  )
  .get(
    "/negotiate",
    async ({ query,store }) => {
      const {productId, amount } = query;
      const userId = (store as StoreType)["id"];
      if (!productId) {
        return { status: false, message: "Missing required query params (userId or productId)" };
      }
  
      try {
        const user = await User.findById(userId);
        if (!user) {
          return { status: false, message: "User not found" };
        }
  
        const product = await Product.findById(productId);
        if (!product) {
          return { status: false, message: "Product not found" };
        }
  
        const offer = await NegotiateOffer.findOne({ isActive: true });
        if (!offer) {
          return { status: false, message: "No negotiate offer configured" };
        }
  
        const maxAttempts = offer.noOfAttempts;
        let existingAttempt = user.attempts.find(attempt => attempt.productId === productId);
  
        let currentAttempts = 0;
        if (existingAttempt) {
          currentAttempts = existingAttempt.attempts.length;
        }
  
        // Return attempt info if no amount provided
        if (!amount) {
          return {
            status: true,
            message: "Negotiation status info",
            maxAttempts,
            attemptsCount: currentAttempts,
            attempts: existingAttempt ? existingAttempt.attempts : [],
          };
        }
  
        if (currentAttempts >= maxAttempts) {
          return {
            status: false,
            message: "Negotiation attempt limit reached",
            maxAttempts,
            attemptsCount: currentAttempts,
            attempts: existingAttempt ? existingAttempt.attempts : [],
          };
        }
  
        const userAmount = parseFloat(amount);
        const limit = product.negotiateLimit;
        const mrp = product.price;
        //@ts-ignore
        const matchedItem = offer.items.find(item => item.productId.toString() === productId);

        if (!matchedItem) {
          return {
            status: false,
            message: "No negotiation config found for this product"
          };
        }
        
        const successPercentage = matchedItem.successPercentage;
        const failurePercentage = matchedItem.failurePercentage;
        
  
        let negotiatedPrice = mrp;
        let message = "";
        let isSuccess = userAmount >= limit;
  
        // First attempt logic
        if (currentAttempts === 0) {
          if (isSuccess) {
            message = userAmount === limit
              ? "Negotiation successful (equal to limit)"
              : "Negotiation successful (above limit)";
            negotiatedPrice = Math.max(
              limit,
              mrp - (mrp * successPercentage / 100) // Apply success % to MRP
            );
          } else {
            message = "Negotiation failed (below limit)";
            negotiatedPrice = Math.max(
              limit,
              mrp - (mrp * failurePercentage / 100) // Apply failure % to MRP
            );
          }
        }
        // Subsequent attempts
        else {
          const lastPrice = existingAttempt.attempts[currentAttempts - 1].amount;
  
          if (isSuccess) {
            message = userAmount === limit
              ? "Negotiation successful (equal to limit)"
              : "Negotiation successful (above limit)";
            negotiatedPrice = Math.max(
              limit,
              lastPrice - (lastPrice * successPercentage / 100)
            );
          } else {
            message = "Negotiation failed (below limit)";
            negotiatedPrice = Math.max(
              limit,
              lastPrice - (lastPrice * failurePercentage / 100)
            );
          }
        }
  
        // Record the attempt
        if (existingAttempt) {
          existingAttempt.attempts.push({
            amount: negotiatedPrice,
            attemptNumber: currentAttempts + 1,
          });
        } else {
          user.attempts.push({
            productId: productId,
            attempts: [
              {
                amount: negotiatedPrice,
                attemptNumber: 1,
              }
            ]
          });
        }
  
        await user.save();
  
        // Ensure the response includes the updated attempts
        return {
          status: true,
          message,
          negotiatedPrice: parseFloat(negotiatedPrice.toFixed(2)),
          attemptsCount: currentAttempts + 1,
          maxAttempts,
          attempts: existingAttempt ? existingAttempt.attempts : user.attempts.find(attempt => attempt.productId === productId)?.attempts || [],
        };
  
      } catch (error) {
        console.error(error);
        return {
          status: false,
          message: "Negotiation failed",
          error: error.message,
        };
      }
    },
    {
      query: t.Object({
        productId: t.String(),
        amount: t.Optional(t.String())
      }),
      detail: {
        summary: "Negotiate price or fetch negotiation status",
      },
    }
  );
  
  
  
  