import React, { useState } from "react";
import { 
  Plus, 
  FolderGit2, 
  Users, 
  Lock, 
  Globe, 
  Search, 
  UserPlus, 
  Check, 
  X, 
  ArrowRight, 
  Mail, 
  Sparkles, 
  Layers, 
  LogOut, 
  User, 
  ShieldCheck, 
  Bell, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  SendHorizontal,
  Eye
} from "lucide-react";

export function Dashboard({ 
  currentUser, 
  projects = [], 
  onCreateProject, 
  onInviteTeammate, 
  invitations = [], 
  onAcceptInvite, 
  onDeclineInvite, 
  onOpenWorkspace,
  onNavigateProfile,
  onLogout,
  isConnected
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all" | "owned" | "public" | "shared"
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedProjectForInvite, setSelectedProjectForInvite] = useState(null);

  // Create Repo Form
  const [repoName, setRepoName] = useState("");
  const [repoDesc, setRepoDesc] = useState("");
  const [repoLanguage, setRepoLanguage] = useState("Python / Node.js");
  const [repoVisibility, setRepoVisibility] = useState("private");
  const [createError, setCreateError] = useState("");

  // Invite Form (Owner -> Teammate)
  const [inviteTargetUser, setInviteTargetUser] = useState("");
  const [inviteRole, setInviteRole] = useState("Collaborator");
  const [inviteNote, setInviteNote] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Join Request Feedback
  const [joinRequestToast, setJoinRequestToast] = useState("");

  // Pending items relevant to current user:
  // 1. Invites sent TO current user by other repo owners
  // 2. Join requests sent TO current user by other users who want to join current user's repos
  const myPendingRequests = invitations.filter((inv) => {
    if (inv.status !== "pending") return false;
    const curUser = currentUser.username?.toLowerCase();
    const curEmail = currentUser.email?.toLowerCase();
    const toUser = inv.toUsername?.toLowerCase();
    const toEmail = inv.toEmail?.toLowerCase();

    return (toUser && toUser === curUser) || (toEmail && toEmail === curEmail);
  });

  // STRICT REPOSITORY VISIBILITY RULES:
  // Only public repos and user's own repos are shown.
  // Private repos are ONLY shown if an invite has been accepted (user is in collaborators)!
  const visibleProjects = projects.filter((p) => {
    const isOwner = p.ownerId === currentUser.id || p.ownerUsername === currentUser.username;
    const isCollaborator = p.collaborators?.some(
      (c) => c.id === currentUser.id || c.username === currentUser.username
    );
    const isPublic = p.visibility === "public";

    // Strict Rule: If private and user is not owner and not accepted collaborator, HIDE!
    if (!isOwner && !isCollaborator && !isPublic) {
      return false;
    }

    // Search query
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.language.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Filter tab
    if (filterType === "owned") return isOwner;
    if (filterType === "shared") return !isOwner && isCollaborator;
    if (filterType === "public") return isPublic && !isOwner && !isCollaborator;
    return true;
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    setCreateError("");

    if (!repoName.trim()) {
      setCreateError("Repository name is required.");
      return;
    }

    const cleanSlug = repoName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
    const newRepo = {
      id: "repo_" + Date.now().toString(36),
      name: repoName.trim(),
      slug: cleanSlug,
      description: repoDesc.trim() || "No description provided.",
      language: repoLanguage,
      visibility: repoVisibility,
      defaultBranch: "main",
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      ownerUsername: currentUser.username || currentUser.name.toLowerCase(),
      collaborators: [
        {
          id: currentUser.id,
          name: currentUser.name,
          username: currentUser.username || currentUser.name.toLowerCase(),
          role: "Owner",
          avatarColor: currentUser.avatarColor || "#8B5CF6",
        }
      ],
      updatedAt: "Just now",
      stars: 1,
    };

    onCreateProject(newRepo);
    setShowCreateModal(false);
    setRepoName("");
    setRepoDesc("");
  };

  const handleOpenInvite = (project) => {
    setSelectedProjectForInvite(project);
    setInviteTargetUser("");
    setInviteRole("Collaborator");
    setInviteNote("");
    setInviteError("");
    setInviteSuccess(false);
    setShowInviteModal(true);
  };

  // Owner sending invite to teammate
  const handleSendInviteSubmit = (e) => {
    e.preventDefault();
    setInviteError("");

    if (!inviteTargetUser.trim()) {
      setInviteError("Please specify a teammate username or email.");
      return;
    }

    if (!selectedProjectForInvite) {
      setInviteError("Please select a target repository.");
      return;
    }

    const cleanTarget = inviteTargetUser.trim().toLowerCase().replace(/^@/, "");

    const newInvite = {
      id: "inv_" + Date.now().toString(36),
      type: "invite",
      projectId: selectedProjectForInvite.id,
      projectName: selectedProjectForInvite.name,
      projectDescription: selectedProjectForInvite.description,
      fromUserId: currentUser.id,
      fromUserName: currentUser.name,
      fromUsername: currentUser.username || currentUser.name.toLowerCase(),
      toUsername: cleanTarget,
      toEmail: cleanTarget.includes("@") ? cleanTarget : `${cleanTarget}@devsync.io`,
      role: inviteRole,
      note: inviteNote.trim(),
      status: "pending",
      createdAt: "Just now",
    };

    onInviteTeammate(newInvite);
    setInviteSuccess(true);
    setTimeout(() => {
      setShowInviteModal(false);
      setInviteSuccess(false);
    }, 1200);
  };

  // User requesting to join a public repository
  const handleRequestToJoin = (project) => {
    const newRequest = {
      id: "req_" + Date.now().toString(36),
      type: "join_request",
      projectId: project.id,
      projectName: project.name,
      projectDescription: project.description,
      fromUserId: currentUser.id,
      fromUserName: currentUser.name,
      fromUsername: currentUser.username,
      fromUserAvatar: currentUser.avatarColor || "#8B5CF6",
      toUserId: project.ownerId,
      toUsername: project.ownerUsername,
      role: "Collaborator",
      status: "pending",
      createdAt: "Just now",
    };

    onInviteTeammate(newRequest);
    setJoinRequestToast(`Join request sent to @${project.ownerUsername} for "${project.name}"!`);
    setTimeout(() => setJoinRequestToast(""), 4000);
  };

  return (
    <div className="min-h-screen w-screen bg-[#0F172A] text-slate-100 flex flex-col font-sans select-none overflow-y-auto">
      {/* Top Navbar */}
      <header className="h-16 bg-[#1E293B] border-b border-[#334155] px-6 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Layers className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base tracking-wide text-white">DevSync</span>
              <span className="text-[10px] text-emerald-400 font-mono ml-2 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800">
                Hub
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-[#334155]" />

          <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400">
            <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
            <span>Node: {isConnected ? "ws://localhost:8080" : "Offline"}</span>
          </div>
        </div>

        {/* Right Nav Actions */}
        <div className="flex items-center space-x-3">
          {/* Notifications / Invites Pill */}
          {myPendingRequests.length > 0 && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500 text-indigo-300 text-xs animate-pulse">
              <Bell className="h-3.5 w-3.5 text-indigo-400" />
              <span>{myPendingRequests.length} Pending Request{myPendingRequests.length > 1 ? "s" : ""}</span>
            </div>
          )}

          {/* Create Repo Action */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Repository</span>
          </button>

          {/* Profile Shortcut */}
          <button
            onClick={onNavigateProfile}
            className="flex items-center space-x-2.5 px-2.5 py-1.5 rounded-xl bg-[#0F172A] border border-[#334155] hover:border-slate-500 transition-colors cursor-pointer"
            title="Open Developer Profile"
          >
            <div 
              className="h-6 w-6 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-inner"
              style={{ backgroundColor: currentUser.avatarColor || "#8B5CF6" }}
            >
              {currentUser.name?.[0] || "U"}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-semibold text-white leading-tight flex items-center space-x-1">
                <span>{currentUser.name}</span>
                {currentUser.username && (
                  <span className="text-[10px] text-indigo-400 font-mono">@{currentUser.username}</span>
                )}
              </div>
            </div>
          </button>

          {/* Sign Out */}
          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-[#0F172A] border border-[#334155] hover:border-rose-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Join Request Success Toast */}
        {joinRequestToast && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs flex items-center justify-between shadow-xl animate-in slide-in-from-top-2">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{joinRequestToast}</span>
            </div>
            <button onClick={() => setJoinRequestToast("")} className="text-emerald-400 hover:text-white p-1">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Welcome Hero Banner */}
        <div className="bg-gradient-to-r from-[#1E293B] via-[#1E293B] to-[#141e33] border border-[#334155] rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-700/50 text-[11px] text-indigo-300 font-medium mb-3">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Your Dedicated Developer Hub</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Welcome, {currentUser.name}!</span>
                {currentUser.username && (
                  <span className="text-sm font-mono text-indigo-400 font-normal">(@{currentUser.username})</span>
                )}
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-1.5 max-w-xl">
                Browse your own repositories, discover open public repositories to collaborate on, and accept invitations to private team codebases.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-[#0F172A]/80 border border-[#334155] rounded-2xl p-4 text-center min-w-[100px]">
                <div className="text-xl font-bold text-white font-mono">{visibleProjects.length}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Visible Repos</div>
              </div>
              <div className="bg-[#0F172A]/80 border border-[#334155] rounded-2xl p-4 text-center min-w-[100px]">
                <div className="text-xl font-bold text-emerald-400 font-mono">
                  {visibleProjects.filter(p => p.ownerUsername === currentUser.username || p.ownerId === currentUser.id).length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Owned by You</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Requests & Invitations Section */}
        {myPendingRequests.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-950/80 via-[#1E293B] to-[#1E293B] border border-indigo-500/50 rounded-2xl p-5 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-indigo-300 font-semibold text-xs">
                <Mail className="h-4 w-4 text-indigo-400" />
                <span>Pending Action Items ({myPendingRequests.length})</span>
              </div>
              <span className="text-[10px] text-slate-400">Accept to grant or gain access</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {myPendingRequests.map((req) => {
                const isJoinRequest = req.type === "join_request";
                return (
                  <div 
                    key={req.id}
                    className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                          <FolderGit2 className="h-3.5 w-3.5 text-indigo-400" />
                          <span>{req.projectName}</span>
                        </h4>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          isJoinRequest 
                            ? "bg-amber-950/80 text-amber-300 border-amber-800"
                            : "bg-indigo-950 text-indigo-300 border-indigo-800"
                        }`}>
                          {isJoinRequest ? "Join Request" : "Invitation"}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {isJoinRequest 
                          ? `@${req.fromUsername} wants to join as a collaborator on your repository.`
                          : req.projectDescription || "You were invited to collaborate."}
                      </p>

                      <div className="text-[10px] text-slate-500 mt-2">
                        From <strong className="text-slate-300">@{req.fromUsername}</strong> ({req.fromUserName}) • {req.createdAt}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2 border-t border-[#334155]/60">
                      <button
                        onClick={() => onAcceptInvite(req)}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>{isJoinRequest ? "Approve Join Request" : "Accept Invitation"}</span>
                      </button>
                      <button
                        onClick={() => onDeclineInvite(req.id)}
                        className="py-1.5 px-3 rounded-lg bg-[#1E293B] hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-[#334155] text-xs transition-colors cursor-pointer"
                        title="Decline"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Projects Control Bar: Search + Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search repositories by name or tech stack..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#1E293B] border border-[#334155] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-1.5 bg-[#1E293B] p-1 rounded-xl border border-[#334155] text-xs font-medium self-stretch sm:self-auto overflow-x-auto">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterType === "all" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              All Visible ({visibleProjects.length})
            </button>
            <button
              onClick={() => setFilterType("owned")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterType === "owned" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              My Repositories
            </button>
            <button
              onClick={() => setFilterType("public")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterType === "public" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Public Repos
            </button>
            <button
              onClick={() => setFilterType("shared")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterType === "shared" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Accepted Teams
            </button>
          </div>
        </div>

        {/* Repositories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleProjects.map((project) => {
            const isOwner = project.ownerId === currentUser.id || project.ownerUsername === currentUser.username;
            const isCollaborator = project.collaborators?.some(
              (c) => c.id === currentUser.id || c.username === currentUser.username
            );
            const isPublic = project.visibility === "public";
            const collaborators = project.collaborators || [];

            // Check if current user sent a pending join request for this public repo
            const hasPendingJoinRequest = invitations.some(
              (inv) => inv.projectId === project.id &&
                       inv.type === "join_request" &&
                       (inv.fromUserId === currentUser.id || inv.fromUsername === currentUser.username) &&
                       inv.status === "pending"
            );

            return (
              <div
                key={project.id}
                className="bg-[#1E293B] border border-[#334155] hover:border-slate-500/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-8 rounded-lg bg-[#0F172A] border border-[#334155] flex items-center justify-center text-indigo-400 group-hover:text-white group-hover:bg-indigo-600 transition-colors">
                        <FolderGit2 className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {project.name}
                        </h3>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Owner: @{project.ownerUsername || "user"}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#0F172A] border border-[#334155] text-slate-400 flex items-center space-x-1">
                      {project.visibility === "private" ? (
                        <>
                          <Lock className="h-2.5 w-2.5 text-amber-400" />
                          <span>Private</span>
                        </>
                      ) : (
                        <>
                          <Globe className="h-2.5 w-2.5 text-emerald-400" />
                          <span>Public</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-400 mt-3 line-clamp-2 min-h-[32px]">
                    {project.description}
                  </p>

                  {/* Metadata Row: Language + Updated */}
                  <div className="mt-4 flex items-center space-x-3 text-[11px] text-slate-400">
                    <span className="flex items-center space-x-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span>{project.language}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span>{project.updatedAt || "Active"}</span>
                    </span>
                  </div>

                  {/* Collaborators row */}
                  <div className="mt-4 pt-3 border-t border-[#334155]/60 flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Users className="h-3.5 w-3.5 text-slate-400 mr-1" />
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {collaborators.slice(0, 4).map((c, idx) => (
                          <div
                            key={idx}
                            className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-[#1E293B]"
                            style={{ backgroundColor: c.avatarColor || "#6366F1" }}
                            title={`${c.name} (@${c.username || c.name}) - ${c.role}`}
                          >
                            {c.name?.[0] || "U"}
                          </div>
                        ))}
                      </div>
                      {collaborators.length > 4 && (
                        <span className="text-[10px] text-slate-400 ml-1">+{collaborators.length - 4}</span>
                      )}
                    </div>

                    {/* Invite Button only for Owner / Collaborator */}
                    {(isOwner || isCollaborator) && (
                      <button
                        onClick={() => handleOpenInvite(project)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1 cursor-pointer"
                      >
                        <UserPlus className="h-3 w-3" />
                        <span>Invite</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="mt-5 pt-3">
                  {isOwner || isCollaborator ? (
                    <button
                      onClick={() => onOpenWorkspace(project)}
                      className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <span>Launch Editor</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : isPublic ? (
                    hasPendingJoinRequest ? (
                      <div className="w-full py-2 px-3 rounded-xl bg-amber-950/40 border border-amber-700/60 text-amber-300 text-xs text-center flex items-center justify-center space-x-1.5">
                        <Clock className="h-3.5 w-3.5 animate-pulse" />
                        <span>Join Request Pending Approval</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleRequestToJoin(project)}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
                        >
                          <SendHorizontal className="h-3.5 w-3.5" />
                          <span>Request to Join</span>
                        </button>
                        <button
                          onClick={() => onOpenWorkspace(project)}
                          className="py-2 px-3 rounded-xl bg-[#0F172A] hover:bg-[#141e33] border border-[#334155] text-slate-300 text-xs flex items-center space-x-1 cursor-pointer"
                          title="Preview Code"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Preview</span>
                        </button>
                      </div>
                    )
                  ) : null}
                </div>
              </div>
            );
          })}

          {/* Create Repo Tile */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="border-2 border-dashed border-[#334155] hover:border-indigo-500/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2 text-slate-400 hover:text-white transition-all cursor-pointer group min-h-[220px]"
          >
            <div className="h-10 w-10 rounded-xl bg-[#1E293B] border border-[#334155] flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:bg-indigo-950/60 transition-colors">
              <Plus className="h-5 w-5" />
            </div>
            <div className="font-semibold text-xs text-white">Create New Repository</div>
            <p className="text-[11px] text-slate-500 max-w-[200px]">
              Set up a private or public project with lease-based symbol concurrency
            </p>
          </button>
        </div>
      </main>

      {/* Modal: Create Repository */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-[#475569] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#334155] mb-4">
              <div className="flex items-center space-x-2">
                <FolderGit2 className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Create New Repository</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/50 flex items-center space-x-2 text-xs text-rose-200">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Repository Name
                </label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="e.g. order-processing-service"
                  className="w-full px-3 py-2 rounded-xl bg-[#0F172A] border border-[#334155] focus:border-indigo-500 text-xs text-white outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={repoDesc}
                  onChange={(e) => setRepoDesc(e.target.value)}
                  placeholder="Brief summary of code and service role..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-[#0F172A] border border-[#334155] focus:border-indigo-500 text-xs text-white outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tech Stack / Language
                  </label>
                  <select
                    value={repoLanguage}
                    onChange={(e) => setRepoLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0F172A] border border-[#334155] focus:border-indigo-500 text-xs text-white outline-none"
                  >
                    <option value="Python / Node.js">Python / Node.js</option>
                    <option value="TypeScript / React">TypeScript / React</option>
                    <option value="Go / gRPC">Go / gRPC</option>
                    <option value="Rust">Rust</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Visibility
                  </label>
                  <select
                    value={repoVisibility}
                    onChange={(e) => setRepoVisibility(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0F172A] border border-[#334155] focus:border-indigo-500 text-xs text-white outline-none"
                  >
                    <option value="private">Private (Only accepted invites)</option>
                    <option value="public">Public (Open for join requests)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 text-xs text-slate-400 hover:text-white rounded-xl bg-[#0F172A] border border-[#334155] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  Create Repository
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Invite Teammates */}
      {showInviteModal && selectedProjectForInvite && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-[#475569] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#334155] mb-4">
              <div className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Invite Teammate</h3>
                  <p className="text-[11px] text-slate-400">to project: <strong className="text-indigo-300">{selectedProjectForInvite.name}</strong></p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500 text-center space-y-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto" />
                <p className="text-xs font-semibold text-white">Invitation dispatched successfully!</p>
                <p className="text-[11px] text-slate-400">The teammate can now accept this invite from their dashboard.</p>
              </div>
            ) : (
              <form onSubmit={handleSendInviteSubmit} className="space-y-4">
                {inviteError && (
                  <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/50 flex items-center space-x-2 text-xs text-rose-200">
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                    <span>{inviteError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Teammate's Unique Username or Email
                  </label>
                  <input
                    type="text"
                    value={inviteTargetUser}
                    onChange={(e) => setInviteTargetUser(e.target.value)}
                    placeholder="Enter teammate's @username or email"
                    className="w-full px-3 py-2 rounded-xl bg-[#0F172A] border border-[#334155] focus:border-indigo-500 text-xs text-white outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Access Permission Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0F172A] border border-[#334155] focus:border-indigo-500 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="Collaborator">Collaborator (Acquire & Release Symbol Locks)</option>
                    <option value="Reviewer">Reviewer (Audit Locks & Read Code)</option>
                    <option value="Admin">Admin (Full Project Management)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Personal Invitation Message (Optional)
                  </label>
                  <input
                    type="text"
                    value={inviteNote}
                    onChange={(e) => setInviteNote(e.target.value)}
                    placeholder="Hey! Join this repo to coordinate changes without merge collisions."
                    className="w-full px-3 py-2 rounded-xl bg-[#0F172A] border border-[#334155] focus:border-indigo-500 text-xs text-white outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-3.5 py-2 text-xs text-slate-400 hover:text-white rounded-xl bg-[#0F172A] border border-[#334155] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Send Invite</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
