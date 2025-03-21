import { addWebSocket, removeWebSocket } from "@/lib/ws-store";
import { app } from "./setup";

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "localhost";

let intervel: any;

app.ws("/api/admin/ws", {
  open: async (ws) => {
    try {
      addWebSocket(ws);
      console.log("An Admin connected");
      ws.send(JSON.stringify({ type: "connected" }));

      intervel = setInterval(() => {
        ws.send(JSON.stringify({ type: "ping" }));
      }, 20000); // 20 seconds
    } catch (error) {
      ws.send(JSON.stringify({ type: "not connected" }));
      console.log("Admin closed!");
      clearInterval(intervel);
      ws.close();
    }
  },
  message(ws, message) {
    console.log("Message received", message);
  },
  close(ws) {
    removeWebSocket(ws);
    console.log("Admin closed!");
    clearInterval(intervel);
  },
  sendPings: true,
  ping(message) {
    return message;
  },
  idleTimeout: 600,
  pong(message) {
    return message;
  },
});

app.listen(
  {
    port: PORT,
    hostname: HOST,
  },
  ({ hostname, port }) => {
    console.log(`Listening on http://${hostname}:${port}`);
    // console.log(`Checkout the docs at http://${hostname}:${port}/api/docs`);
  }
);
