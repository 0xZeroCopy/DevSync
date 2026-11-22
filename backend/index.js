const { WebSocketServer } = require("ws");
const LockManager = require("./lockManager");

function sendJson(socket, payload) {
  if (socket.readyState == socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function startServer(port = Number(process.env.PORT) || 8080, leaseMs = 30000) {
  const wss = new WebSocketServer({ port });

  function broadcast(payload, socket = null) {
    for (const client of wss.clients) {
      if (client == socket) continue;
      sendJson(client, payload);
    }
  }

  const lockManager = new LockManager(leaseMs, (msg) => broadcast(msg));

  const sweepTimer = setInterval(() => {
    lockManager.removeExpired();
  }, 1000);

  wss.on("close", () => {
    clearInterval(sweepTimer);
  });

  wss.on("connection", (socket) => {
    sendJson(socket, lockManager.getState());
    socket.on("message", (rawData) => {
      let msg;
      try {
        msg = JSON.parse(rawData.toString());
      } catch {
        sendJson(socket, { type: "ERROR", reason: "INVALID_JSON" });
        return;
      }

      if (!msg || typeof msg.type !== "string") {
        sendJson(socket, { type: "ERROR", reason: "MISSING_MESSAGE_TYPE" });
        return;
      }
      let response;
      switch (msg.type) {
        case "ACQUIRE_LOCK":
          response = lockManager.acquireLock(msg);
          if (response.type == "LOCK_ACQUIRED") {
            broadcast(response, socket);
          }
          break;
        case "HEARTBEAT":
          response = lockManager.heartbeat(msg);
          break;
        case "RELEASE_LOCK":
          response = lockManager.releaseLock(msg);
          if (response.type == "LOCK_RELEASED") {
            broadcast(response, socket);
          }
          break;
        case "GET_STATE":
          response = lockManager.getState();
          break;
        case "HANDOVER_REQUEST":
          response = lockManager.requestHandover(msg);
          if (response.type === "HANDOVER_REQUEST") {
            // Forward handover request to all clients so target lock owner receives prompt
            broadcast(response, socket);
          }
          break;
        case "HANDOVER_RESPONSE":
          response = lockManager.respondHandover(msg);
          if (response.type === "HANDOVER_ACCEPTED") {
            // Broadcast newly transferred lock to all clients so User2 becomes owner and User1 is released
            broadcast(response.lock, null);
            broadcast(response, null);
          } else if (response.type === "HANDOVER_DECLINED") {
            broadcast(response, socket);
          }
          break;
        default:
          response = {
            type: "ERROR",
            reason: "UNKNOWN_MESSAGE_TYPE",
          };
          break;
      }

      sendJson(socket, response);
    });
  });
  wss.on("listening", () => {
    const addr = wss.address();
    const actualPort = typeof addr === "object" && addr ? addr.port : port;
    console.log(
      `DevSync WebSocket server listening on ws://localhost:${actualPort}`,
    );
  });
  return { wss, lockManager };
}

if (require.main === module) {
  startServer();
}
module.exports = { startServer };
