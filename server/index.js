const { WebSocketServer } = require("ws");
const LockManager = require("./lockManager");

const PORT = process.env.PORT || 8080;
const lockManager = new LockManager();
const wss = new WebSocketServer({ port: PORT });

function sendJson(socket, payload) {
  if (socket.readyState == socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function broadcast(payload) {
  for (const client of wss.clients) {
    sendJson(client, payload);
  }
}

wss.on("connection", (socket) => {
  let activeSymbol = null;
  let activeOwnerId = null;
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
          broadcast(response);
        }
        break;
      case "HEARTBEAT":
        response = lockManager.heartbeat(msg);
        break;
      case "RELEASE_LOCK":
        response = lockManager.releaseLock(msg);
        if (response.type == "LOCK_RELEASED") {
          activeSymbol = null;
          broadcast(response);
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
  console.log(`DevSync WebSocket server listening on ws://localhost:${PORT}`);
});
