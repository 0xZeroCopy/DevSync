# DevSync

DevSync is a real-time developer coordination and concurrency control engine designed to eliminate code editing collisions and merge conflicts. By coordinating symbol-level locks, developer intent, and lease-based ownership over WebSockets, DevSync enables engineering teams to collaborate safely within shared codebases without stepping on each other's changes.

---

## Table of Contents

- [Overview](#overview)
- [Architecture & Implementation Status](#architecture--implementation-status)
- [Key Features Implemented](#key-features-implemented)
- [WebSocket Protocol & Message Flow](#websocket-protocol--message-flow)
  - [Supported Operations](#supported-operations)
  - [Server Error Responses](#server-error-responses)
- [Lock Lifecycle & State Mechanics](#lock-lifecycle--state-mechanics)
  - [Lease Management & Expiration Sweep](#lease-management--expiration-sweep)
  - [Single Lock Per Developer Constraint](#single-lock-per-developer-constraint)
  - [In-Place Intent Updates](#in-place-intent-updates)
  - [Disconnection Resilience](#disconnection-resilience)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Starting the WebSocket Server](#starting-the-websocket-server)
- [Testing & Quality Assurance](#testing--quality-assurance)
  - [Running Tests](#running-tests)
  - [Test Coverage Summary](#test-coverage-summary)
  - [Continuous Integration (CI)](#continuous-integration-ci)
- [Roadmap & Planned Capabilities](#roadmap--planned-capabilities)

---

## Overview

Traditional version control identifies conflicts after they occur—typically during pull requests or merge phases. DevSync moves conflict prevention upstream into the active editing cycle. By acquiring ephemeral, lease-managed locks on specific code units (symbols, functions, classes, or offset ranges) and broadcasting intent banners to peers, developers gain real-time visibility into who is working on what.

---

## Architecture & Implementation Status

DevSync is organized as a monorepo containing the coordination backend, test suites, and scaffolded workspaces for client integrations and language services:

| Component                                               | Status                    | Description                                                                                                                      |
| :------------------------------------------------------ | :------------------------ | :------------------------------------------------------------------------------------------------------------------------------- |
| **Lock Manager Engine** (`backend/lockManager.js`)      | **Implemented**           | In-memory locking core managing leases, collision checks, heartbeats, renewals, and expiration eviction.                         |
| **WebSocket Coordination Server** (`backend/index.js`)  | **Implemented**           | Real-time WebSocket server managing client connections, instant state snapshots, request routing, and peer broadcasts.           |
| **Integration & Unit Test Suite** (`backend/tests/`)    | **Implemented**           | Automated test suite verifying lock rules, lease expiration sweeps, concurrency denials, socket broadcasts, and state hydration. |
| **Continuous Integration** (`.github/workflows/ci.yml`) | **Implemented**           | GitHub Actions pipeline running dependency installs and integration tests on Node.js 22.                                         |
| **Shared Data Contracts** (`CONTRACTS.md`)              | **Documented (v1)**       | Formal specification of wire messages, schemas, and future handover protocols.                                                   |
| **Frontend Application** (`frontend/`)                  | **Implemented**           | React 19 + Vite web interface with Monaco editor, real-time lock visualization, and handover workflows.                          |
| **Intelligence Engine** (`intelligence/`)               | _Scaffolded (`.gitkeep`)_ | Workspace allocated for AST symbol parsing, static analysis, and code range mapping.                                             |
| **Execution Sandbox** (`sandbox/`)                      | _Scaffolded (`.gitkeep`)_ | Workspace allocated for isolated runtime execution or reproduction harnesses.                                                    |

---

## Key Features Implemented

- **Symbol-Level Granularity**: Locks target specific symbols (`symbolPath`, e.g., `src/index.js#main` or `src/auth.py::AuthService::validate_token`) and byte/character ranges (`startOffset`, `endOffset`) rather than locking entire files.
- **Lease-Based Time-To-Live (TTL)**: Locks are held under time-limited leases (default: 30,000 ms / 30 seconds). An active background timer sweeps and releases stale locks automatically.
- **Heartbeat Renewals**: Active lock owners can continuously extend their lease via lightweight heartbeat pings without re-acquiring the lock.
- **Enforced Single-Lock Invariant**: To prevent hoarding and deadlocks, each developer (`ownerId`) can only hold a single active lock at any given time. Attempting to acquire a second symbol returns a denied response (`ALREADY_HOLDING_LOCK`).
- **Intent Updates & Safe Re-acquisition**: An owner re-acquiring their currently held symbol updates intent and offsets in place, extends the lease TTL, preserves the existing `lockId`, and broadcasts updates to collaborators.
- **Real-Time State Streaming**: Connected clients immediately receive a full state snapshot (`STATE_SNAPSHOT`) upon establishing a WebSocket connection and can poll the current snapshot on demand (`GET_STATE`).
- **Resilient Connection Handling**: Locks are intentionally decoupled from raw socket lifecycles; if a client disconnects unexpectedly, the lock remains protected until its lease period expires or the client reconnects and releases it.
- **Peer Broadcasts**: Lock acquisition (`LOCK_ACQUIRED`), explicit releases (`LOCK_RELEASED` with reason `RELEASED`), and automated lease timeouts (`LOCK_RELEASED` with reason `EXPIRED`) are broadcast immediately to all other connected peers.

---

## WebSocket Protocol & Message Flow

All real-time communication between clients and the DevSync server is conducted over WebSockets using JSON messages. 

> **Canonical Data Contracts**: For full wire schemas, field-level typing, and future protocol definitions (such as developer handover negotiation), see [CONTRACTS.md](CONTRACTS.md).

### Supported Operations

| Action / Event | Direction | Initiator / Trigger | Purpose |
| :--- | :--- | :--- | :--- |
| `ACQUIRE_LOCK` | Client &rarr; Server | Client | Requests an exclusive lease on a code symbol (`symbolPath`) and offset range. Also used to update intent on a currently held lock. |
| `LOCK_ACQUIRED` | Server &rarr; Client(s) | Server | Emitted to requester on success and broadcast to all connected peer clients. |
| `LOCK_DENIED` | Server &rarr; Client | Server | Emitted to requester on collision (`ALREADY_LOCKED`) or if the user already holds another lock (`ALREADY_HOLDING_LOCK`). |
| `HEARTBEAT` | Client &rarr; Server | Client | Periodically dispatched by the active lock owner to extend the lease TTL. |
| `LOCK_RENEWED` | Server &rarr; Client | Server | Acknowledges successful lease extension with the new `expiresAt` timestamp. |
| `LOCK_HEARTBEAT_FAILED` | Server &rarr; Client | Server | Emitted if heartbeat fails due to `NOT_FOUND`, `EXPIRED`, or `NOT_OWNER`. |
| `RELEASE_LOCK` | Client &rarr; Server | Client | Voluntarily releases an active lock held by the requester. |
| `LOCK_RELEASED` | Server &rarr; Client(s) | Server | Broadcast to all clients upon explicit release (`reason: "RELEASED"`) or automatic lease expiration (`reason: "EXPIRED"`). |
| `LOCK_RELEASE_FAILED` | Server &rarr; Client | Server | Emitted to requester if release fails (`NOT_FOUND` or `NOT_OWNER`). |
| `GET_STATE` | Client &rarr; Server | Client | Requests an on-demand state snapshot of all currently active locks. |
| `STATE_SNAPSHOT` | Server &rarr; Client | Server | Automatically streamed to every client upon socket connection and in response to `GET_STATE`. |

### Server Error Responses

The server validates all incoming WebSocket frames defensively and returns structured error payloads for malformed requests:

| Error Response | Cause |
| :--- | :--- |
| `{"type": "ERROR", "reason": "INVALID_JSON"}` | Incoming WebSocket frame cannot be parsed as JSON. |
| `{"type": "ERROR", "reason": "MISSING_MESSAGE_TYPE"}` | Payload is missing the required `type` field or it is not a string. |
| `{"type": "ERROR", "reason": "UNKNOWN_MESSAGE_TYPE"}` | The `type` field does not match any recognized action. |

---

## Lock Lifecycle & State Mechanics

### Lease Management & Expiration Sweep

1. When a lock is granted, an expiration epoch is set: `expiresAt = currentTime + leaseDurationMs` (default: 30 seconds).
2. The server initializes a 1,000 ms periodic sweep interval (`setInterval`) calling `lockManager.removeExpired()`.
3. If `lock.expiresAt <= Date.now()`, the lock is removed from the internal map and an onExpire callback broadcasts `LOCK_RELEASED` with `reason: "EXPIRED"` to all connected clients.
4. Active sweeps also execute lazily on `getState()` and `acquireLock()` calls to ensure immediate consistency.

### Single Lock Per Developer Constraint

DevSync enforces strict single-lock ownership per user ID:

- If a developer currently holds lock `A` and attempts to acquire lock `B`, the server denies the acquisition with `reason: "ALREADY_HOLDING_LOCK"` and indicates the currently held symbol in `activeSymbol`.
- To acquire a new lock, the developer must either explicitly release their active lock or allow it to expire.

### In-Place Intent Updates

If a developer submits an `ACQUIRE_LOCK` request for the symbol they already hold:

- DevSync recognizes the owner and updates `intent`, `startOffset`, and `endOffset` without generating a new `lockId`.
- The lease expiration (`expiresAt`) is reset to `now + leaseDurationMs`.
- The updated state is returned to the requester and broadcast to all peers to reflect changed editing intent.

### Disconnection Resilience

If a client's WebSocket connection disconnects (e.g., due to temporary network switching or IDE reloading), the lock remains reserved in the server state until its lease expires. This avoids race conditions where a momentary network drop would prematurely forfeit a developer's lock.

---

## Repository Structure

```
DevSync/
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI workflow
├── backend/                       # Backend coordination service & test suites
│   ├── tests/                     # Unit & integration test suites
│   │   ├── lock_manages.test.js   # Unit tests for LockManager core mechanics
│   │   └── websockets.test.js     # Integration tests for WebSocket workflows & sweeps
│   ├── index.js                   # WebSocket server entrypoint & message routing
│   ├── lockManager.js             # In-memory lock state machine & lease management
│   ├── package.json               # Backend scripts & dependencies (ws)
│   └── package-lock.json          # Dependency lockfile
├── frontend/                      # Frontend web interface (React + Vite + Tailwind)
│   ├── src/                       # React components, hooks, and mock data
│   │   ├── components/            # UI components (Monaco editor, symbol tree, etc.)
│   │   ├── hooks/                 # WebSocket hook (useDevSyncSocket)
│   │   └── App.jsx                # Main application component
│   ├── index.html                 # HTML shell
│   ├── package.json               # Frontend dependencies & scripts
│   ├── package-lock.json          # Dependency lockfile
│   └── vite.config.js             # Vite configuration
├── intelligence/                  # Scaffolded workspace for AST & symbol analysis
│   └── .gitkeep
├── sandbox/                       # Scaffolded workspace for execution environments
│   └── .gitkeep
├── CONTRACTS.md                   # Formal specification for shared data contracts (v1)
├── package.json                   # Root monorepo scripts
└── README.md                      # Project documentation
```

---

## Getting Started

### Prerequisites

- **Node.js**: v22.0.0 or higher (recommended, aligns with CI runner and native `node:test`).
- **npm**: v10.0.0 or higher.

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/0xZeroCopy/DevSync.git
cd DevSync

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..

# Or install both via root script:
npm run install:all
```

### Starting the Applications

#### 1. WebSocket Backend Server

Start the backend server using npm from the backend folder:

```bash
cd backend
npm start
```

Or from the project root:

```bash
npm run start:backend
```

Or execute directly with Node:

```bash
node backend/index.js
```

By default, the server binds to port `8080`. You can configure the port using the `PORT` environment variable:

```bash
PORT=9000 node backend/index.js
```

#### 2. Frontend Web Interface

Start the frontend Vite development server:

```bash
cd frontend
npm run dev
```

Or from the project root:

```bash
npm run dev:frontend
```

The frontend will run at `http://localhost:3000` and automatically connect to `ws://localhost:8080`.

---

## Testing & Quality Assurance

### Running Tests

The test suite leverages Node.js's built-in test runner (`node:test`) and assertion library (`node:assert/strict`).

Run all test suites from the `backend` directory:

```bash
cd backend
npm test
```

Or run directly from the project root:

```bash
npm test
# or
node --test backend/tests/*.test.js
```

### Test Coverage Summary

The automated test suites cover both isolated unit behavior and full end-to-end WebSocket communication:

1. **LockManager Unit Tests (`backend/tests/lock_manages.test.js`)**:
   - Initial acquisition and owner verification.
   - Rejection of conflicting requests on already locked symbols.
   - Heartbeat lease extension verification.
   - Authorization checks preventing non-owners from releasing locks (`NOT_OWNER`).
   - Clean release and subsequent acquisition by another user.
   - Validation that `symbolPath` and `filePath` are preserved in state snapshots.
   - Error handling for releases targeting non-existent symbols (`NOT_FOUND`).
   - In-place intent updating while maintaining invariant `lockId`.

2. **WebSocket Integration Tests (`backend/tests/websockets.test.js`)**:
   - Automatic `STATE_SNAPSHOT` broadcast on initial socket connection.
   - Manual state snapshot querying via `GET_STATE`.
   - Real-time peer broadcasting of `LOCK_ACQUIRED` and `LOCK_RELEASED`.
   - Concurrency collision handling and enforcement of one lock per developer.
   - Lock persistence across client disconnection.
   - Lease expiration sweeps broadcasting `LOCK_RELEASED` with reason `EXPIRED`.
   - Re-acquisition of symbols following natural lease expiration.
   - Continuous heartbeat streams preventing lease timeout.

### Continuous Integration (CI)

Every commit pushed to `main` and all pull requests trigger the automated GitHub Actions workflow defined in `.github/workflows/ci.yml`. The workflow:

1. Checks out the code on `ubuntu-latest`.
2. Configures Node.js 22 with npm cache enabled.
3. Installs dependencies using `npm ci` inside `backend`.
4. Executes the full integration test suite (`npm test`).

---

## Roadmap & Planned Capabilities

The following capabilities are specified in project design documents and contracts, with implementation planned in subsequent milestones:

- **Lock Handover Workflow**: Implement `HANDOVER_REQUEST`, `HANDOVER_RESPONSE`, and `HANDOVER_DECLINED` flows allowing developers to negotiate and transfer locks directly within the editor.
- **Client Extensions (`frontend/` & IDE plugins)**: VS Code and JetBrains IDE extensions rendering editor gutters, lock markers, and active collaborator intent banners.
- **Language Intelligence Service (`intelligence/`)**: Tree-sitter and LSP-based AST parsing to automatically detect symbol boundaries, function declarations, and offset tracking on live file changes.
- **Multi-Server State Synchronization**: Distributed state persistence or Redis adapter to enable horizontal scaling of WebSocket coordination nodes.
