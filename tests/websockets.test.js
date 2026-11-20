// tests/devsync.test.js
const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { startServer } = require("../server/index");

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
    await c1.nextMessage(); // initial snapshot

    const c2 = await connectClient(url);
    await c2.nextMessage(); // initial snapshot

    c1.send(sampleAcquire());
    const c1Ack = await c1.nextMessage();
    const c2Broadcast = await c2.nextMessage();

    assert.equal(c1Ack.type, "LOCK_ACQUIRED");
    assert.equal(c2Broadcast.type, "LOCK_ACQUIRED");
    assert.equal(c2Broadcast.symbolPath, "src/index.js#main");

    c1.send({
      type: "RELEASE_LOCK",
      symbolPath: "src/index.js#main",
      ownerId: "u1",
    });
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
    await c2.nextMessage(); // broadcast

    // Same user trying a different symbol -> denied
    c1.send(sampleAcquire({ symbolPath: "src/index.js#b", ownerId: "u1" }));
    const sameUserDenied = await c1.nextMessage();
    assert.equal(sameUserDenied.type, "LOCK_DENIED");
    assert.equal(sameUserDenied.reason, "ALREADY_HOLDING_LOCK");

    // Different user trying locked symbol -> denied
    c2.send(
      sampleAcquire({
        symbolPath: "src/index.js#a",
        ownerId: "u2",
        ownerName: "Other",
      }),
    );
    const otherUserDenied = await c2.nextMessage();
    assert.equal(otherUserDenied.type, "LOCK_DENIED");
    assert.equal(otherUserDenied.reason, "ALREADY_LOCKED");

    await Promise.all([c1.close(), c2.close()]);
  });

  test("releases lock with reason DISCONNECTED when holder closes socket", async () => {
    const c1 = await connectClient(url);
    await c1.nextMessage();

    const c2 = await connectClient(url);
    await c2.nextMessage();

    c1.send(sampleAcquire());
    await c1.nextMessage();
    await c2.nextMessage(); // LOCK_ACQUIRED

    await c1.close();
    const disconnectMsg = await c2.nextMessage();
    assert.equal(disconnectMsg.type, "LOCK_RELEASED");
    assert.equal(disconnectMsg.reason, "DISCONNECTED");
    assert.equal(disconnectMsg.ownerId, "u1");

    await c2.close();
  });

  test("renews lock lease on HEARTBEAT", async () => {
    const c1 = await connectClient(url);
    await c1.nextMessage();

    c1.send(sampleAcquire());
    const acquired = await c1.nextMessage();

    c1.send({
      type: "HEARTBEAT",
      symbolPath: "src/index.js#main",
      ownerId: "u1",
    });
    const renewed = await c1.nextMessage();
    assert.equal(renewed.type, "LOCK_RENEWED");
    assert.ok(renewed.expiresAt >= acquired.expiresAt);

    await c1.close();
  });
});
