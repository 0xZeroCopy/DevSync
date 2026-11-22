const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { startServer } = require("../index");

function connectClient(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const queue = [];
    const waiters = [];

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data.toString());
      if (waiters.length > 0) {
        const resolveWaiter = waiters.shift();
        resolveWaiter(data);
      } else {
        queue.push(data);
      }
    };

    ws.onerror = (err) => reject(err);
    ws.onopen = () => {
      resolve({
        ws,
        send(payload) {
          ws.send(JSON.stringify(payload));
        },
        nextMessage(timeoutMs = 1500) {
          if (queue.length > 0) {
            return Promise.resolve(queue.shift());
          }
          return new Promise((res, rej) => {
            const timer = setTimeout(() => {
              const idx = waiters.indexOf(onMsg);
              if (idx !== -1) waiters.splice(idx, 1);
              rej(new Error("Timed out waiting for WebSocket message"));
            }, timeoutMs);

            function onMsg(msg) {
              clearTimeout(timer);
              res(msg);
            }
            waiters.push(onMsg);
          });
        },
        close() {
          return new Promise((res) => {
            if (ws.readyState === ws.CLOSED) return res();
            ws.onclose = () => res();
            ws.close();
          });
        },
      });
    };
  });
}

const sampleAcquire = (overrides = {}) => ({
  type: "ACQUIRE_LOCK",
  filePath: "src/index.js",
  symbolPath: "src/index.js#main",
  startOffset: 0,
  endOffset: 10,
  ownerId: "u1",
  ownerName: "Suyas",
  intent: "editing",
  ...overrides,
});

describe("DevSync WebSocket coordination", () => {
  let wss;
  let url;

  beforeEach(async () => {
    const started = startServer(0);
    wss = started.wss;
    await new Promise((resolve) => {
      if (wss.address()) return resolve();
      wss.once("listening", resolve);
    });
    url = `ws://localhost:${wss.address().port}`;
  });

  afterEach(async () => {
    for (const client of wss.clients) {
      client.terminate();
    }
    await new Promise((resolve) => wss.close(resolve));
  });

  test("sends initial STATE_SNAPSHOT on connect and supports GET_STATE", async () => {
    const c1 = await connectClient(url);
    const snap1 = await c1.nextMessage();
    assert.equal(snap1.type, "STATE_SNAPSHOT");
    assert.deepEqual(snap1.locks, []);

    c1.send(sampleAcquire());
    const acquired = await c1.nextMessage();
    assert.equal(acquired.type, "LOCK_ACQUIRED");

    const c2 = await connectClient(url);
    const snap2 = await c2.nextMessage();
    assert.equal(snap2.type, "STATE_SNAPSHOT");
    assert.equal(snap2.locks.length, 1);
    assert.equal(snap2.locks[0].ownerId, "u1");

    c2.send({ type: "GET_STATE" });
    const getStateReply = await c2.nextMessage();
    assert.equal(getStateReply.type, "STATE_SNAPSHOT");
    assert.equal(getStateReply.locks.length, 1);

    await Promise.all([c1.close(), c2.close()]);
  });

  test("broadcasts LOCK_ACQUIRED and LOCK_RELEASED to other clients", async () => {
    const c1 = await connectClient(url);
    await c1.nextMessage();
    const c2 = await connectClient(url);
    await c2.nextMessage();

    c1.send(sampleAcquire());
    const c1Ack = await c1.nextMessage();
    const c2Broadcast = await c2.nextMessage();
    assert.equal(c1Ack.type, "LOCK_ACQUIRED");
    assert.equal(c2Broadcast.type, "LOCK_ACQUIRED");
    assert.equal(c2Broadcast.symbolPath, "src/index.js#main");

    c1.send({ type: "RELEASE_LOCK", symbolPath: "src/index.js#main", ownerId: "u1" });
    const c1Release = await c1.nextMessage();
    const c2ReleaseBroadcast = await c2.nextMessage();
    assert.equal(c1Release.type, "LOCK_RELEASED");
    assert.equal(c2ReleaseBroadcast.type, "LOCK_RELEASED");
    assert.equal(c2ReleaseBroadcast.reason, "RELEASED");

    await Promise.all([c1.close(), c2.close()]);
  });

  test("denies conflicting symbol lock and enforces one lock per user", async () => {
    const c1 = await connectClient(url);
    await c1.nextMessage();
    const c2 = await connectClient(url);
    await c2.nextMessage();

    c1.send(sampleAcquire({ symbolPath: "src/index.js#a", ownerId: "u1" }));
    assert.equal((await c1.nextMessage()).type, "LOCK_ACQUIRED");
    await c2.nextMessage();

    c1.send(sampleAcquire({ symbolPath: "src/index.js#b", ownerId: "u1" }));
    const sameUserDenied = await c1.nextMessage();
    assert.equal(sameUserDenied.type, "LOCK_DENIED");
    assert.equal(sameUserDenied.reason, "ALREADY_HOLDING_LOCK");

    c2.send(sampleAcquire({ symbolPath: "src/index.js#a", ownerId: "u2", ownerName: "Other" }));
    const otherUserDenied = await c2.nextMessage();
    assert.equal(otherUserDenied.type, "LOCK_DENIED");
    assert.equal(otherUserDenied.reason, "ALREADY_LOCKED");

    await Promise.all([c1.close(), c2.close()]);
  });

  test("keeps the lock after the holder disconnects (expiry cleans it up)", async () => {
    const c1 = await connectClient(url);
    await c1.nextMessage();
    const c2 = await connectClient(url);
    await c2.nextMessage();

    c1.send(sampleAcquire());
    await c1.nextMessage();
    await c2.nextMessage();
    await c1.close();

    c2.send({ type: "GET_STATE" });
    const snap = await c2.nextMessage();
    assert.equal(snap.type, "STATE_SNAPSHOT");
    assert.equal(snap.locks.length, 1);
    assert.equal(snap.locks[0].ownerId, "u1");

    await c2.close();
  });

  test("STATE_SNAPSHOT locks include symbolPath and filePath", async () => {
    const c1 = await connectClient(url);
    await c1.nextMessage();
    c1.send(sampleAcquire());
    await c1.nextMessage();
    const c2 = await connectClient(url);
    const snap = await c2.nextMessage();
    assert.equal(snap.locks[0].symbolPath, "src/index.js#main");
    assert.equal(snap.locks[0].filePath, "src/index.js");
    await Promise.all([c1.close(), c2.close()]);
  });

  test("re-acquiring own lock updates the intent and broadcasts it", async () => {
    const c1 = await connectClient(url);
    await c1.nextMessage();
    const c2 = await connectClient(url);
    await c2.nextMessage();

    c1.send(sampleAcquire({ intent: "old intent" }));
    const first = await c1.nextMessage();
    await c2.nextMessage();
    c1.send(sampleAcquire({ intent: "new intent" }));
    const second = await c1.nextMessage();
    const broadcast = await c2.nextMessage();
    assert.equal(second.type, "LOCK_ACQUIRED");
    assert.equal(second.intent, "new intent");
    assert.equal(second.lockId, first.lockId);
    assert.equal(broadcast.type, "LOCK_ACQUIRED");
    assert.equal(broadcast.intent, "new intent");
    await Promise.all([c1.close(), c2.close()]);
  });

  test("renews lock lease on HEARTBEAT", async () => {
    const c1 = await connectClient(url);
    await c1.nextMessage();
    c1.send(sampleAcquire());
    const acquired = await c1.nextMessage();
    c1.send({ type: "HEARTBEAT", symbolPath: "src/index.js#main", ownerId: "u1" });
    const renewed = await c1.nextMessage();
    assert.equal(renewed.type, "LOCK_RENEWED");
    assert.ok(renewed.expiresAt >= acquired.expiresAt);
    await c1.close();
  });

  test("handles full HANDOVER negotiation workflow (request, approve, transfer ownership)", async () => {
    const c1 = await connectClient(url);
    await c1.nextMessage();
    const c2 = await connectClient(url);
    await c2.nextMessage();

    c1.send(sampleAcquire({ ownerId: "u1", ownerName: "Alice" }));
    await c1.nextMessage();
    await c2.nextMessage();

    c2.send({
      type: "HANDOVER_REQUEST", requestId: "ho_ws_1", filePath: "src/index.js",
      symbolPath: "src/index.js#main", fromUserId: "u2", fromUserName: "Bob",
      toUserId: "u1", note: "Need urgently",
    });
    assert.equal((await c2.nextMessage()).type, "HANDOVER_REQUEST");
    const notification = await c1.nextMessage();
    assert.equal(notification.type, "HANDOVER_REQUEST");
    assert.equal(notification.fromUserName, "Bob");

    c1.send({
      type: "HANDOVER_RESPONSE", requestId: "ho_ws_1", symbolPath: "src/index.js#main",
      responderUserId: "u1", accepted: true, nextIntent: "Urgent fix by Bob",
    });
    assert.equal((await c1.nextMessage()).type, "LOCK_ACQUIRED");
    assert.equal((await c2.nextMessage()).type, "LOCK_ACQUIRED");
    assert.equal((await c1.nextMessage()).type, "HANDOVER_ACCEPTED");
    assert.equal((await c2.nextMessage()).type, "HANDOVER_ACCEPTED");
    await Promise.all([c1.close(), c2.close()]);
  });

  test("responds to requester and holder when a handover response is invalid", async () => {
    const holder = await connectClient(url);
    await holder.nextMessage();
    const requester = await connectClient(url);
    await requester.nextMessage();

    holder.send(sampleAcquire({ ownerId: "u1", ownerName: "Alice" }));
    await holder.nextMessage();
    await requester.nextMessage();
    requester.send({
      type: "HANDOVER_REQUEST", requestId: "ho_ws_invalid", symbolPath: "src/index.js#main",
      fromUserId: "u2", fromUserName: "Bob", toUserId: "u1",
    });
    await requester.nextMessage();
    await holder.nextMessage();

    holder.send({
      type: "HANDOVER_RESPONSE", requestId: "ho_ws_invalid", symbolPath: "src/index.js#main",
      responderUserId: "u2", accepted: true,
    });
    assert.equal((await holder.nextMessage()).reason, "NOT_RECIPIENT");
    const failureForRequester = await requester.nextMessage();
    assert.equal(failureForRequester.type, "HANDOVER_FAILED");
    assert.equal(failureForRequester.reason, "NOT_RECIPIENT");
    await Promise.all([holder.close(), requester.close()]);
  });

  test("notifies requester when HANDOVER is declined", async () => {
    const c1 = await connectClient(url);
    await c1.nextMessage();
    const c2 = await connectClient(url);
    await c2.nextMessage();
    c1.send(sampleAcquire({ ownerId: "u1" }));
    await c1.nextMessage();
    await c2.nextMessage();

    c2.send({
      type: "HANDOVER_REQUEST", requestId: "ho_ws_2", filePath: "src/index.js",
      symbolPath: "src/index.js#main", fromUserId: "u2", fromUserName: "Bob", toUserId: "u1",
    });
    await c2.nextMessage();
    await c1.nextMessage();
    c1.send({
      type: "HANDOVER_RESPONSE", requestId: "ho_ws_2", symbolPath: "src/index.js#main",
      responderUserId: "u1", accepted: false,
    });
    const declined = await c2.nextMessage();
    assert.equal(declined.type, "HANDOVER_DECLINED");
    assert.equal(declined.reason, "DECLINED_BY_OWNER");
    await Promise.all([c1.close(), c2.close()]);
  });
});

describe("DevSync lock expiry (short lease)", () => {
  let wss;
  let url;

  beforeEach(async () => {
    const started = startServer(0, 200);
    wss = started.wss;
    await new Promise((resolve) => {
      if (wss.address()) return resolve();
      wss.once("listening", resolve);
    });
    url = `ws://localhost:${wss.address().port}`;
  });

  afterEach(async () => {
    for (const client of wss.clients) client.terminate();
    await new Promise((resolve) => wss.close(resolve));
  });

  test("broadcasts LOCK_RELEASED with reason EXPIRED when a lease runs out", async () => {
    const c1 = await connectClient(url);
    await c1.nextMessage();
    const c2 = await connectClient(url);
    await c2.nextMessage();
    c1.send(sampleAcquire());
    await c1.nextMessage();
    await c2.nextMessage();
    const expired = await c2.nextMessage(3000);
    assert.equal(expired.type, "LOCK_RELEASED");
    assert.equal(expired.reason, "EXPIRED");
    assert.equal(expired.symbolPath, "src/index.js#main");
    assert.equal(expired.filePath, "src/index.js");
    assert.equal(expired.ownerId, "u1");
    await Promise.all([c1.close(), c2.close()]);
  });

  test("another user can acquire the symbol after it expires", async () => {
    const c1 = await connectClient(url);
    await c1.nextMessage();
    const c2 = await connectClient(url);
    await c2.nextMessage();
    c1.send(sampleAcquire());
    await c1.nextMessage();
    await c2.nextMessage();
    await c2.nextMessage(3000);
    c2.send(sampleAcquire({ ownerId: "u2", ownerName: "Other" }));
    const result = await c2.nextMessage();
    assert.equal(result.type, "LOCK_ACQUIRED");
    assert.equal(result.ownerId, "u2");
    await Promise.all([c1.close(), c2.close()]);
  });

  test("owner can lock a different symbol after their old lock expires", async () => {
    const c1 = await connectClient(url);
    await c1.nextMessage();
    c1.send(sampleAcquire({ symbolPath: "src/index.js#a" }));
    await c1.nextMessage();
    await c1.nextMessage(3000);
    c1.send(sampleAcquire({ symbolPath: "src/index.js#b" }));
    const result = await c1.nextMessage();
    assert.equal(result.type, "LOCK_ACQUIRED");
    assert.equal(result.symbolPath, "src/index.js#b");
    await c1.close();
  });

  test("heartbeats keep a lock from expiring", async () => {
    const c1 = await connectClient(url);
    await c1.nextMessage();
    const c2 = await connectClient(url);
    await c2.nextMessage();
    c1.send(sampleAcquire());
    await c1.nextMessage();
    await c2.nextMessage();

    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      c1.send({ type: "HEARTBEAT", symbolPath: "src/index.js#main", ownerId: "u1" });
      assert.equal((await c1.nextMessage()).type, "LOCK_RENEWED");
    }
    c2.send({ type: "GET_STATE" });
    assert.equal((await c2.nextMessage()).locks.length, 1);
    await Promise.all([c1.close(), c2.close()]);
  });
});
