// Mock codebase files with symbols, line numbers, and offsets matching CONTRACTS.md
export const MOCK_PROJECT_FILES = [
  {
    filePath: "src/auth.py",
    language: "python",
    runCommand: "python3 src/auth.py",
    symbols: [
      {
        symbolPath: "src/auth.py::AuthService::validate_token",
        name: "validate_token",
        kind: "method",
        startLine: 12,
        endLine: 28,
        startOffset: 120,
        endOffset: 340,
        description: "Validates incoming JWT claims and signature against JWKS",
        callers: ["src/auth.py::AuthService::refresh_session"],
        callees: [],
      },
      {
        symbolPath: "src/auth.py::AuthService::refresh_session",
        name: "refresh_session",
        kind: "method",
        startLine: 30,
        endLine: 45,
        startOffset: 350,
        endOffset: 520,
        description: "Rotates refresh token and extends active redis session TTL",
        callers: [],
        callees: ["src/auth.py::AuthService::validate_token"],
      },
      {
        symbolPath: "src/auth.py::Crypto::hash_secret",
        name: "hash_secret",
        kind: "function",
        startLine: 47,
        endLine: 58,
        startOffset: 530,
        endOffset: 690,
        description: "Argon2id password hashing with custom salt generation",
        callers: [],
        callees: [],
      },
    ],
    code: `import jwt
import time
from redis import Redis

class AuthService:
    def __init__(self, secret: str, redis_client: Redis):
        self.secret = secret
        self.redis = redis_client
        self.leeway_seconds = 60

    def validate_token(self, token: str) -> dict:
        """Decodes JWT and verifies issuer + revocation list."""
        try:
            payload = jwt.decode(
                token, 
                self.secret, 
                algorithms=["HS256"], 
                leeway=self.leeway_seconds
            )
            token_id = payload.get("jti")
            if self.redis.get(f"revoked:{token_id}"):
                raise PermissionError("Token has been revoked")
            return payload
        except jwt.ExpiredSignatureError:
            raise ValueError("Authentication token expired")
        except jwt.InvalidTokenError:
            raise ValueError("Malformed token signature")

    def refresh_session(self, user_id: str, refresh_token: str) -> str:
        """Validates refresh grant and writes updated TTL to redis."""
        stored = self.redis.get(f"session:{user_id}")
        if not stored or stored != refresh_token:
            raise PermissionError("Invalid refresh session")
        
        # Calls validate_token logic for token expiry confirmation
        new_token = jwt.encode(
            {"sub": user_id, "iat": time.time(), "exp": time.time() + 900},
            self.secret,
            algorithm="HS256"
        )
        self.redis.setex(f"session:{user_id}", 86400, refresh_token)
        return new_token

class Crypto:
    @staticmethod
    def hash_secret(raw_secret: str, salt: bytes) -> str:
        """Securely computes hash with Argon2id parameters."""
        import hashlib
        return hashlib.sha256(raw_secret.encode() + salt).hexdigest()
`,
  },
  {
    filePath: "src/index.js",
    language: "javascript",
    runCommand: "node src/index.js",
    symbols: [
      {
        symbolPath: "src/index.js#main",
        name: "main",
        kind: "function",
        startLine: 10,
        endLine: 26,
        startOffset: 0,
        endOffset: 50,
        description: "DevSync server initialization and listener binding",
        callers: [],
        callees: ["src/index.js#broadcast"],
      },
      {
        symbolPath: "src/index.js#broadcast",
        name: "broadcast",
        kind: "function",
        startLine: 28,
        endLine: 40,
        startOffset: 55,
        endOffset: 110,
        description: "WebSocket fan-out helper delivering JSON frames to peers",
        callers: ["src/index.js#main"],
        callees: [],
      },
    ],
    code: `const { WebSocketServer } = require("ws");
const LockManager = require("./lockManager");

function sendJson(socket, payload) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

async function main() {
  const PORT = Number(process.env.PORT) || 8080;
  const LEASE_MS = 30000;
  
  console.log("DevSync coordination engine initializing...");
  const wss = new WebSocketServer({ port: PORT });
  const lockManager = new LockManager(LEASE_MS, (msg) => broadcast(wss, msg));

  setInterval(() => {
    lockManager.removeExpired();
  }, 1000);

  return { wss, lockManager };
}

function broadcast(wss, payload, excludeSocket = null) {
  for (const client of wss.clients) {
    if (client === excludeSocket) continue;
    sendJson(client, payload);
  }
}

module.exports = { main, broadcast };
`,
  },
];

export const MOCK_DEVELOPERS = [
  {
    id: "673f9a1c8e2b4d0012a34b59",
    name: "Malika",
    role: "Developer",
    avatarColor: "#8B5CF6", // Purple
  },
  {
    id: "673f9a1c8e2b4d0012a34b56",
    name: "Trisha",
    role: "Lead Backend",
    avatarColor: "#6366F1", // Indigo
  },
  {
    id: "673f9a1c8e2b4d0012a34b57",
    name: "Tanmay",
    role: "Platform Engineer",
    avatarColor: "#22C55E", // Green
  },
  {
    id: "673f9a1c8e2b4d0012a34b58",
    name: "Suyas",
    role: "Systems Developer",
    avatarColor: "#F59E0B", // Amber
  },
];
