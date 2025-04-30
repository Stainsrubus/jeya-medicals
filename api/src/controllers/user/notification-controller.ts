import { sendNotification } from "@/lib/firebase";
import { NotificationModel } from "@/models/notification-model";
import { User } from "@/models/user-model";
import { StoreType } from "@/types";
import Elysia, { t } from "elysia";

export const notificationController = new Elysia({
  prefix: "/notification",
  detail: {
    tags: ["User - Notifications"],
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
})
.post(
  "/",
  async ({ set, body, store }) => {
    try {
      const userId = (store as StoreType)["id"];

      const { title, content } = body;

      const user = await User.findById(userId);
      if (!user) {
        set.status = 404;
        return { message: "User not found" };
      }

      await sendNotification(user.fcmToken, title, content);

      return {
        message: "Notification sent successfully",
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
      title: t.String(),
      content: t.String(),
    }),
    detail: {
      summary: "Send a notification to the user",

      responses: {
        200: {
          description: "Notifications fetched successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Something went wrong",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
      },
    },
  }
)
.get(
  "/hasNew",
  async ({ store }) => {
    try {
      const userId = (store as StoreType)["id"];

      const hasUnread = await NotificationModel.exists({ userId, isRead: false });

      return {
        hasNew: !!hasUnread,
      };
    } catch (error: any) {
      console.log(error);
      return {
        hasNew: false, 
      };
    }
  },
  {
    detail: {
      summary: "Check if the user has new unread notifications",
    },
  }
)

.get(
  "/",
  async ({ query, store }) => {
    try {
      const userId = (store as StoreType)["id"];
      const { page, limit } = query;
      let _limit = Number(limit) || 4;
      let _page = Number(page) || 1;

      const notifications = await NotificationModel.find({ userId })
        .skip((_page - 1) * _limit)
        .limit(_limit)
        .sort({ createdAt: -1 })
        .lean();

      const totalNotifications = await NotificationModel.countDocuments({ userId });
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
  "/mark-read",
  async ({ store }) => {
    try {
      const userId = (store as StoreType)["id"];

      const result = await NotificationModel.updateMany(
        { userId, isRead: false }, // only unread ones
        { $set: { isRead: true } }
      );

      return {
        modifiedCount: result.modifiedCount,
        status: "success",
        message: "All notifications marked as read",
      };
    } catch (error: any) {
      console.log(error);
      return {
        status: "error",
        error: error.message,
      };
    }
  },
  {
    detail: {
      summary: "Mark all user notifications as read",
    },
  }
)
