import { deleteFile, saveFile } from "@/lib/file-s3";
import { StoreModel } from "@/models/store-model";
import Elysia, { t } from "elysia";

export const adminRestaurentController = new Elysia({
  prefix: "/restaurent",
  detail: {
    tags: ["Admin - Store"],
  },
})
  .post(
    "/create",
    async ({ body }) => {
      try {
        const {
          storeName,
          storeAddress,
          storePhone,
          storeDescription,
          latitude,
          longitude,
          storeEmail,
          // storeImage,
        } = body;

        const Estore = new StoreModel({
          storeName,
          storeAddress,
          storePhone,
          storeEmail,
          storeDescription,
          latitude,
          longitude,
        });

        // if (storeImage) {
        //   const { ok, filename } = await saveFile(
        //     storeImage,
        //     "store"
        //   );

        //   if (!ok) {
        //     return {
        //       error: "Failed to upload restaurent image",
        //     };
        //   }

        // Estore.storeImage = filename;
        // }

        await Estore.save();
        return {
          message: "store created successfully",
          status: true,
          data: Estore,
        };
      } catch (error) {
        if (error instanceof Error) {
          console.error(error);

          return {
            error: error.message,
          };
        } else {
          return {
            error,
          };
        }
      }
    },
    {
      body: t.Object({
        storeName: t.String(),
        storeAddress: t.String(),
        storePhone: t.String(),
        storeDescription: t.String(),
        latitude: t.String(),
        longitude: t.String(),
        // storeImage: t.File(),
        storeEmail: t.String(),
      }),
      detail: {
        summary: "Create store",
      },
    }
  )
  .put(
    "/update/:id",
    async ({ body, params, set }) => {
      try {
        const { id } = params;
  
        const restaurent = await StoreModel.findById(id);
  
        if (!restaurent) {
          set.status = 404;
          return {
            message: "Restaurent not found",
            status: false,
          };
        }
  
        const {
          storeName,
          storeAddress,
          storePhone,
          storeDescription,
          latitude,
          longitude,
          storeEmail,
          storeImage,
          gstNumber,
          fssaiNumber,
          legalEntityName,
        } = body;
  
        // Update fields
        restaurent.storeName = storeName || restaurent.storeName;
        restaurent.storeAddress = storeAddress || restaurent.storeAddress;
        restaurent.storePhone = storePhone || restaurent.storePhone;
        restaurent.storeDescription = storeDescription || restaurent.storeDescription;
        restaurent.latitude = latitude || restaurent.latitude;
        restaurent.longitude = longitude || restaurent.longitude;
        restaurent.gstNumber = gstNumber || restaurent.gstNumber;
        restaurent.fssaiNumber = fssaiNumber || restaurent.fssaiNumber;
        restaurent.legalEntityName = legalEntityName || restaurent.legalEntityName;
        restaurent.storeEmail = storeEmail || restaurent.storeEmail;
  
        if (storeImage) {
          const { ok, filename } = await saveFile(storeImage, "store");
  
          if (!ok) {
            set.status = 400;
            return {
              error: "Failed to upload store image",
            };
          }
  
          if (restaurent.storeImage) {
            deleteFile(restaurent.storeImage);
          }
  
          restaurent.storeImage = filename;
        }
  
        await restaurent.save();
  
        return {
          message: "Store details updated successfully",
          status: true,
          data: restaurent,
        };
      } catch (error) {
        set.status = 400;
        if (error instanceof Error) {
          console.error(error);
          return {
            error: error.message,
          };
        }
        return {
          error: "An unexpected error occurred",
        };
      }
    },
    {
      body: t.Object({
        storeName: t.Optional(t.String({ default: "" })),
        storeAddress: t.Optional(t.String({ default: "" })),
        storeEmail: t.Optional(t.String({ default: "" })),
        storePhone: t.Optional(t.String({ default: "" })),
        storeDescription: t.Optional(t.String({ default: "" })),
        latitude: t.Optional(t.String({ default: "" })),
        longitude: t.Optional(t.String({ default: "" })),
        storeImage: t.Optional(t.File()),
        gstNumber: t.Optional(t.String({ default: "" })),
        fssaiNumber: t.Optional(t.String({ default: "" })),
        legalEntityName: t.Optional(t.String({ default: "" })),
      }),
      detail: {
        summary: "Update store details by ID",
      },
    }
  )
  
  
  .get(
    "/:id",
    async ({ params }) => {
      const { id } = params;
  
      const restaurent = await StoreModel.findById(id);
  
      if (!restaurent) {
        return {
          message: "Restaurent not found",
          status: false,
        };
      }
  
      return {
        restaurent,
        status: true,
        message: "Restaurent fetched successfully",
      };
    },
    {
      detail: {
        summary: "Get store details by ID",
      },
    }
  )
  
  
  .get(
    "/all",
    async ({ query, set }) => {
      try {
        const { q, page, limit } = query;
  
        let _page = Number(page) || 1;
        let _limit = Number(limit) || 10;
  
        const searchQuery: Partial<Record<string, unknown>> = {
          isDeleted: false,
        };
  
        if (q) {
          searchQuery.storeName = { $regex: q, $options: "i" };
        }
  
        const restaurents = await StoreModel.find(searchQuery)
          .skip((_page - 1) * _limit)
          .limit(_limit)
          .sort({ createdAt: -1 })
          .lean()
          .exec();
  
        return {
          restaurents,
          status: true,
          message: "Store fetched successfully",
        };
      } catch (error) {
        set.status = 400;
        return {
          error: error instanceof Error ? error.message : "Can't fetch Store",
          status: false,
        };
      }
    },
    {
      detail: {
        summary: "Get all stores",
      },
      query: t.Object({
        page: t.Number({
          default: 1,
        }),
        limit: t.Number({
          default: 10,
        }),
        q: t.Optional(t.String({ default: "" })),
      }),
    }
  )
  
  
  .delete(
    "/:id",
    async ({ params, query }) => {
      try {
        const { id } = params;
        const { permanent } = query;
        const Estore = await StoreModel.findById(id);
  
        if (!Estore) {
          return { message: "Restaurant not found" };
        }
  
        if (permanent) {
          Estore.active = false;
          Estore.isDeleted = true;
        } else {
          Estore.active = !Estore.active;
        }
  
        await Estore.save();
  
        return {
          message: `Restaurant ${Estore.active ? "activated" : "deactivated"} successfully`,
          status: true,
        };
      } catch (error) {
        console.error(error);
        return {
          error: error instanceof Error ? error.message : "Something went wrong",
          status: false,
        };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({
        permanent: t.Boolean({ default: false }),
      }),
      detail: {
        summary: "Delete a store by ID",
      },
    }
  )
  
  