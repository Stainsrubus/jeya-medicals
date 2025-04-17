import { saveFile } from "@/lib/file";
import { DemandProduct } from "@/models/user/demand-model";
import Elysia, { t } from "elysia";

export const demandController = new Elysia({
  prefix: "/demand",
  detail: {
    tags: ["Admin - Demand"],
    security: [{ bearerAuth: [] }],
  },
})
.get(
    "/",
    async ({ set }) => {
      try {
        const demands = await DemandProduct.find()
          .populate("userId", "username email mobile") // populate with selected user fields
          .sort({ createdAt: -1 }); // Optional: newest first
  
        return {
          status: true,
          data: demands,
        };
      } catch (error: any) {
        console.error("Error fetching demands:", error);
        set.status = 500;
        return {
          status: false,
          message: "Failed to fetch demand requests",
          error: error.message,
        };
      }
    },
    {
      detail: {
        summary: "Get all demand requests with user details",
      },
    }
  );