class LockManager {
  constructor(leaseDurationMs = 30000) {
    this.locks = new Map();
    this.leaseDurationMs = leaseDurationMs;
    this.nextLockId = 1;
  }

  getState() {
    const now = Date.now();
    const activeLocks = [];
    for (const [symbolPath, lock] of this.locks.entries()) {
      if (lock.expiresAt <= now) {
        this.locks.delete(symbolPath);
        continue;
      }
      activeLocks.push(lock);
    }
    return {
      type: "STATE_SNAPSHOT",
      locks: activeLocks,
    };
  }

  assignLock(request, now) {
    const lockId = `lock_${this.nextLockId++}`;
    let lock = {
      lockId,
      ownerId: request.ownerId,
      ownerName: request.ownerName,
      intent: request.intent,
      lastRenewedAt: now,
      expiresAt: now + this.leaseDurationMs,
      startOffset: request.startOffset,
      endOffset: request.endOffset,
    };
    this.locks.set(request.symbolPath, lock);
    return lock;
  }

  acquireLock(request) {
    const currentTime = Date.now();
    const lockDetails = this.locks.get(request.symbolPath);
    for (const [existingSymbol, lock] of this.locks.entries()) {
      if (
        lock.ownerId === request.ownerId &&
        existingSymbol !== request.symbolPath
      ) {
        return {
          type: "LOCK_DENIED",
          symbolPath: request.symbolPath,
          reason: "ALREADY_HOLDING_LOCK",
          activeSymbol: existingSymbol,
          holder: lock,
        };
      }
    }
    if (!lockDetails || lockDetails.expiresAt < currentTime) {
      const newLock = this.assignLock(request, currentTime);
      return {
        type: "LOCK_ACQUIRED",
        lockId: newLock.lockId,
        filePath: request.filePath,
        symbolPath: request.symbolPath,
        startOffset: newLock.startOffset,
        endOffset: newLock.endOffset,
        ownerId: request.ownerId,
        ownerName: request.ownerName,
        intent: request.intent,
        expiresAt: newLock.expiresAt,
      };
    } else {
      return {
        type: "LOCK_DENIED",
        filePath: request.filePath,
        symbolPath: request.symbolPath,
        reason: "ALREADY_LOCKED",
        holder: {
          ownerId: lockDetails.ownerId,
          ownerName: lockDetails.ownerName,
          intent: lockDetails.intent,
          expiresAt: lockDetails.expiresAt,
        },
      };
    }
  }

  heartbeat(request) {
    const currentTime = Date.now();
    const lockDetails = this.locks.get(request.symbolPath);

    if (!lockDetails) {
      return {
        type: "LOCK_HEARTBEAT_FAILED",
        symbolPath: request.symbolPath,
        ownerId: request.ownerId,
        reason: "NOT_FOUND",
      };
    }

    if (lockDetails.expiresAt < currentTime) {
      return {
        type: "LOCK_HEARTBEAT_FAILED",
        symbolPath: request.symbolPath,
        ownerId: request.ownerId,
        reason: "EXPIRED",
      };
    }

    if (lockDetails.ownerId !== request.ownerId) {
      return {
        type: "LOCK_HEARTBEAT_FAILED",
        symbolPath: request.symbolPath,
        ownerId: request.ownerId,
        reason: "NOT_OWNER",
      };
    }

    lockDetails.expiresAt = currentTime + this.leaseDurationMs;
    lockDetails.lastRenewedAt = currentTime;

    return {
      type: "LOCK_RENEWED",
      symbolPath: request.symbolPath,
      ownerId: request.ownerId,
      expiresAt: lockDetails.expiresAt,
    };
  }

  releaseLock(request) {
    const lockDetails = this.locks.get(request.symbolPath);

    if (!lockDetails) {
      return {
        type: "LOCK_HEARTBEAT_FAILED",
        symbolPath: request.symbolPath,
        ownerId: request.ownerId,
        reason: "NOT_FOUND",
      };
    }

    if (lockDetails.ownerId !== request.ownerId) {
      return {
        type: "LOCK_RELEASE_FAILED",
        symbolPath: request.symbolPath,
        ownerId: request.ownerId,
        reason: "NOT_OWNER",
      };
    } else {
      this.locks.delete(request.symbolPath);
      return {
        type: "LOCK_RELEASED",
        symbolPath: request.symbolPath,
        ownerId: request.ownerId,
        reason: "RELEASED",
      };
    }
  }
}

module.exports = LockManager;
