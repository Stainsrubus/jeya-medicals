import { deleteFile, saveFile } from "@/lib/file-s3";
import Elysia, { t } from "elysia";
import { User } from "../../models/user-model";

export const userController = new Elysia({
  prefix: "/user",
  detail: {
    tags: ["User - Profile"],
  },
}).put(
  "/",
  async ({ body, store, set }) => {
    try {
      let _store: any = store;
      let id = _store?.id ?? "";

      const { name, email, preferredCusine, image, fcmToken } = body;

      const user = await User.findById(id);

      if (!user) {
        return {
          message: "User not found",
          status: false,
        };
      }

      if (image) {
        const { filename, ok } = await saveFile(image, "profile-images");

        if (!ok) {
          set.status = 400;

          return {
            status: false,
            message: "Unable to upload profile image",
          };
        }

        deleteFile(user.profileImage);

        user.profileImage = filename;
      }

      user.username = name || user.username;
      user.prefferedCusine = preferredCusine || user.prefferedCusine;
      user.email = email || user.email;

      if (fcmToken) {
        user.fcmToken = fcmToken;
      }

      await user.save();

      return {
        message: "User updated successfully",
        status: true,
        user: user,
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
      name: t.Optional(
        t.String({
          default: "",
        })
      ),
      image: t.Optional(t.Any()),
      email: t.Optional(
        t.String({
          default: "",
        })
      ),
      preferredCusine: t.String({
        default: "",
      }),
      fcmToken: t.String({
        default: "",
      }),
    }),
    detail: {
      summary: "Update a user by id",
    },
  }
);
