# DevSync Shared Data Contracts (v1)

Conventions:

- All messages sent over WebSockets or REST bodies are JSON objects.
- `userId` / `ownerId` should be an immutable identifier (e.g., MongoDB ObjectId or UUID), while `ownerName` is the display name shown in UI badges/banners.
- `symbolPath` uniquely identifies a code unit within a project/file (e.g., `src/auth.py::AuthService::validate_token`).

---

## 1. Lock Acquired / Active State (`LOCK_ACQUIRED`)

Broadcast by the server when a lock is granted so clients can render gutter markers and intent banners.

```json
{
  "type": "LOCK_ACQUIRED",
  "lockId": "lock_9f8a7b6c",
  "filePath": "src/auth.py",
  "symbolPath": "src/auth.py::AuthService::validate_token",
  "startOffset": 120,
  "endOffset": 340,
  "ownerId": "673f9a1c8e2b4d0012a34b56",
  "ownerName": "Trisha",
  "intent": "Adding token expiry check",
  "expiresAt": 1795123486000
}
```

---

## 2. Lock Collision / Rejection (`LOCK_DENIED`)

Sent by the server to a requester when `symbolPath` is already locked by an active (non-expired) lease.

```json
{
  "type": "LOCK_DENIED",
  "filePath": "src/auth.py",
  "symbolPath": "src/auth.py::AuthService::validate_token",
  "reason": "ALREADY_LOCKED",
  "holder": {
    "ownerId": "673f9a1c8e2b4d0012a34b56",
    "ownerName": "Trisha",
    "intent": "Adding token expiry check",
    "expiresAt": 1795123486000
  }
}
```

---

## 3. Handover Request & Response (`HANDOVER_REQUEST` / `HANDOVER_RESPONSE`)

Used when a second developer clicks "Request Handover" on a locked symbol.

### Client -> Server -> Current Holder (`HANDOVER_REQUEST`)

```json
{
  "type": "HANDOVER_REQUEST",
  "requestId": "ho_102938",
  "filePath": "src/auth.py",
  "symbolPath": "src/auth.py::AuthService::validate_token",
  "fromUserId": "673f9a1c8e2b4d0012a34b57",
  "fromUserName": "Tanmay",
  "toUserId": "673f9a1c8e2b4d0012a34b56",
  "note": "Need to wire login error handling right after your change"
}
```

### Current Holder -> Server (`HANDOVER_RESPONSE`)

```json
{
  "type": "HANDOVER_RESPONSE",
  "requestId": "ho_102938",
  "symbolPath": "src/auth.py::AuthService::validate_token",
  "accepted": true,
  "nextIntent": "Wiring login error handling"
}
```

- If `accepted: true`: Server transfers ownership to `fromUserId`, updates `intent` (falling back to the previous or requested intent), resets `expiresAt`, and broadcasts `LOCK_ACQUIRED` to all clients.
- If `accepted: false`: Server notifies `fromUserId` (`HANDOVER_DECLINED`) without modifying the active lock.

---

## 4. Heartbeat & Release (`LOCK_HEARTBEAT`, `LOCK_RENEWED`, `LOCK_RELEASE`, `LOCK_RELEASED`)

### Client -> Server (`LOCK_HEARTBEAT`)

Sent periodically by the lock holder while actively holding the lock.

```json
{
  "type": "LOCK_HEARTBEAT",
  "symbolPath": "src/auth.py::AuthService::validate_token",
  "ownerId": "673f9a1c8e2b4d0012a34b56"
}
```

### Server -> Client (`LOCK_RENEWED` / `LOCK_HEARTBEAT_FAILED`)

```json
{
  "type": "LOCK_RENEWED",
  "symbolPath": "src/auth.py::AuthService::validate_token",
  "ownerId": "673f9a1c8e2b4d0012a34b56",
  "expiresAt": 1795123516000
}
```

If invalid or expired:

```json
{
  "type": "LOCK_HEARTBEAT_FAILED",
  "symbolPath": "src/auth.py::AuthService::validate_token",
  "ownerId": "673f9a1c8e2b4d0012a34b56",
  "reason": "EXPIRED"
}
```

### Client -> Server (`LOCK_RELEASE`)

```json
{
  "type": "LOCK_RELEASE",
  "symbolPath": "src/auth.py::AuthService::validate_token",
  "ownerId": "673f9a1c8e2b4d0012a34b56"
}
```

### Server -> All Clients (`LOCK_RELEASED`)

Broadcast on explicit release or lease expiry (`reason`: `"RELEASED"` | `"EXPIRED"`).

```json
{
  "type": "LOCK_RELEASED",
  "filePath": "src/auth.py",
  "symbolPath": "src/auth.py::AuthService::validate_token",
  "ownerId": "673f9a1c8e2b4d0012a34b56",
  "reason": "RELEASED"
}
```
