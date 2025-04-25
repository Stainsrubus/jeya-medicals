import { validateToken } from "@/lib/util";
import Elysia from "elysia";
import { employeeAuthController } from "./employeeAuth-controller";
import { deliveryAgentController } from "./de-agent-controller";
import { deliveryAgentOrderController } from "./de-order-controller";
import { productController } from "./product-controller";

const employeeBaseController = new Elysia({
  prefix: "/employee",
})
  .use(employeeAuthController)
  .state("id", "")
  .state("email", "")
  .state("role", "")
  .onBeforeHandle(async ({ headers, set, store }) => {
    const token = headers["authorization"];

    try {
      const payload = await validateToken(token ?? "");
      store["id"] = payload.id;
      store["email"] = payload.mobile;
      store["role"] = payload.role;

      if (payload.role !== "employee") {
        set.status = 401;
        return { message: "Unauthorized" };
      }
    } catch (error) {
      set.status = 401;
      return { message: "Unauthorized" };
    }
  })
  .use(productController)
  .use(deliveryAgentController)
  .use(deliveryAgentOrderController);

export { employeeBaseController };
