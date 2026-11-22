class LockManager {
  constructor(leaseDurationMs = 30000, onExpire = () => {}) {
    this.locks = new Map();
    this.pendingHandovers = new Map();
    this.leaseDurationMs = leaseDurationMs;
    this.nextLockId = 1;
    this.onExpire = onExpire;
  }

  removeExpired() {
    const now = Date.now();
    for (const [symbolPath, lock] of this.locks) {
      if (lock.expiresAt <= now) {
        this.locks.delete(symbolPath);
        this.onExpire({
          type: "LOCK_RELEASED",
          symbolPath,
          ownerId: lock.ownerId,
          reason: "EXPIRED",
          filePath: lock.filePath,
        });
      }
    }
  }

  getState() {
    this.removeExpired();
    return { type: "STATE_SNAPSHOT", locks: [...this.locks.values()] };
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
      symbolPath: request.symbolPath,
      filePath: request.filePath,
    };
    this.locks.set(request.symbolPath, lock);
    return lock;
  }

  acquireLock(request) {
    this.removeExpired();
    const currentTime = Date.now();
    const lockDetails = this.locks.get(request.symbolPath);
    for (const [existingSymbol, lock] of this.locks.entries()) {
      if (lock.ownerId === request.ownerId) {
        if (existingSymbol !== request.symbolPath) {
          return {
            type: "LOCK_DENIED",
            symbolPath: request.symbolPath,
            reason: "ALREADY_HOLDING_LOCK",
            activeSymbol: existingSymbol,
            holder: lock,
          };
        } else {
          lock.intent = request.intent ?? lock.intent;
          lock.startOffset = request.startOffset ?? lock.startOffset;
          lock.endOffset = request.endOffset ?? lock.endOffset;
          lock.lastRenewedAt = currentTime;
          lock.expiresAt = currentTime + this.leaseDurationMs;
          return {
            type: "LOCK_ACQUIRED",
            lockId: lock.lockId,
            filePath: lock.filePath,
            symbolPath: existingSymbol,
            startOffset: lock.startOffset,
            endOffset: lock.endOffset,
            ownerId: lock.ownerId,
            ownerName: lock.ownerName,
            intent: lock.intent,
            expiresAt: lock.expiresAt,
          };
        }
      }
    }
    if (!lockDetails) {
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
        type: "LOCK_RELEASE_FAILED",
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

  requestHandover(request) {
    this.removeExpired();
    const lockDetails = this.locks.get(request.symbolPath);

    if (!lockDetails) {
      return {
        type: "HANDOVER_FAILED",
        requestId: request.requestId,
        symbolPath: request.symbolPath,
        reason: "NOT_LOCKED",
      };
    }

    if (request.toUserId && lockDetails.ownerId !== request.toUserId) {
      return {
        type: "HANDOVER_FAILED",
        requestId: request.requestId,
        symbolPath: request.symbolPath,
        reason: "HOLDER_MISMATCH",
      };
    }

    if (lockDetails.ownerId === request.fromUserId) {
      return {
        type: "HANDOVER_FAILED",
        requestId: request.requestId,
        symbolPath: request.symbolPath,
        reason: "ALREADY_OWNER",
      };
    }

    const pending = {
      requestId: request.requestId || `ho_${Date.now()}`,
      symbolPath: request.symbolPath,
      filePath: request.filePath || lockDetails.filePath,
      fromUserId: request.fromUserId,
      fromUserName: request.fromUserName,
      toUserId: lockDetails.ownerId,
      toUserName: lockDetails.ownerName,
      note: request.note || "",
      requestedAt: Date.now(),
    };

    this.pendingHandovers.set(pending.requestId, pending);

    return {
      type: "HANDOVER_REQUEST",
      ...pending,
    };
  }

  respondHandover(response) {
    this.removeExpired();
    const pending = this.pendingHandovers.get(response.requestId);
    const lockDetails = this.locks.get(response.symbolPath);

    if (!lockDetails) {
      if (pending) this.pendingHandovers.delete(response.requestId);
      return {
        type: "HANDOVER_FAILED",
        requestId: response.requestId,
        symbolPath: response.symbolPath,
        reason: "LOCK_EXPIRED",
      };
    }

    if (!pending) {
      return {
        type: "HANDOVER_FAILED",
        requestId: response.requestId,
        symbolPath: response.symbolPath,
        reason: "NOT_FOUND",
      };
    }

    this.pendingHandovers.delete(response.requestId);

    if (response.accepted) {
      // If the recipient already holds another lock, release it first (1-lock per user rule)
      for (const [existingSymbol, lk] of this.locks.entries()) {
        if (lk.ownerId === pending.fromUserId && existingSymbol !== response.symbolPath) {
          this.locks.delete(existingSymbol);
          this.onExpire({
            type: "LOCK_RELEASED",
            symbolPath: existingSymbol,
            ownerId: pending.fromUserId,
            reason: "RELEASED",
            filePath: lk.filePath,
          });
        }
      }

      // Transfer lock ownership to user2
      const currentTime = Date.now();
      lockDetails.ownerId = pending.fromUserId;
      lockDetails.ownerName = pending.fromUserName;
      lockDetails.intent = response.nextIntent || pending.note || lockDetails.intent;
      lockDetails.lastRenewedAt = currentTime;
      lockDetails.expiresAt = currentTime + this.leaseDurationMs;

      return {
        type: "HANDOVER_ACCEPTED",
        requestId: response.requestId,
        symbolPath: response.symbolPath,
        fromUserId: pending.fromUserId,
        fromUserName: pending.fromUserName,
        toUserId: pending.toUserId,
        lock: {
          type: "LOCK_ACQUIRED",
          lockId: lockDetails.lockId,
          filePath: lockDetails.filePath,
          symbolPath: lockDetails.symbolPath,
          startOffset: lockDetails.startOffset,
          endOffset: lockDetails.endOffset,
          ownerId: lockDetails.ownerId,
          ownerName: lockDetails.ownerName,
          intent: lockDetails.intent,
          expiresAt: lockDetails.expiresAt,
        },
      };
    } else {
      return {
        type: "HANDOVER_DECLINED",
        requestId: response.requestId,
        symbolPath: response.symbolPath,
        fromUserId: pending.fromUserId,
        toUserId: pending.toUserId,
        reason: "DECLINED_BY_OWNER",
      };
    }
  }
}

module.exports = LockManager;
