
import React, { useState } from "react";

import {
  Files,
  Search,
  GitBranch,
  Users,
  Settings,
  ChevronDown,
  Folder,
  Code2,
  Play,
  CheckCircle2,
  Activity,
  Circle,
  Radio
} from "lucide-react";

const projectFiles = {
  "App.jsx": [
    "import React from 'react';",
    "import Dashboard from './Dashboard';",
    "",
    "function App() {",
    "  return (",
    "    <div className='app-container'>",
    "      <Dashboard />",
    "    </div>",
    "  );",
    "}",
    "",
    "export default App;"
  ],

  "server.js": [
    "const WebSocket = require('ws');",
    "",
    "const server = new WebSocket.Server({",
    "  port: 8080",
    "});",
    "",
    "server.on('connection', (socket) => {",
    "  console.log('Developer connected');",
    "",
    "  socket.on('message', (data) => {",
    "    // Process team updates",
    "    broadcast(data);",
    "  });",
    "});"
  ],

  "sync.js": [
    "class CollaborationManager {",
    "  constructor() {",
    "    this.clients = new Map();",
    "    this.locks = new Map();",
    "  }",
    "",
    "  async synchronize(change) {",
    "    this.broadcast(change);",
    "    return { status: 'synced' };",
    "  }",
    "",
    "  broadcast(change) {",
    "    // Coordinate team updates",
    "  }",
    "}",
    "",
    "export default CollaborationManager;"
  ],

  "config.js": [
    "const config = {",
    "  realtime: true,",
    "  collaboration: true,",
    "  concurrencyControl: true,",
    "  port: 8080",
    "};",
    "",
    "export default config;"
  ]
};

const team = [
  {
    initial: "A",
    name: "Alex Morgan",
    activity: "Editing App.jsx",
    color: "blue"
  },
  {
    initial: "S",
    name: "Sarah Chen",
    activity: "Editing sync.js",
    color: "green"
  },
  {
    initial: "R",
    name: "Ryan Lee",
    activity: "Viewing project",
    color: "orange"
  }
];

export default function WorkspacePreview() {

  const [activeFile, setActiveFile] = useState("App.jsx");
  const [activeTab, setActiveTab] = useState("TERMINAL");
  const [hasRun, setHasRun] = useState(false);

  const handleRun = () => {
    setHasRun(true);
    setActiveTab("OUTPUT");
  };

  const handleFileChange = (file) => {
    setActiveFile(file);
    setHasRun(false);
  };

  return (
    <div className="workspace-window">

      {/* TOP BAR */}

      <div className="workspace-topbar">

        <div className="window-dots">
          <span />
          <span />
          <span />
        </div>

        <div className="workspace-title">
          <Code2 size={14} />
          devsync / team-workspace
        </div>

        <div className="workspace-live">
          <span className="live-pulse" />
          CONNECTED
        </div>

      </div>

      <div className="workspace-layout">

        {/* LEFT SIDEBAR */}

        <aside className="workspace-sidebar">

          <div className="sidebar-tools">
            <Files />
            <Search />
            <GitBranch />
            <Users />
            <Settings />
          </div>

          <div className="file-explorer">

            <div className="explorer-heading">
              EXPLORER
            </div>

            <div className="folder-heading">
              <ChevronDown size={13} />
              <Folder size={14} />
              DEVSYNC
            </div>

            <div className="folder-heading nested-folder">
              <ChevronDown size={13} />
              src
            </div>

            {Object.keys(projectFiles).map((file) => (

              <button
                key={file}
                className={`explorer-file ${
                  activeFile === file ? "file-selected" : ""
                }`}
                onClick={() => handleFileChange(file)}
              >
                <span>JS</span>
                {file}
              </button>

            ))}

          </div>

        </aside>

        {/* MAIN EDITOR */}

        <main className="workspace-editor">

          <div className="editor-header">

            <div className="editor-tab">
              <Code2 size={13} />
              {activeFile}
              <span>×</span>
            </div>

            <div className="editor-header-right">

              <div className="mini-avatars">
                <span>A</span>
                <span>S</span>
                <span>R</span>
              </div>

              <button
                className="run-button"
                onClick={handleRun}
              >
                <Play size={12} fill="currentColor" />
                Run
              </button>

            </div>

          </div>

          <div className="code-area">

            <div className="code-content">

              {projectFiles[activeFile].map((line, index) => (

                <div className="code-row" key={index}>

                  <span className="line-number">
                    {index + 1}
                  </span>

                  <span className="code-line">
                    {line || " "}
                  </span>

                </div>

              ))}

            </div>

            <div className="remote-cursor">
              <span />
              <label>Alex</label>
            </div>

            <div className="remote-cursor second-cursor">
              <span />
              <label>Sarah</label>
            </div>

          </div>

          {/* TERMINAL */}

          <div className="editor-terminal">

            <div className="terminal-header">

              {["TERMINAL", "OUTPUT", "PROBLEMS"].map((tab) => (

                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={
                    activeTab === tab ? "terminal-active" : ""
                  }
                >
                  {tab}
                </button>

              ))}

            </div>

            <div className="terminal-body">

              {activeTab === "TERMINAL" && (
                <>
                  <p>
                    <span className="terminal-prompt">➜</span>
                    devsync $ npm run dev
                  </p>

                  <p className="terminal-muted">
                    Initializing development environment...
                  </p>

                  <p className="terminal-green">
                    ✓ Workspace connected successfully
                  </p>
                </>
              )}

              {activeTab === "OUTPUT" && (
                <>
                  <p className="terminal-prompt">
                    $ Executing {activeFile}
                  </p>

                  <p className="terminal-green">
                    {hasRun
                      ? "✓ Demo execution completed successfully."
                      : "Ready to run."}
                  </p>
                </>
              )}

              {activeTab === "PROBLEMS" && (
                <p className="terminal-green">
                  ✓ No reported problems in this demo.
                </p>
              )}

            </div>

          </div>

        </main>

        {/* RIGHT TEAM PANEL */}

        <aside className="team-sidebar">

          <div className="team-title">
            <Users size={14} />
            TEAM MEMBERS
          </div>

          <div className="team-online">
            <span />
            3 developers online
          </div>

          {team.map((person) => (

            <div className="team-member" key={person.initial}>

              <div className={`member-avatar ${person.color}`}>
                {person.initial}
              </div>

              <div className="member-details">
                <strong>{person.name}</strong>
                <small>{person.activity}</small>
              </div>

              <span className="member-online" />

            </div>

          ))}

          <div className="team-divider" />

          <div className="team-title">
            <Activity size={14} />
            LIVE ACTIVITY
          </div>

          <div className="team-activity">
            <span className="activity-marker" />
            <div>
              <p>Alex modified <b>App.jsx</b></p>
              <small>Just now</small>
            </div>
          </div>

          <div className="team-activity">
            <span className="activity-marker green-marker" />
            <div>
              <p>Sarah joined workspace</p>
              <small>2 minutes ago</small>
            </div>
          </div>

          <div className="team-activity">
            <span className="activity-marker orange-marker" />
            <div>
              <p>Ryan opened the project</p>
              <small>5 minutes ago</small>
            </div>
          </div>

        </aside>

      </div>

      {/* BOTTOM STATUS */}

      <div className="workspace-statusbar">

        <span>
          <GitBranch size={11} />
          main
        </span>

        <span>JavaScript</span>

        <span>UTF-8</span>

        <span className="status-synced">
          <CheckCircle2 size={12} />
          All changes synced
        </span>

      </div>

    </div>
  );
}
