import { config } from "@/lib/config";
import { calculateRoadDistance } from "@/lib/util";
import { RestaurentModel } from "@/models/restaurent-model";
import { OrderModel } from "@/models/user/order-model";
import { StoreType } from "@/types";
import axios from "axios";
import Elysia, { t } from "elysia";
import { Address } from "../../models/user/address-model";

export const addressController = new Elysia({
  prefix: "/address",
  detail: {
    tags: ["User - Address"],
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
})
  .get(
    "/:id",
    async ({ params }) => {
      try {
        const { id } = params;

        const address = await Address.findById(id);

        if (!address) {
          return { message: "Address not found" };
        }

        return {
          address,
          status: "success",
        };
      } catch (error) {
        console.log(error);
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
        summary: "Get a address by id",
      },
    }
  )
  .get(
    "/all",
    async ({ query, store }) => {
      try {
        const userId = (store as StoreType)["id"];

        const { page, limit } = query;
        let _limit = limit || 10;
        let _page = page || 1;

        _limit = Number(_limit);
        _page = Number(_page);

        const addresses = await Address.find(
          { userId, active: true },
          "-mapPloygonResponse"
        )
          .skip((_page - 1) * _limit)
          .limit(_limit)
          .sort({ createdAt: -1 })
          .exec();

        const totalAddresses = await Address.countDocuments({
          userId,
          active: true,
        });

        return {
          addresses,
          status: "success",
          total: totalAddresses,
        };
      } catch (error) {
        console.log(error);
        return {
          error,
          status: "error",
        };
      }
    },
    {
      detail: {
        summary: "Get all addresses",
      },
    }
  )
  .post(
    "/create",
    async ({ body, store, set }) => {
      try {
        const userId = (store as StoreType)["id"];

        if (!userId) {
          return {
            message: "User not found",
            status: false,
          };
        }
        const address = new Address({
          ...body,
          userId,
        });

        let restaurent = await RestaurentModel.findOne({});

        if (!restaurent) {
          return {
            message: "Restaurent not found",
            status: false,
          };
        }

        let restaurentCords = {
          lat: restaurent?.latitude || config.lat,
          long: restaurent?.longitude || config.long,
        };

        const {
          distance: { value: calculatedDistance },
          duration: { value: calculatedDuration },
        } = await calculateRoadDistance(
          Number(restaurentCords.lat),
          Number(restaurentCords.long),
          Number(address.latitude),
          Number(address.longitude),
          []
        );

        let distanceInKm = calculatedDistance / 1000;

        let limit = 12;

        if (distanceInKm > limit) {
          let subMessage = "You can Place Order through Call.";
          let buttonText = "Call";
          let restaurentNumber = restaurent.restaurentPhone;

          return {
            message: "Address must be within 12 km of the restaurant.",
            subMessage,
            buttonText,
            restaurentNumber,
            status: false,
          };
        }

        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${restaurentCords.lat},${restaurentCords.long}&destination=${address.latitude},${address.longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );

        address.deliveryFee = Math.ceil((calculatedDistance / 1000) * 5);
        address.totalDistance = calculatedDistance;
        address.deliverySeconds = calculatedDuration;

        address.mapPloygonResponse = JSON.stringify(response.data);

        const ordersForthisGuy = await OrderModel.find({
          user: userId,
          addressId: address._id,
          status: {
            $nin: ["cancelled", "delivered"],
          },
        });

        for (const order of ordersForthisGuy) {
          order.mapPloygonResponse = JSON.stringify(response.data);
          await order.save();
        }

        await address.save();

        return {
          message: "Address created successfully",
          data: address,
          status: true,
        };
      } catch (error) {
        console.error(error);
        return {
          error: JSON.stringify(error),
          status: "error",
        };
      }
    },
    {
      body: t.Object({
        receiverName: t.String({
          minLength: 3,
          default: "",
        }),
        receiverMobile: t.String({
          minLength: 10,
          default: "",
        }),
        flatorHouseno: t.String({}),
        area: t.String({}),
        landmark: t.String({}),
        addressString: t.String({}),
        latitude: t.String({}),
        longitude: t.String({}),
        addressType: t.String({
          default: "Home",
        }),
      }),
      detail: {
        summary: "Create a new address",
      },
    }
  )
  .delete(
    "/:id",
    async ({ params }) => {
      try {
        const { id } = params;
        await Address.findOneAndUpdate(
          { _id: id },
          { $set: { active: false } },
          { new: true }
        );

        return {
          message: "Address deleted successfully",
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
      params: t.Object({ id: t.String() }),
      detail: {
        summary: "Delete a address by id",
      },
    }
  )
  .put(
    "/:id",
    async ({ params, body, set }) => {
      try {
        const { id } = params;
        const address = await Address.findById(id);

        if (!address) {
          return { message: "Address not found" };
        }

        const restaurent = await RestaurentModel.findOne({});

        if (!restaurent) {
          set.status = 404;
          return { message: "Restaurent not found", status: false };
        }

        if (body.latitude || body.longitude) {
          const response = await axios.get(
            `https://maps.googleapis.com/maps/api/directions/json?origin=${restaurent?.latitude},${restaurent?.longitude}&destination=${body.latitude},${body.longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`
          );

          address.mapPloygonResponse = JSON.stringify(response.data);

          console.log("New Location saved!");

          await address.save();
        }

        address.receiverName = body.receiverName || address.receiverName;
        address.receiverMobile = body.receiverMobile || address.receiverMobile;
        address.flatorHouseno = body.flatorHouseno || address.flatorHouseno;
        address.area = body.area || address.area;
        address.landmark = body.landmark || address.landmark;
        address.addressString = body.addressString || address.addressString;
        address.latitude = body.latitude || address.latitude;
        address.longitude = body.longitude || address.longitude;
        address.addressType = body.addressType || address.addressType;

        await address.save();

        return {
          message: "Address updated successfully",
          data: address,
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
      params: t.Object({ id: t.String() }),
      body: t.Object({
        receiverName: t.String(),
        receiverMobile: t.String({
          minLength: 10,
          maxLength: 10,
        }),
        flatorHouseno: t.String(),
        area: t.String(),
        landmark: t.String(),
        addressString: t.String(),
        latitude: t.String(),
        longitude: t.String(),
        addressType: t.String(),
      }),
      detail: {
        summary: "Update a address by id",
      },
    }
  );
