import { generateReferCode } from "@/lib/util";
import Elysia, { t } from "elysia";
import { PasetoUtil } from "../../lib/paseto";
import { User } from "../../models/user-model";

export const usersAuthController = new Elysia({
  prefix: "/userauth",
  detail: {
    tags: ["User - Auth"],
  },
})
  .post(
    "/login",
    async ({ body }) => {
      const { mobile} = body;

      try {
        let newUser = false;
        let user = await User.findOne({ mobile });

        if (!user) {
          // let refCode = generateReferCode();

          newUser = true;
          user = await User.create({
            mobile,
            active: true,
            username: "",
            favorites: null,
            email: "",
            profileImage: "",
            role: "user",
            // refCode,
          });

          // if (referCode) {
          //   const refree = await User.findOne({
          //     refCode: referCode,
          //   });

          //   if (refree) {
          //     user.referedBy = refree._id;
          //     await user.save();
          //   }
          // }
        }

        const token = await PasetoUtil.encodePaseto({
          mobile: user.mobile.toString(),
          id: user._id.toString(),
          role: "user",
        });

        return {
          message: "User processed successfully",
          data: {
            token,
            userDetails: {
              profileImage: user.profileImage,
              email: user.email,
              mobile: user.mobile,
              username: user.username,
              userId: user._id.toString(),
              // refCode: user.refCode,
            },
            newUser,
          },
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
        mobile: t.String({
          minLength: 10,
          maxLength: 10,
        }),
        // referCode: t.Optional(
        //   t.String({
        //     default: "",
        //   })
        // ),
      }),
      detail: {
        summary: "Login the user to get token",
        description: "Login the user to get token",
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
          message: "User processed successfully",
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
