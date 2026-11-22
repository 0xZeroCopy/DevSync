const assert = require("assert");
const LockManager = require("../lockManager.js");

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

// 7. Snapshot includes symbolPath and filePath
const snap = lm.getState();
assert.strictEqual(snap.locks[0].symbolPath, "src/index.js#main");
assert.strictEqual(snap.locks[0].filePath, "src/index.js");

// 8. Releasing a lock that doesn't exist -> LOCK_RELEASE_FAILED / NOT_FOUND
const relMissing = lm.releaseLock({ symbolPath: "nope", ownerId: "userB" });
assert.strictEqual(relMissing.type, "LOCK_RELEASE_FAILED");
assert.strictEqual(relMissing.reason, "NOT_FOUND");

// 9. Re-acquiring own lock updates intent, keeps the same lockId
const reacq = lm.acquireLock({
  filePath: "src/index.js",
  symbolPath: "src/index.js#main",
  ownerId: "userB",
  ownerName: "Bob",
  intent: "new intent",
});
assert.strictEqual(reacq.type, "LOCK_ACQUIRED");
assert.strictEqual(reacq.intent, "new intent");
assert.strictEqual(reacq.lockId, res3.lockId);

// 10. Handover request & approval workflow
// User A requests handover of "src/index.js#main" currently held by User B
const hoReq = lm.requestHandover({
  requestId: "ho_test_1",
  filePath: "src/index.js",
  symbolPath: "src/index.js#main",
  fromUserId: "userA",
  fromUserName: "Alice",
  toUserId: "userB",
  note: "Need to fix critical bug",
});
assert.strictEqual(hoReq.type, "HANDOVER_REQUEST");
assert.strictEqual(hoReq.fromUserId, "userA");
assert.strictEqual(hoReq.toUserId, "userB");

// User B approves handover -> lock transferred to User A
const hoApproved = lm.respondHandover({
  requestId: "ho_test_1",
  symbolPath: "src/index.js#main",
  accepted: true,
  nextIntent: "Fixing critical bug",
});
assert.strictEqual(hoApproved.type, "HANDOVER_ACCEPTED");
assert.strictEqual(hoApproved.lock.ownerId, "userA");
assert.strictEqual(hoApproved.lock.intent, "Fixing critical bug");

// Verify that User A is now the sole holder
const snapAfterHo = lm.getState();
assert.strictEqual(snapAfterHo.locks[0].ownerId, "userA");

// 11. Handover rejection workflow
// User B requests handover from User A
const hoReq2 = lm.requestHandover({
  requestId: "ho_test_2",
  filePath: "src/index.js",
  symbolPath: "src/index.js#main",
  fromUserId: "userB",
  fromUserName: "Bob",
  toUserId: "userA",
  note: "Let me edit",
});
assert.strictEqual(hoReq2.type, "HANDOVER_REQUEST");

// User A rejects handover
const hoDeclined = lm.respondHandover({
  requestId: "ho_test_2",
  symbolPath: "src/index.js#main",
  accepted: false,
});
assert.strictEqual(hoDeclined.type, "HANDOVER_DECLINED");
assert.strictEqual(hoDeclined.reason, "DECLINED_BY_OWNER");

// Verify that lock remains with User A
const snapAfterDeclined = lm.getState();
assert.strictEqual(snapAfterDeclined.locks[0].ownerId, "userA");

console.log("All LockManager checks passed!");
