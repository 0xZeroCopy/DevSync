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

// Default Project-Specific File Trees
export const DEFAULT_PROJECT_FILES_MAP = {
  repo_devsync_core: MOCK_PROJECT_FILES,
  repo_auth_gateway: [
    {
      filePath: "src/gateway.ts",
      language: "typescript",
      symbols: [
        {
          symbolPath: "src/gateway.ts::ApiGateway::handleRequest",
          name: "handleRequest",
          kind: "method",
          startLine: 14,
          endLine: 35,
          startOffset: 150,
          endOffset: 450,
          description: "Inspects incoming HTTP requests, validates auth headers, and dispatches to edge routes",
          callers: [],
          callees: ["src/gateway.ts::ApiGateway::verifyJwtClaim"],
        },
        {
          symbolPath: "src/gateway.ts::ApiGateway::verifyJwtClaim",
          name: "verifyJwtClaim",
          kind: "method",
          startLine: 37,
          endLine: 55,
          startOffset: 460,
          endOffset: 720,
          description: "Validates JWT signature against distributed JWKS cache",
          callers: ["src/gateway.ts::ApiGateway::handleRequest"],
          callees: [],
        },
        {
          symbolPath: "src/gateway.ts::ApiGateway::routeToMicroservice",
          name: "routeToMicroservice",
          kind: "method",
          startLine: 57,
          endLine: 78,
          startOffset: 730,
          endOffset: 990,
          description: "Proxies authenticated payloads to downstream microservice endpoints",
          callers: ["src/gateway.ts::ApiGateway::handleRequest"],
          callees: [],
        },
      ],
      code: `import { Request, Response } from "express";
import { verifyJwt } from "./jwt_verifier";

export interface GatewayConfig {
  upstreamUrl: string;
  timeoutMs: number;
  rateLimitPerMinute: number;
}

export class ApiGateway {
  private config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  public async handleRequest(req: Request, res: Response): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or malformed Authorization header" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const isValid = await this.verifyJwtClaim(token);
    if (!isValid) {
      res.status(403).json({ error: "Forbidden: Invalid or expired claims" });
      return;
    }

    await this.routeToMicroservice(req.path, req.body);
    res.status(200).json({ status: "dispatched", upstream: this.config.upstreamUrl });
  }

  public async verifyJwtClaim(token: string): Promise<boolean> {
    try {
      const decoded = await verifyJwt(token);
      return Boolean(decoded && decoded.sub);
    } catch {
      return false;
    }
  }

  public async routeToMicroservice(path: string, payload: any): Promise<any> {
    console.log(\`[Gateway] Forwarding path=\${path} to upstream cluster node...\`);
    return { ok: true, timestamp: Date.now() };
  }
}
`,
    },
    {
      filePath: "src/jwt_verifier.ts",
      language: "typescript",
      symbols: [
        {
          symbolPath: "src/jwt_verifier.ts::verifyJwt",
          name: "verifyJwt",
          kind: "function",
          startLine: 5,
          endLine: 24,
          startOffset: 60,
          endOffset: 320,
          description: "Cryptographically validates RS256 token against JWKS keystore",
          callers: [],
          callees: [],
        },
      ],
      code: `export interface TokenPayload {
  sub: string;
  email: string;
  roles: string[];
}

export async function verifyJwt(token: string): Promise<TokenPayload | null> {
  if (!token) return null;
  // Parses payload from JWT claims
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const decoded = JSON.parse(atob(parts[1]));
    return {
      sub: decoded.sub || "user_anon",
      email: decoded.email || "user@example.com",
      roles: decoded.roles || ["developer"],
    };
  } catch {
    return null;
  }
}
`,
    },
    {
      filePath: "config/redis.json",
      language: "json",
      symbols: [
        {
          symbolPath: "config/redis.json::redis_cluster",
          name: "redis_cluster",
          kind: "config",
          startLine: 1,
          endLine: 15,
          startOffset: 0,
          endOffset: 200,
          description: "Redis distributed caching cluster connection topology",
          callers: [],
          callees: [],
        },
      ],
      code: `{
  "cluster": {
    "host": "redis-cluster.internal.devsync",
    "port": 6379,
    "maxRetries": 3,
    "connectTimeoutMs": 2500,
    "enableTls": true
  },
  "caching": {
    "tokenTtlSeconds": 3600,
    "rateLimitTtlSeconds": 60
  }
}
`,
    },
    {
      filePath: "README.md",
      language: "markdown",
      symbols: [
        {
          symbolPath: "README.md::overview",
          name: "overview",
          kind: "document",
          startLine: 1,
          endLine: 20,
          startOffset: 0,
          endOffset: 300,
          description: "Gateway architecture specifications and cluster layout",
          callers: [],
          callees: [],
        },
      ],
      code: `# auth-gateway

Distributed OAuth2 & JWT Token validation gateway with distributed Redis caching.

## Architecture
- **Proxy Layer**: Inspects incoming requests at wire speed.
- **Cache Layer**: High throughput Redis key-value store for revoked JWT IDs.
- **Microservices**: Proxies downstream workloads to target regional pods.
`,
    },
  ],
};

// Automatic Symbol Extractor
export function extractSymbolsFromFile(filePath, code = "", language = "javascript") {
  const lines = code.split("\n");
  const symbols = [];
  const lang = (language || "").toLowerCase();

  let funcRegex;
  if (lang.includes("python")) {
    funcRegex = /^\s*(def|class)\s+([a-zA-Z0-9_]+)/;
  } else if (lang.includes("typescript") || lang.includes("javascript")) {
    funcRegex = /(?:function\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|class\s+([a-zA-Z0-9_]+))/;
  } else if (lang.includes("go") || lang.includes("rust")) {
    funcRegex = /(?:func|fn)\s+([a-zA-Z0-9_]+)/;
  } else {
    funcRegex = /(?:function|def|class|fn|func)\s+([a-zA-Z0-9_]+)/;
  }

  lines.forEach((lineText, idx) => {
    const match = lineText.match(funcRegex);
    if (match) {
      const name = match[1] || match[2] || match[3] || match[0].split(/\s+/)[1];
      if (name && name !== "function" && name !== "class" && name !== "def") {
        const startLine = idx + 1;
        const endLine = Math.min(lines.length, startLine + 18);
        symbols.push({
          symbolPath: `${filePath}::${name}`,
          name: name,
          kind: lineText.includes("class") ? "class" : "function",
          startLine: startLine,
          endLine: endLine,
          description: `Symbol ${name} in ${filePath}`,
          callers: [],
          callees: [],
        });
      }
    }
  });

  // Fallback: If no functions/classes matched, provide a file-level symbol so it is lockable
  if (symbols.length === 0) {
    const baseName = filePath.split("/").pop() || "main";
    symbols.push({
      symbolPath: `${filePath}::${baseName}`,
      name: baseName,
      kind: filePath.endsWith(".md") ? "document" : filePath.endsWith(".json") ? "config" : "module",
      startLine: 1,
      endLine: Math.max(1, lines.length),
      description: `Top-level symbol for ${filePath}`,
      callers: [],
      callees: [],
    });
  }

  return symbols;
}

// Generate Initial Starter Files for any Repository
export function getInitialFilesForProject(project) {
  if (!project) return MOCK_PROJECT_FILES;

  if (DEFAULT_PROJECT_FILES_MAP[project.id]) {
    return DEFAULT_PROJECT_FILES_MAP[project.id];
  }

  const lang = (project.language || "JavaScript").toLowerCase();

  if (lang.includes("python")) {
    const mainCode = `"""
${project.name} - ${project.description || 'Python Repository'}
"""

def main():
    """Application entrypoint."""
    print("Initializing ${project.name}...")
    result = process_data({"status": "ready"})
    return result

def process_data(payload: dict) -> dict:
    """Core processing logic."""
    payload["timestamp"] = 1700000000
    payload["processed"] = True
    return payload

if __name__ == "__main__":
    main()
`;
    return [
      {
        filePath: "src/main.py",
        language: "python",
        code: mainCode,
        symbols: extractSymbolsFromFile("src/main.py", mainCode, "python"),
      },
      {
        filePath: "README.md",
        language: "markdown",
        code: `# ${project.name}\n\n${project.description || 'Welcome to this repository.'}\n\n## Getting Started\n\`\`\`bash\npython3 src/main.py\n\`\`\`\n`,
        symbols: extractSymbolsFromFile("README.md", `# ${project.name}`, "markdown"),
      },
    ];
  }

  if (lang.includes("typescript") || lang.includes("node") || lang.includes("react")) {
    const indexCode = `/**
 * ${project.name}
 * ${project.description || 'TypeScript Service'}
 */

export function main() {
  console.log("Starting ${project.name} service...");
  const config = loadConfiguration();
  return { status: "running", config };
}

export function loadConfiguration() {
  return {
    environment: "development",
    workers: 4,
    enableTelemetry: true
  };
}
`;
    return [
      {
        filePath: "src/index.ts",
        language: "typescript",
        code: indexCode,
        symbols: extractSymbolsFromFile("src/index.ts", indexCode, "typescript"),
      },
      {
        filePath: "README.md",
        language: "markdown",
        code: `# ${project.name}\n\n${project.description || 'Welcome to this repository.'}\n`,
        symbols: extractSymbolsFromFile("README.md", `# ${project.name}`, "markdown"),
      },
    ];
  }

  if (lang.includes("rust")) {
    const rustCode = `// ${project.name} - Systems Service

fn main() {
    println!("Running ${project.name} engine...");
    let result = compute_pipeline(42);
    println!("Pipeline output: {}", result);
}

fn compute_pipeline(input: i32) -> i32 {
    input * 2 + 10
}
`;
    return [
      {
        filePath: "src/main.rs",
        language: "rust",
        code: rustCode,
        symbols: extractSymbolsFromFile("src/main.rs", rustCode, "rust"),
      },
      {
        filePath: "README.md",
        language: "markdown",
        code: `# ${project.name}\n\n${project.description || 'Rust systems service.'}\n`,
        symbols: extractSymbolsFromFile("README.md", `# ${project.name}`, "markdown"),
      },
    ];
  }

  // Default: JavaScript
  const defaultJs = `/**
 * ${project.name}
 */

function main() {
  console.log("Initializing ${project.name}...");
  const status = startService();
  return status;
}

function startService() {
  return {
    service: "${project.name}",
    online: true,
    uptime: 0
  };
}

module.exports = { main, startService };
`;
  return [
    {
      filePath: "src/index.js",
      language: "javascript",
      code: defaultJs,
      symbols: extractSymbolsFromFile("src/index.js", defaultJs, "javascript"),
    },
    {
      filePath: "README.md",
      language: "markdown",
      code: `# ${project.name}\n\n${project.description || 'Welcome to this project.'}\n`,
      symbols: extractSymbolsFromFile("README.md", `# ${project.name}`, "markdown"),
    },
  ];
}

export const MOCK_DEVELOPERS = [
  {
    id: "673f9a1c8e2b4d0012a34b59",
    name: "Malika",
    username: "malika_dev",
    email: "malika237581@gmail.com",
    role: "Full Stack Developer",
    avatarColor: "#8B5CF6", // Purple
  },
  {
    id: "673f9a1c8e2b4d0012a34b56",
    name: "Trisha",
    username: "trisha_core",
    email: "trisha@devsync.io",
    role: "Lead Backend",
    avatarColor: "#6366F1", // Indigo
  },
  {
    id: "673f9a1c8e2b4d0012a34b57",
    name: "Tanmay",
    username: "tanmay_r",
    email: "tanmay@devsync.io",
    role: "Platform Engineer",
    avatarColor: "#22C55E", // Green
  },
  {
    id: "673f9a1c8e2b4d0012a34b58",
    name: "Suyas",
    username: "suyas_sys",
    email: "suyas@devsync.io",
    role: "Systems Developer",
    avatarColor: "#F59E0B", // Amber
  },
];

export const INITIAL_PROJECTS = [
  {
    id: "repo_devsync_core",
    name: "DevSync-Core",
    slug: "devsync-core",
    description: "Real-time developer coordination and concurrency control engine",
    language: "Python / Node.js",
    visibility: "private",
    defaultBranch: "main",
    ownerId: "673f9a1c8e2b4d0012a34b59",
    ownerName: "Malika",
    ownerUsername: "malika_dev",
    collaborators: [
      { id: "673f9a1c8e2b4d0012a34b59", name: "Malika", username: "malika_dev", role: "Owner", avatarColor: "#8B5CF6" },
      { id: "673f9a1c8e2b4d0012a34b57", name: "Tanmay", username: "tanmay_r", role: "Collaborator", avatarColor: "#22C55E" },
      { id: "673f9a1c8e2b4d0012a34b56", name: "Trisha", username: "trisha_core", role: "Reviewer", avatarColor: "#6366F1" }
    ],
    updatedAt: "Just now",
    stars: 12,
  },
  {
    id: "repo_auth_gateway",
    name: "auth-gateway",
    slug: "auth-gateway",
    description: "OAuth2 & JWT Token validation gateway with distributed Redis caching",
    language: "TypeScript",
    visibility: "public",
    defaultBranch: "main",
    ownerId: "673f9a1c8e2b4d0012a34b56",
    ownerName: "Trisha",
    ownerUsername: "trisha_core",
    collaborators: [
      { id: "673f9a1c8e2b4d0012a34b56", name: "Trisha", username: "trisha_core", role: "Owner", avatarColor: "#6366F1" },
      { id: "673f9a1c8e2b4d0012a34b59", name: "Malika", username: "malika_dev", role: "Collaborator", avatarColor: "#8B5CF6" }
    ],
    updatedAt: "2 hours ago",
    stars: 8,
  }
];

export const INITIAL_INVITATIONS = [
  {
    id: "inv_1",
    projectId: "repo_sys_monitor",
    projectName: "cluster-telemetry",
    projectDescription: "Real-time WebSocket connection telemetry and health probes",
    fromUserId: "673f9a1c8e2b4d0012a34b58",
    fromUserName: "Suyas",
    fromUsername: "suyas_sys",
    toUsername: "malika_dev",
    toEmail: "malika237581@gmail.com",
    role: "Collaborator",
    status: "pending",
    createdAt: "10 mins ago"
  }
];
