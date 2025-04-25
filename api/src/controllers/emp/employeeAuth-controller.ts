import { PasetoUtil } from "@/lib/paseto";
import { Employee } from "@/models/emp/employee-model";
import Elysia, { t } from "elysia";

export const employeeAuthController = new Elysia({
  prefix: "/auth",
  detail: {
    tags: ["Employee - Auth"],
  },
})
  .post(
    "/login",
    async ({ body, set }) => {
      const { email, password } = body;

      try {
        let employee = await Employee.findOne({ email: email });

        if (!employee) {
          set.status = 400;
          return { message: "Employee not found" };
        }

        // let isMatched = await Bun.password.verify(password, employee.password);
if(employee.password!=password){
  set.status = 400;
    return { message: "Invalid password" };
}
        // if (!isMatched) {
        //   set.status = 400;
        //   return { message: "Invalid password" };
        // }

        const token = await PasetoUtil.encodePaseto(
          {
            email: employee.email.toString(),
            id: employee._id.toString(),
            role: "employee",
          },
          false
        );

        return {
          message: "Employee authenticated successfully",
          data: { token,
            empDetails: {
              image: employee.image ?? "",
              email: employee.email,
              mobile: employee.mobile??0,
              name: employee.name,
              empId: employee._id.toString(),
            } },
          status: true,
        };
      } catch (error) {
        return {
          error,
          status: false,
        };
      }
    },
    {
      body: t.Object({
        email: t.String({
          format: "email",
        }),
        password: t.String({}),
      }),
      detail: {
        summary: "Login as employee to get token",
        description: "Login as employee to get token",
      },
    }
  )
  .post(
    "/decrypt-token",
    async ({ body }) => {
      const { token } = body;

      try {
        const payload = await PasetoUtil.decodePaseto(token);

        return {
          message: "Token decrypted successfully",
          data: { ...payload?.payload },
          status: true,
        };
      } catch (error) {
        console.error(error);
        return {
          error,
          status: false,
        };
      }
    },
    {
      body: t.Object({
        token: t.String(),
      }),
      detail: {
        summary: "Decrypt the token",
        description: "Decrypt the token",
      },
    }
  );