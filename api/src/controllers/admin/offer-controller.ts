import Elysia, { t } from "elysia";
import { FlatOffer, NegotiateOffer, DiscountOffer, MRPOffer } from "@/models/offer-model";
import { Product } from "@/models/product";

export const offerController = new Elysia({
  prefix: "/offer",
  detail: { tags: ["Admin - Offers"] },
})

// Create Offer
.post(
  "/create",
  async ({ body, set }) => {
    try {
      const { type, ...offerData } = body;
      let offer;

      switch (type) {
        case "flat":
          offer = await FlatOffer.create({ ...offerData, type: "flat" });
          break;
        case "negotiate":
          offer = await NegotiateOffer.create({ ...offerData, type: "negotiate" });
          break;
        case "discount":
          offer = await DiscountOffer.create({ ...offerData, type: "discount" });
          break;
        case "mrp":
          offer = await MRPOffer.create({ ...offerData, type: "mrp" });
          break;
        default:
          set.status = 400;
          return { message: "Invalid offer type", status: false };
      }

      return { message: "Offer created successfully", data: offer, status: true };
    } catch (error) {
      console.error(error);
      return { status: false, error };
    }
  },
  {
    body: t.Object({
      type: t.String(),
      percentage: t.Optional(t.Number()),
      minPrd: t.Optional(t.Number()),
      noOfAttempts: t.Optional(t.Number()),
      items: t.Optional(t.Array(
        t.Object({
          productId: t.String(),
          discount: t.Number(),
        })
      )),
      isActive: t.Optional(t.Boolean()),
    }),
    detail: { summary: "Create a new offer" },
  }
)

// Edit Offer
.patch(
  "/update/:id",
  async ({ params, body, set }) => {
    try {
      const { id } = params;
      const { type, ...updatedData } = body;
      let updatedOffer;

      switch (type) {
        case "flat":
          updatedOffer = await FlatOffer.findByIdAndUpdate(id, updatedData, { new: true });
          break;
        case "negotiate":
          updatedOffer = await NegotiateOffer.findByIdAndUpdate(id, updatedData, { new: true });
          break;
        case "discount":
          updatedOffer = await DiscountOffer.findByIdAndUpdate(id, updatedData, { new: true });
          break;
        case "mrp":
          updatedOffer = await MRPOffer.findByIdAndUpdate(id, updatedData, { new: true });
          break;
        default:
          set.status = 400;
          return { message: "Invalid offer type", status: false };
      }

      if (!updatedOffer) {
        set.status = 404;
        return { message: "Offer not found", status: false };
      }

      return { message: "Offer updated successfully", data: updatedOffer, status: true };
    } catch (error) {
      console.error(error);
      set.status = 400;
      return { status: false, error };
    }
  },
  {
    body: t.Object({
      type: t.String(),
      percentage: t.Optional(t.Number()),
      minPrd: t.Optional(t.Number()),
      noOfAttempts: t.Optional(t.Number()),
      items: t.Optional(t.Array(
        t.Object({
          productId: t.String(),
          discount: t.Number(),
        })
      )),
      isActive: t.Optional(t.Boolean()),
    }),
    params: t.Object({ id: t.String() }),
  }
)

// Add Product to Offer (Both Discount & MRP Types)
.post(
  '/:id/add-product',
  async ({ params, body, set }) => {
    try {
      const { id } = params;
      const { productId, discount, mrpReduction } = body;

      const offer = await DiscountOffer.findById(id) || await MRPOffer.findById(id);
      if (!offer) {
        set.status = 404;
        return { message: 'Offer not found', status: false };
      }

      const existingProductIndex = offer.items.findIndex(
        (item: { productId: { toString: () => string; }; }) => item.productId.toString() === productId
      );

      if (existingProductIndex >= 0) {
        set.status = 400;
        return { message: 'Product already exists in the offer list', status: false };
      }

      if (offer.type === 'discount') {
        offer.items.push({ productId, discount });
        await Product.findByIdAndUpdate(productId, { discount }); // Add discount to Product
      } else if (offer.type === 'mrp') {
        offer.items.push({ productId, mrpReduction });
        await Product.findByIdAndUpdate(productId, { onMRP: mrpReduction }); // Add onMRP to Product
      }

      await offer.save();

      return { message: 'Product added to offer successfully', data: offer, status: true };
    } catch (error) {
      console.error(error);
      set.status = 400;
      return { status: false, error };
    }
  },
  {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      productId: t.String(),
      discount: t.Optional(t.Number()),
      mrpReduction: t.Optional(t.Number()),
    }),
    detail: { summary: 'Add a product to the offer' },
  }
)

// Remove Product from Offer (Both Discount & MRP Types)
.delete(
  '/remove-product',
  async ({ query, set }) => {
    try {
      const { id, productId } = query;

      if (!id || !productId) {
        set.status = 400;
        return { message: 'Missing id or productId', status: false };
      }

      const offer = await DiscountOffer.findById(id) || await MRPOffer.findById(id);
      if (!offer) {
        set.status = 404;
        return { message: 'Offer not found', status: false };
      }

      offer.items = offer.items.filter(
        (item: { productId: { toString: () => string; }; }) => item.productId.toString() !== productId
      );
      await offer.save();

      if (offer.type === 'discount') {
        await Product.findByIdAndUpdate(productId, { discount: 0 }); // Remove discount from Product
      } else if (offer.type === 'mrp') {
        await Product.findByIdAndUpdate(productId, { onMRP: 0 }); // Remove onMRP from Product
      }

      return {
        message: 'Product removed from offer successfully',
        data: offer,
        status: true,
      };
    } catch (error) {
      console.error(error);
      set.status = 400;
      return { status: false, error };
    }
  },
  {
    query: t.Object({
      id: t.String(),
      productId: t.String(),
    }),
    detail: { summary: 'Remove a product from the offer' },
  }
)

// Update Product Values in Offer (Both Discount & MRP Types)
.patch(
  '/update-products',
  async ({ query, body, set }) => {
    try {
      const { id } = query;
      const { products } = body;

      if (!id) {
        set.status = 400;
        return { message: 'Offer ID is required', status: false };
      }

      const offer = await DiscountOffer.findById(id) || await MRPOffer.findById(id);
      if (!offer) {
        set.status = 404;
        return { message: 'Offer not found', status: false };
      }

      const offerType = offer.type;

      if (offerType === 'discount') {
        products.forEach(async ({ productId, discount }) => {
          const productIndex = offer.items.findIndex(
            (item: { productId: { toString: () => string; }; }) => item.productId.toString() === productId
          );
          if (productIndex !== -1) {
            offer.items[productIndex].discount = discount;
            await Product.findByIdAndUpdate(productId, { discount }); // Update Product.discount
          }
        });
      } else if (offerType === 'mrp') {
        products.forEach(async ({ productId, mrpReduction }) => {
          const productIndex = offer.items.findIndex(
            (item: { productId: { toString: () => string; }; }) => item.productId.toString() === productId
          );
          if (productIndex !== -1) {
            offer.items[productIndex].mrpReduction = mrpReduction;
            await Product.findByIdAndUpdate(productId, { onMRP: mrpReduction }); // Update Product.onMRP
          }
        });
      }

      await offer.save();

      return { message: 'Product values updated successfully', data: offer, status: true };
    } catch (error) {
      console.error(error);
      set.status = 400;
      return { status: false, error };
    }
  },
  {
    query: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      products: t.Array(
        t.Object({
          productId: t.String(),
          discount: t.Optional(t.Number()),
          mrpReduction: t.Optional(t.Number()),
        })
      ),
    }),
    detail: { summary: 'Update multiple product values in the offer' },
  }
)

// Get Offers
.get(
  "/",
  async ({ query, set }) => {
    const { type } = query;

    try {
      let offers;

      if (type) {
        switch (type) {
          case "flat":
            offers = await FlatOffer.find();
            break;
          case "negotiate":
            offers = await NegotiateOffer.find();
            break;
          case "discount":
            offers = await DiscountOffer.find().populate('items.productId'); // Populate _id here
            break;
          case "mrp":
            offers = await MRPOffer.find().populate('items.productId');
            break;
          default:
            set.status = 400;
            return { message: "Invalid offer type", status: false };
        }
      } else {
        // Fetch all offers if no type is specified
        const [flat, negotiate, discount, mrp] = await Promise.all([
          FlatOffer.find(),
          NegotiateOffer.find(),
          DiscountOffer.find().populate('items.productId'), // Populate _id here
          MRPOffer.find(),
        ]);

        offers = [...flat, ...negotiate, ...discount, ...mrp];
      }

      if (!offers.length) {
        set.status = 404;
        return { message: "No offers found", status: false };
      }

      return { message: "Offers fetched successfully", data: offers, status: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { status: false, error: "Failed to fetch offers" };
    }
  },
  {
    query: t.Object({
      type: t.Optional(t.String()),
    }),
    detail: { summary: "Get Offers (All or By Type)" },
  }
);