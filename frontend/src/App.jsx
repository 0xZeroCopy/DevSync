import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { SymbolTree } from "./components/SymbolTree";
import { CodeCanvas } from "./components/CodeCanvas";
import { HandoverModal, IncomingHandoverBanner } from "./components/HandoverModal";
import { BottomDrawer } from "./components/EventAuditDrawer";
import { CallGraphAlert } from "./components/CallGraphAlert";
import { AuthPage } from "./components/AuthPage";
import { ProfilePage } from "./components/ProfilePage";
import { Dashboard } from "./components/Dashboard";
import { useDevSyncSocket } from "./hooks/useDevSyncSocket";
import { MOCK_PROJECT_FILES, MOCK_DEVELOPERS, INITIAL_PROJECTS, INITIAL_INVITATIONS } from "./data/mockFiles";
import { AlertCircle, X } from "lucide-react";

export function App() {
  // Authentication & View Routing State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("devsync_auth_user");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return null; // Not logged in initially -> forces Signup/Login first
  });

  const [view, setView] = useState(() => {
    try {
      const saved = localStorage.getItem("devsync_auth_user");
      if (saved) return "dashboard";
    } catch {
      // ignore
    }
    return "auth"; // First page to open is auth
  });

  const [authMode, setAuthMode] = useState("signup"); // Default to signup first

  // Projects & Repositories State (Persisted)
  const [projects, setProjects] = useState(() => {
    try {
      const saved = localStorage.getItem("devsync_projects");
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_PROJECTS;
  });

  // Invitations State (Persisted)
  const [invitations, setInvitations] = useState(() => {
    try {
      const saved = localStorage.getItem("devsync_invitations");
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_INVITATIONS;
  });

  const [activeProject, setActiveProject] = useState(() => {
    return projects[0] || null;
  });

  const [selectedFile, setSelectedFile] = useState(MOCK_PROJECT_FILES[0]);
  const [selectedSymbol, setSelectedSymbol] = useState(MOCK_PROJECT_FILES[0].symbols[0]);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("ACQUIRE"); // "ACQUIRE" | "REQUEST_HANDOVER"
  const [targetLock, setTargetLock] = useState(null);

  // Sync user updates to localStorage
  const handleUpdateUser = (updated) => {
    setCurrentUser(updated);
    try {
      localStorage.setItem("devsync_auth_user", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // After Signup or Login -> Open the Dashboard!
  const handleAuthSuccess = (authenticatedUser) => {
    handleUpdateUser(authenticatedUser);
    setView("dashboard");
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("devsync_auth_user");
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setAuthMode("login");
    setView("auth");
  };

  // Create Repository Handler
  const handleCreateProject = (newRepo) => {
    const updated = [newRepo, ...projects];
    setProjects(updated);
    try {
      localStorage.setItem("devsync_projects", JSON.stringify(updated));
    } catch {}
  };

  // Invite Teammate Handler
  const handleInviteTeammate = (newInvite) => {
    const updated = [newInvite, ...invitations];
    setInvitations(updated);
    try {
      localStorage.setItem("devsync_invitations", JSON.stringify(updated));
    } catch {}
  };

  // Accept Project Invitation Handler
  const handleAcceptInvite = (inv) => {
    // 1. Mark invite accepted
    const updatedInvites = invitations.map((i) =>
      i.id === inv.id ? { ...i, status: "accepted" } : i
    );
    setInvitations(updatedInvites);

    // 2. Add collaborator to the project
    let updatedProjects = [...projects];
    const projectIndex = updatedProjects.findIndex((p) => p.id === inv.projectId);

    const isJoinRequest = inv.type === "join_request";
    const collaboratorToAdd = isJoinRequest
      ? {
          id: inv.fromUserId,
          name: inv.fromUserName,
          username: inv.fromUsername,
          role: "Collaborator",
          avatarColor: inv.fromUserAvatar || "#8B5CF6",
        }
      : {
          id: currentUser.id,
          name: currentUser.name,
          username: currentUser.username || currentUser.name.toLowerCase(),
          role: inv.role || "Collaborator",
          avatarColor: currentUser.avatarColor || "#8B5CF6",
        };

    if (projectIndex >= 0) {
      const targetProj = updatedProjects[projectIndex];
      const hasMember = targetProj.collaborators?.some(
        (c) => c.username === collaboratorToAdd.username || (collaboratorToAdd.id && c.id === collaboratorToAdd.id)
      );
      if (!hasMember) {
        targetProj.collaborators = [...(targetProj.collaborators || []), collaboratorToAdd];
        updatedProjects[projectIndex] = { ...targetProj };
      }
    } else if (!isJoinRequest) {
      // If project wasn't previously in list, create shared entry
      updatedProjects.unshift({
        id: inv.projectId,
        name: inv.projectName,
        slug: inv.projectName.toLowerCase().replace(/[^a-z0-9-_]/g, "-"),
        description: inv.projectDescription || "Shared collaborative project",
        language: "Python / Node.js",
        visibility: "private",
        defaultBranch: "main",
        ownerId: inv.fromUserId,
        ownerName: inv.fromUserName,
        ownerUsername: inv.fromUsername,
        collaborators: [
          {
            id: inv.fromUserId,
            name: inv.fromUserName,
            username: inv.fromUsername,
            role: "Owner",
            avatarColor: "#6366F1",
          },
          newCollaborator
        ],
        updatedAt: "Just now",
        stars: 3,
      });
    }

    setProjects(updatedProjects);

    try {
      localStorage.setItem("devsync_invitations", JSON.stringify(updatedInvites));
      localStorage.setItem("devsync_projects", JSON.stringify(updatedProjects));
    } catch {}
  };

  // Decline Invitation Handler
  const handleDeclineInvite = (invId) => {
    const updatedInvites = invitations.map((i) =>
      i.id === invId ? { ...i, status: "declined" } : i
    );
    setInvitations(updatedInvites);
    try {
      localStorage.setItem("devsync_invitations", JSON.stringify(updatedInvites));
    } catch {}
  };

  // Launch Editor on a specific project
  const handleOpenWorkspace = (project) => {
    setActiveProject(project);
    setView("workspace");
  };

  // WebSocket custom hook
  const {
    isConnected,
    locks,
    events,
    lastError,
    setLastError,
    handoverAlert,
    acquireLock,
    releaseLock,
    requestHandover,
    respondHandover,
    refreshState,
  } = useDevSyncSocket("ws://localhost:8080", currentUser);

  const handleOpenAcquire = (file, symbol) => {
    setSelectedFile(file);
    setSelectedSymbol(symbol);
    setModalMode("ACQUIRE");
    setModalOpen(true);
  };

  const handleOpenHandover = (symbol, activeLock) => {
    setSelectedSymbol(symbol);
    setTargetLock(activeLock);
    setModalMode("REQUEST_HANDOVER");
    setModalOpen(true);
  };

  const handleNavigateToSymbol = (symbolPath) => {
    for (const f of MOCK_PROJECT_FILES) {
      const found = f.symbols.find((s) => s.symbolPath === symbolPath);
      if (found) {
        setSelectedFile(f);
        setSelectedSymbol(found);
        break;
      }
    }
  };

  // If not authenticated or explicitly navigating to auth, lock to Auth screen
  if (!currentUser || view === "auth") {
    return (
      <AuthPage
        initialMode={authMode}
        onAuthSuccess={handleAuthSuccess}
        onBackToWorkspace={null}
      />
    );
  }

  // If viewing Projects Dashboard (default destination after signup / login!)
  if (view === "dashboard") {
    return (
      <Dashboard
        currentUser={currentUser}
        projects={projects}
        onCreateProject={handleCreateProject}
        onInviteTeammate={handleInviteTeammate}
        invitations={invitations}
        onAcceptInvite={handleAcceptInvite}
        onDeclineInvite={handleDeclineInvite}
        onOpenWorkspace={handleOpenWorkspace}
        onNavigateProfile={() => setView("profile")}
        onLogout={handleLogout}
        isConnected={isConnected}
      />
    );
  }

  // If viewing Profile Screen
  if (view === "profile") {
    return (
      <ProfilePage
        currentUser={currentUser}
        onUpdateUser={handleUpdateUser}
        onBackToWorkspace={() => setView("workspace")}
        onNavigateDashboard={() => setView("dashboard")}
        onLogout={handleLogout}
        locks={locks}
        onReleaseLock={releaseLock}
        isConnected={isConnected}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0F172A] text-slate-100 font-sans">
      {/* 1. Global Header with WebSocket status, lock telemetry, and developer switcher */}
      <Header
        isConnected={isConnected}
        currentUser={currentUser}
        onSelectUser={handleUpdateUser}
        locks={locks}
        onRefresh={refreshState}
        onNavigateProfile={() => setView("profile")}
        onNavigateDashboard={() => setView("dashboard")}
        activeProject={activeProject}
        onNavigateAuth={(mode) => {
          setAuthMode(mode);
          setView("auth");
        }}
        onLogout={handleLogout}
        currentView={view}
      />

      {/* Incoming Handover Notification Banner */}
      <IncomingHandoverBanner
        alert={handoverAlert}
        onAccept={(requestId, symbolPath, note) => {
          respondHandover(requestId, symbolPath, true, note);
        }}
        onDecline={(requestId, symbolPath) => {
          respondHandover(requestId, symbolPath, false);
        }}
      />

      {/* Collision / Error Toast */}
      {lastError && (
        <div className="bg-rose-950/90 border-b border-rose-500 px-4 py-2 flex items-center justify-between text-xs text-rose-200 animate-in slide-in-from-top-1">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-400" />
            <span className="font-semibold">{lastError.type}:</span>
            <span>
              {lastError.reason === "ALREADY_LOCKED"
                ? `Conflict: Symbol is already locked by ${lastError.holder?.ownerName || 'another developer'}`
                : lastError.reason === "ALREADY_HOLDING_LOCK"
                ? `Policy: You already hold a lock on another symbol. Release it first or wait for expiration.`
                : lastError.message || lastError.reason || "Operation failed"}
            </span>
          </div>
          <button 
            onClick={() => setLastError(null)}
            className="text-rose-400 hover:text-white p-0.5 rounded cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Dependency-Aware Call Graph Alert (Abstract Primitive #3) */}
      <CallGraphAlert
        selectedSymbol={selectedSymbol}
        locks={locks}
        files={MOCK_PROJECT_FILES}
        currentUser={currentUser}
        onOpenHandover={handleOpenHandover}
        onNavigateToSymbol={handleNavigateToSymbol}
      />

      {/* 2. Main High-Density Workspace Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Symbol & File Hierarchy Tree */}
        <SymbolTree
          files={MOCK_PROJECT_FILES}
          locks={locks}
          selectedFile={selectedFile}
          selectedSymbol={selectedSymbol}
          onSelectFile={(f) => {
            setSelectedFile(f);
            setSelectedSymbol(f.symbols[0]);
          }}
          onSelectSymbol={(f, s) => {
            setSelectedFile(f);
            setSelectedSymbol(s);
          }}
          currentUser={currentUser}
        />

        {/* Center: Monaco Editor & Gutter Lock Canvas */}
        <CodeCanvas
          file={selectedFile}
          selectedSymbol={selectedSymbol}
          locks={locks}
          currentUser={currentUser}
          onOpenAcquire={handleOpenAcquire}
          onOpenHandover={handleOpenHandover}
          onReleaseLock={releaseLock}
        />
      </div>

      {/* 3. Bottom Drawer: xterm.js Sandbox Terminal & Protocol Telemetry */}
      <BottomDrawer
        events={events}
        activeFile={selectedFile}
      />

      {/* 4. Action / Handover Modal */}
      <HandoverModal
        isOpen={modalOpen}
        mode={modalMode}
        file={selectedFile}
        symbol={selectedSymbol}
        activeLock={targetLock}
        currentUser={currentUser}
        onClose={() => setModalOpen(false)}
        onAcquire={acquireLock}
        onRequestHandover={requestHandover}
      />
    </div>
  );
}
export default App;
