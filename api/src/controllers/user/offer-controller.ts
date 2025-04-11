import { DiscountOffer, FlatOffer, MRPOffer, NegotiateOffer } from "@/models/offer-model";
import { Favorites } from "@/models/user/favorites-model";
import { StoreType } from "@/types";
import Elysia, { t } from "elysia";

export const userOfferController = new Elysia({
  prefix: "/offers",
  detail: {
    tags: ["User - Offers"],
    security: [{ bearerAuth: [] }],
  },
})
.get(
  "/",
  async ({ set, store }) => {
    const userId = (store as StoreType)["id"];

    try {
      // Fetch user favorites if userId exists
      let userFavorites: string[] = [];
      if (userId) {
        const favorites = await Favorites.findOne({ user: userId });
        userFavorites = favorites?.products?.map((p: any) => p.toString()) || [];
      }

      // Fetch all offers with populated items.productId for relevant types
      const [flatOffers, negotiateOffers, discountOffers, mrpOffers] = await Promise.all([
        FlatOffer.find().lean(),
        NegotiateOffer.find().populate('items.productId').lean(),
        DiscountOffer.find().populate('items.productId').lean(),
        MRPOffer.find().populate('items.productId').lean(),
      ]);

      const offers = [...flatOffers, ...negotiateOffers, ...discountOffers, ...mrpOffers];

      // Add favorite status to items
      const processedOffers = offers.map((offer) => {
        const processedOffer = { ...offer, _id: offer._id.toString() };
        if (offer.items && offer.items.length > 0) {
          processedOffer.items = offer.items.map((item) => {
            const processedItem = { ...item, _id: item._id.toString() };
            if (item.productId) {
              processedItem.productId = {
                ...item.productId,
                _id: item.productId._id.toString(),
                favorite: userFavorites.includes(item.productId._id.toString()),
              };
            }
            return processedItem;
          });
        }
        return processedOffer;
      });

      if (!processedOffers.length) {
        set.status = 404;
        return {
          data: [],
          total: 0,
          status: false,
          message: "No offers found",
        };
      }

      return {
        data: processedOffers,
        total: processedOffers.length,
        status: true,
        message: "Offers fetched successfully",
      };
    } catch (error) {
      console.error("Error fetching offers:", error);
      return {
        error,
        status: false,
        message: "Something went wrong",
        data: [],
        total: 0,
      };
    }
  },
  {
    detail: {
      summary: "Get all offers with favorite status",
      description: "Fetches all offers (flat, negotiate, discount, mrp) with populated product details and favorite status based on user ID.",
    },
  },
);

