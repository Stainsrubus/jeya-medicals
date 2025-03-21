import { sendNotification } from "@/lib/firebase";
import { User } from "@/models/user-model";
import Elysia, { t } from "elysia";
import { NotificationModel } from "../../models/notification-model";

const notificationController = new Elysia({
  prefix: "/notification",
  detail: {
    tags: ["Admin - Notifications"],
  },
})
  .post(
    "/create",
    async ({ body }) => {
      try {
        const { title, description, type } = body;

        const notification = await NotificationModel.create({
          title,
          description,
          type,
        });

        return {
          message: "Notification Created Successfully",
          data: notification,
          status: "success",
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
      body: t.Object({
        title: t.String(),
        description: t.String(),
        type: t.String(),
      }),
      detail: {
        summary: "Create a new notification",
      },
    }
  )
  .get(
    "/all",
    async ({ query }) => {
      try {
        const { page, limit } = query;
        let _limit = Number(limit) || 4;
        let _page = Number(page) || 1;

        const notifications = await NotificationModel.find()
          .skip((_page - 1) * _limit)
          .limit(_limit)
          .sort({ createdAt: -1 })
          .lean();

        const totalNotifications = await NotificationModel.countDocuments();
        const totalPages = Math.ceil(totalNotifications / _limit);
        const hasMore = notifications.length === _limit && _page < totalPages;

        return {
          notifications,
          currentPage: _page,
          totalPages,
          total: totalNotifications,
          hasMore,
          status: "success",
        };
      } catch (error: any) {
        console.log(error);
        return {
          error: error.message,
          status: "error",
        };
      }
    },
    {
      query: t.Object({
        page: t.Number({
          default: 1,
        }),
        limit: t.Number({
          default: 4,
        }),
      }),
      detail: {
        summary: "Get all notifications for the user",
      },
    }
  )
  .post(
    "/massnotifications",
    async ({ set, body }) => {
      try {
        let { title, message, users, type } = body;

        if (type == "all") {
          let _users = await User.find({
            active: true,
          });

          users = _users.map((user) => user._id.toString());
        }

        const userPromises = users.map(async (user) => {
          const _user = await User.findById(user);
          if (_user && _user.fcmToken) {
            return sendNotification(_user.fcmToken, title, message);
          }
          return null;
        });

        await Promise.all(userPromises.filter(Boolean));

        return {
          message: "Notification sent successfully",
          status: 200,
        };
      } catch (error: any) {
        set.status = 400;
        return {
          message: error.message ?? "Can't send notification",
        };
      }
    },
    {
      body: t.Object({
        users: t.Array(t.String()),
        title: t.String(),
        message: t.String(),
        type: t.String({
          default: "selected",
        }),
      }),
    }
  );

export { notificationController };
