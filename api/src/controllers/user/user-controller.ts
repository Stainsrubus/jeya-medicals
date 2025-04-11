import { deleteFile, saveFile } from "@/lib/file";
import Elysia, { t } from "elysia";
import { User } from "../../models/user-model";

export const userController = new Elysia({
  prefix: "/user",
  detail: {
    tags: ["User - Profile"],
  },
})
.put(
  "/",
  async ({ body, store, set }) => {
    try {
      let _store: any = store;
      let id = _store?.id ?? "";

      const { username, profileImage } = body;

      const user = await User.findById(id);

      if (!user) {
        return {
          message: "User not found",
          status: false,
        };
      }

      if (profileImage) {
        const { filename, ok } = await saveFile(profileImage, "profile-images");

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

      user.username = username || user.username;

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
      username: t.Optional(
        t.String({
          default: "",
        })
      ),
      profileImage: t.Optional(t.Any()),
    }),
    detail: {
      summary: "Update a user by id",
    },
  }
);
