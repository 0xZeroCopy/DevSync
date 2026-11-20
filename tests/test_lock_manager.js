const assert = require("assert");
const LockManager = require("../server/lockManager.js");

const lm = new LockManager(500); // short 500ms lease so we can test expiry

// 1. User A acquires a lock
const res1 = lm.acquireLock({
  filePath: "src/index.js",
  symbolPath: "src/index.js#main",
  startOffset: 0,
  endOffset: 50,
  ownerId: "userA",
  ownerName: "Alice",
  intent: "editing",
});
assert.strictEqual(res1.type, "LOCK_ACQUIRED");
assert.strictEqual(res1.ownerId, "userA");

// 2. User B tries to grab the same symbol -> denied
const res2 = lm.acquireLock({
  filePath: "src/index.js",
  symbolPath: "src/index.js#main",
  startOffset: 0,
  endOffset: 50,
  ownerId: "userB",
  ownerName: "Bob",
  intent: "editing",
});
assert.strictEqual(res2.type, "LOCK_DENIED");
assert.strictEqual(res2.holder.ownerId, "userA");

// 3. User A renews via heartbeat -> succeeds
const hb1 = lm.heartbeat({
  symbolPath: "src/index.js#main",
  ownerId: "userA",
});
assert.strictEqual(hb1.type, "LOCK_RENEWED");

// 4. User B tries to release User A's lock -> blocked
const relFail = lm.releaseLock({
  symbolPath: "src/index.js#main",
  ownerId: "userB",
});
assert.strictEqual(relFail.reason, "NOT_OWNER");

// 5. User A releases their own lock -> succeeds
const relOk = lm.releaseLock({
  filePath: "src/index.js",
  symbolPath: "src/index.js#main",
  ownerId: "userA",
});
assert.strictEqual(relOk.type, "LOCK_RELEASED");

// 6. Now User B can acquire it
const res3 = lm.acquireLock({
  filePath: "src/index.js",
  symbolPath: "src/index.js#main",
  startOffset: 0,
  endOffset: 50,
  ownerId: "userB",
  ownerName: "Bob",
  intent: "editing",
});
assert.strictEqual(res3.type, "LOCK_ACQUIRED");

console.log("All LockManager checks passed!");
