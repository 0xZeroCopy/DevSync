const { WebSocketServer } = require("ws");
const LockManager = require("./lockManager");

function sendJson(socket, payload) {
  if (socket.readyState == socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function startServer(port = Number(process.env.PORT) || 8080) {
  const lockManager = new LockManager();
  const wss = new WebSocketServer({ port });

  function broadcast(payload, socket = null) {
    for (const client of wss.clients) {
      if (client == socket) continue;
      sendJson(client, payload);
    }
  }

  wss.on("connection", (socket) => {
    let activeSymbol = null;
    let activeOwnerId = null;
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
            activeSymbol = msg.symbolPath;
            activeOwnerId = msg.ownerId;
            broadcast(response, socket);
          }
          break;
        case "HEARTBEAT":
          response = lockManager.heartbeat(msg);
          break;
        case "RELEASE_LOCK":
          response = lockManager.releaseLock(msg);
          if (response.type == "LOCK_RELEASED") {
            activeSymbol = null;
            broadcast(response, socket);
          }
          break;
        case "GET_STATE":
          response = lockManager.getState();
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
    socket.on("close", () => {
      const currentLock = lockManager.locks.get(activeSymbol);
      if (currentLock && currentLock.ownerId == activeOwnerId) {
        lockManager.locks.delete(activeSymbol);
        broadcast({
          type: "LOCK_RELEASED",
          symbolPath: activeSymbol,
          ownerId: activeOwnerId,
          reason: "DISCONNECTED",
        });
      }
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
