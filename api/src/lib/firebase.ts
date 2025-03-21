import admin from "firebase-admin";

// var serviceAccount = require("../../credentials.json");

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

async function sendNotification(
  token: string,
  title: string,
  body: string,
  payload: any = {},
) {
  // try {
  //   if (!token) throw new Error("Token not found");
  //   if (!title) throw new Error("Title not found");
  //   if (!body) throw new Error("Body not found");

  //   await admin.messaging().send({
  //     token,
  //     android: {
  //       notification: {
  //         channelId: "kings_chic",
  //         sound: "noti",
  //       },
  //       priority: "high",
  //     },
  //     data: {
  //       title,
  //       body,
  //       ...payload,
  //     },
  //     notification: {
  //       title,
  //       body,
  //     },
  //   });

  //   return true;
  // } catch (error) {
  //   console.log(error);

  //   return false;
  // }
}

export { admin, sendNotification };
