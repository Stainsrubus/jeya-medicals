import { deleteFile, saveFile } from "@/lib/file-s3";
import { RestaurentModel } from "@/models/restaurent-model";
import Elysia, { t } from "elysia";

export const adminRestaurentController = new Elysia({
  prefix: "/restaurent",
  detail: {
    tags: ["Admin - Restaurent"],
  },
})
  .post(
    "/create",
    async ({ body }) => {
      try {
        const {
          restaurentName,
          restaurentAddress,
          restaurentPhone,
          restaurentDescription,
          latitude,
          longitude,
          restaurentEmail,
          restaurentImage,
        } = body;

        const restaurent = new RestaurentModel({
          restaurentName,
          restaurentAddress,
          restaurentPhone,
          restaurentEmail,
          restaurentDescription,
          latitude,
          longitude,
        });

        if (restaurentImage) {
          const { ok, filename } = await saveFile(
            restaurentImage,
            "restaurent"
          );

          if (!ok) {
            return {
              error: "Failed to upload restaurent image",
            };
          }

          restaurent.restaurentImage = filename;
        }

        await restaurent.save();
        return {
          message: "Restaurent created successfully",
          status: true,
          data: restaurent,
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
        restaurentName: t.String(),
        restaurentAddress: t.String(),
        restaurentPhone: t.String(),
        restaurentDescription: t.String(),
        latitude: t.String(),
        longitude: t.String(),
        restaurentImage: t.File(),
        restaurentEmail: t.String(),
      }),
      detail: {
        summary: "Create restaurent",
      },
    }
  )
  .put(
    "/update/:id",
    async ({ body, params, set }) => {
      try {
        const { id } = params;
  
        const restaurent = await RestaurentModel.findById(id);
  
        if (!restaurent) {
          set.status = 404;
          return {
            message: "Restaurent not found",
            status: false,
          };
        }
  
        const {
          restaurentName,
          restaurentAddress,
          restaurentPhone,
          restaurentDescription,
          latitude,
          longitude,
          restaurentImage,
          restaurentEmail,
          fssaiNumber,
          gstNumber,
          legalEntityName,
        } = body;
  
        // Update fields
        restaurent.restaurentName = restaurentName || restaurent.restaurentName;
        restaurent.restaurentAddress =
          restaurentAddress || restaurent.restaurentAddress;
        restaurent.restaurentPhone =
          restaurentPhone || restaurent.restaurentPhone;
        restaurent.restaurentDescription =
          restaurentDescription || restaurent.restaurentDescription;
        restaurent.latitude = latitude || restaurent.latitude;
        restaurent.longitude = longitude || restaurent.longitude;
        restaurent.gstNumber = gstNumber || restaurent.gstNumber;
        restaurent.fssaiNumber = fssaiNumber || restaurent.fssaiNumber;
        restaurent.legalEntityName =
          legalEntityName || restaurent.legalEntityName;
        restaurent.restaurentEmail =
          restaurentEmail || restaurent.restaurentEmail;
  
        if (restaurentImage) {
          const { ok, filename } = await saveFile(
            restaurentImage,
            "restaurent"
          );
  
          if (!ok) {
            set.status = 400;
            return {
              error: "Failed to upload restaurent image",
            };
          }
  
          if (restaurent.restaurentImage) {
            deleteFile(restaurent.restaurentImage);
          }
  
          restaurent.restaurentImage = filename;
        }
  
        await restaurent.save();
  
        return {
          message: "Restaurent details updated successfully",
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
          error,
        };
      }
    },
    {
      body: t.Object({
        restaurentName: t.Optional(t.String({ default: "" })),
        restaurentAddress: t.Optional(t.String({ default: "" })),
        restaurentEmail: t.Optional(t.String({ default: "" })),
        restaurentPhone: t.Optional(t.String({ default: "" })),
        restaurentDescription: t.Optional(t.String({ default: "" })),
        latitude: t.Optional(t.String({ default: "" })),
        longitude: t.Optional(t.String({ default: "" })),
        restaurentImage: t.Optional(t.File()),
        gstNumber: t.Optional(t.String({ default: "" })),
        fssaiNumber: t.Optional(t.String({ default: "" })),
        legalEntityName: t.Optional(t.String({ default: "" })),
      }),
      detail: {
        summary: "Update restaurent details by ID",
      },
    }
  )
  
  .get(
    "/:id",
    async ({ params }) => {
      const { id } = params;
  
      const restaurent = await RestaurentModel.findById(id);
  
      if (!restaurent) {
        return {
          message: "Restaurent not found",
          status: false,
        };
      }
  
      return {
        restaurent,
        status: true,
        message: "Restaurent Fetched Successfully",
      };
    },
    {
      detail: {
        summary: "Get restaurent details by ID",
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
          searchQuery.restaurentName = { $regex: q, $options: "i" };
        }

        const restaurents = await RestaurentModel.find(searchQuery)
          .skip((_page - 1) * _limit)
          .limit(_limit)
          .sort({ createdAt: -1 })
          .lean()
          .exec();
        return {
          restaurents,
          status: true,
          message: "Restaurents Fetched Successfully",
        };
      } catch (error) {
        set.status = 400;
        return {
          error:
            error instanceof Error ? error.message : "Can't fetch restaurents",
          status: false,
        };
      }
    },
    {
      detail: {
        summary: "Get all restaurents",
      },
      query: t.Object({
        page: t.Number({
          default: 1,
        }),
        limit: t.Number({
          default: 10,
        }),
        q: t.Optional(
          t.String({
            default: "",
          })
        ),
      }),
    }
  )
  
  .delete(
    "/:id",
    async ({ params, query }) => {
      try {
        const { id } = params;
        const { permanent, type } = query;
        const restaurent = await RestaurentModel.findById(id);
  
        if (!restaurent) {
          return { message: "Restaurant not found" };
        }
  
        if (permanent) {
          restaurent.active = false;
          restaurent.isDeleted = true;
        } else {
          restaurent.active = !restaurent.active;
        }
        
        await restaurent.save();
        
        return {
          message: `Restaurant ${restaurent.active ? "activated" : "deactivated"} successfully`,
          status: true,
        };
        
        
  
        // if (reEnable != 0) {
        //   let reEnableIn;
  
        //   if (type === "time") {
        //     let currentServerTime = format(new Date(), "HH:mm");
  
        //     //@ts-ignore
        //     const [hours, minutes] = reEnable.split(":").map(Number);
        //     if (process.env.ENV === "PROD") {
        //       reEnableIn = dayjs()
        //         .set("hour", hours)
        //         .set("minute", minutes)
        //         .set("second", 0)
        //         .subtract(5, "hour")
        //         .subtract(30, "minute")
        //         .toDate();
        //     } else {
        //       reEnableIn = dayjs()
        //         .set("hour", hours)
        //         .set("minute", minutes)
        //         .set("second", 0)
        //         .toDate();
        //     }
        //   } else {
        //     //@ts-ignore
        //     reEnableIn = dayjs().add(reEnable, "day").toDate();
        //   }
  
        //   restaurant.reEnabledAt = reEnableIn;
        //   restaurant.active = false;
        // } else {
        //   restaurant.reEnabledAt = null;
        //   restaurant.active = true;
        // }
  
        // const category = await RestaurantCategory.findById(restaurant.category);
  
        // if (!category) {
        //   return {
        //     message: "Category not found",
        //     status: false,
        //   };
        // }
  
        // await category.save();
  
       
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
      params: t.Object({ id: t.String() }),
      query: t.Object({
        permanent: t.Boolean({
          default: false,
        }),
        // reEnable: t.Union([t.Number({ default: 1 }), t.String()]),
        type: t.String({
          default: "date",
        }),
      }),
      detail: {
        summary: "Delete a restaurant by id",
      },
    }
  )
  