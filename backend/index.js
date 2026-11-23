const { WebSocketServer } = require("ws");
const LockManager = require("./lockManager");

function sendJson(socket, payload) {
  if (socket && socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function startServer(port = Number(process.env.PORT) || 8080, leaseMs = 30000, handoverTimeoutMs = leaseMs) {
  const wss = new WebSocketServer({ port });
  const userSockets = new Map();
  const pendingHandovers = new Map();

  function broadcast(payload, socket = null) {
    for (const client of wss.clients) {
      if (client === socket) continue;
      sendJson(client, payload);
    }
  }

  const lockManager = new LockManager(
    leaseMs,
    (msg) => {
      if (msg.type === "HANDOVER_FAILED") {
        const awaiter = pendingHandovers.get(msg.requestId);
        if (awaiter) {
          clearTimeout(awaiter.timer);
          pendingHandovers.delete(msg.requestId);
          awaiter.resolve({
            type: "HANDOVER_DECLINED",
            requestId: msg.requestId,
            symbolPath: msg.symbolPath,
            fromUserId: msg.fromUserId,
            toUserId: msg.toUserId,
            reason: "REQUEST_EXPIRED",
          });
        }
        return;
      }
      broadcast(msg);
    },
    handoverTimeoutMs
  );

  const sweepTimer = setInterval(() => {
    lockManager.removeExpired();
  }, 1000);

  wss.on("close", () => {
    clearInterval(sweepTimer);
    for (const [, awaiter] of pendingHandovers) {
      clearTimeout(awaiter.timer);
      awaiter.resolve({ type: "HANDOVER_DECLINED", reason: "SERVER_SHUTDOWN" });
    }
    pendingHandovers.clear();
  });

  wss.on("connection", (socket) => {
    sendJson(socket, lockManager.getState());

    socket.on("message", async (rawData) => {
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

      const uid = msg.userId || msg.ownerId || msg.fromUserId || msg.responderUserId;
      if (uid) {
        userSockets.set(uid, socket);
        socket.userId = uid;
      }

      let response;
      switch (msg.type) {
        case "IDENTIFY":
          response = msg.userId ? { type: "IDENTIFIED", userId: msg.userId } : { type: "ERROR", reason: "MISSING_USER_ID" };
          break;

        case "ACQUIRE_LOCK":
          response = lockManager.acquireLock(msg);
          if (response.type === "LOCK_ACQUIRED") {
            broadcast(response, socket);
          }
          break;

        case "HEARTBEAT":
          response = lockManager.heartbeat(msg);
          break;

        case "RELEASE_LOCK":
          response = lockManager.releaseLock(msg);
          if (response.type === "LOCK_RELEASED") {
            broadcast(response, socket);
          }
          break;

        case "GET_STATE":
          response = lockManager.getState();
          break;

        case "HANDOVER_REQUEST": {
          const req = lockManager.requestHandover(msg);
          if (req.type !== "HANDOVER_REQUEST") {
            response = req;
            break;
          }

          const targetSocket = userSockets.get(req.toUserId);
          if (!targetSocket || targetSocket.readyState !== targetSocket.OPEN) {
            lockManager.pendingHandovers.delete(req.requestId);
            response = {
              type: "HANDOVER_DECLINED",
              requestId: req.requestId,
              symbolPath: req.symbolPath,
              fromUserId: req.fromUserId,
              toUserId: req.toUserId,
              reason: "HOLDER_OFFLINE",
            };
            break;
          }

          sendJson(targetSocket, req);

          response = await new Promise((resolve) => {
            const timer = setTimeout(() => {
              pendingHandovers.delete(req.requestId);
              lockManager.pendingHandovers.delete(req.requestId);
              resolve({
                type: "HANDOVER_DECLINED",
                requestId: req.requestId,
                symbolPath: req.symbolPath,
                fromUserId: req.fromUserId,
                toUserId: req.toUserId,
                reason: "REQUEST_TIMEOUT",
              });
            }, lockManager.handoverTimeoutMs);

            pendingHandovers.set(req.requestId, { resolve, timer });
          });
          break;
        }

        case "HANDOVER_RESPONSE": {
          const pending = pendingHandovers.get(msg.requestId);
          if (pending) {
            clearTimeout(pending.timer);
            pendingHandovers.delete(msg.requestId);
          }

          response = lockManager.respondHandover({
            ...msg,
            responderUserId: msg.responderUserId || socket.userId,
          });

          if (response.type === "HANDOVER_ACCEPTED") {
            broadcast(response.lock);
          }

          if (pending) {
            pending.resolve(response);
          }
          break;
        }

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
      if (socket.userId && userSockets.get(socket.userId) === socket) {
        userSockets.delete(socket.userId);
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
  return { wss, lockManager, userSockets };
}

if (require.main === module) {
  startServer();
}
module.exports = { startServer };
