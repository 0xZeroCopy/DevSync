import React, { useState } from "react";
import { 
  User, 
  Mail, 
  Briefcase, 
  Shield, 
  Lock, 
  Key, 
  Clock, 
  Copy, 
  Check, 
  ArrowLeft, 
  LogOut, 
  CheckCircle2, 
  Layers, 
  Activity, 
  Sparkles,
  Wifi,
  Save,
  Globe
} from "lucide-react";

const AVATAR_COLORS = [
  { name: "Purple", hex: "#8B5CF6" },
  { name: "Indigo", hex: "#6366F1" },
  { name: "Green", hex: "#22C55E" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Cyan", hex: "#06B6D4" },
  { name: "Orange", hex: "#F97316" },
  { name: "Pink", hex: "#EC4899" },
];

export function ProfilePage({ 
  currentUser, 
  onUpdateUser, 
  onBackToWorkspace, 
  onNavigateDashboard,
  onLogout,
  locks = [],
  onReleaseLock,
  isConnected
}) {
  const [name, setName] = useState(currentUser.name || "");
  const [username, setUsername] = useState(currentUser.username || currentUser.name.toLowerCase().replace(/[^a-z0-9_]/g, "_"));
  const [email, setEmail] = useState(currentUser.email || `${currentUser.name.toLowerCase()}@devsync.io`);
  const [role, setRole] = useState(currentUser.role || "Developer");
  const [avatarColor, setAvatarColor] = useState(currentUser.avatarColor || "#8B5CF6");
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Find active lock held by this user
  const myLock = locks.find((l) => l.ownerId === currentUser.id);

  const handleCopyId = () => {
    navigator.clipboard.writeText(currentUser.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const updated = {
      ...currentUser,
      name: name.trim() || currentUser.name,
      username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""),
      email: email.trim(),
      role: role.trim(),
      avatarColor,
    };
    onUpdateUser(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="min-h-screen w-screen bg-[#0F172A] text-slate-100 flex flex-col font-sans select-none overflow-y-auto">
      {/* Top Navbar */}
      <header className="h-14 bg-[#1E293B] border-b border-[#334155] px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          {onNavigateDashboard && (
            <button
              onClick={onNavigateDashboard}
              className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-[#0F172A] border border-[#334155] hover:border-slate-500 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-indigo-400" />
              <span>Projects Dashboard</span>
            </button>
          )}

          {onBackToWorkspace && (
            <button
              onClick={onBackToWorkspace}
              className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-[#0F172A] border border-[#334155] hover:border-slate-500 transition-colors cursor-pointer"
            >
              <span>Code Editor</span>
            </button>
          )}
          
          <div className="h-4 w-px bg-[#334155]" />
          
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center">
              <Layers className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs font-semibold text-slate-200">DevSync Profile & Identity</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 text-xs text-rose-300 hover:text-rose-100 px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/60 hover:bg-rose-900/40 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Profile Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Save confirmation toast */}
        {saveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center space-x-2 animate-in slide-in-from-top-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Profile settings saved and synced across active DevSync sessions!</span>
          </div>
        )}

        {/* User Hero Banner */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center space-x-5">
              {/* Large Avatar */}
              <div 
                className="h-20 w-20 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-white shadow-2xl border-2 border-white/20 shrink-0"
                style={{ backgroundColor: avatarColor }}
              >
                {name[0] || "U"}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold text-white">{name}</h1>
                  {currentUser.username && (
                    <span className="text-xs font-mono text-indigo-400">@{currentUser.username}</span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/70 border border-indigo-700/60 text-indigo-300 font-mono">
                    {role}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
                  <span>{email}</span>
                  <span>•</span>
                  <span className="flex items-center space-x-1 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Verified Developer</span>
                  </span>
                </p>
                <div className="mt-2.5 flex items-center space-x-2">
                  <span className="text-[11px] font-mono text-slate-400 bg-[#0F172A] px-2.5 py-1 rounded-md border border-[#334155] flex items-center space-x-1.5">
                    <span className="text-slate-500">ID:</span>
                    <span>{currentUser.id}</span>
                  </span>
                  <button
                    onClick={handleCopyId}
                    className="p-1 rounded bg-[#0F172A] border border-[#334155] hover:border-slate-500 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy Developer ID"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Auth Provider Badge */}
            <div className="flex flex-col items-end space-y-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#0F172A] border border-[#334155] text-xs">
                {currentUser.authProvider === "google" ? (
                  <>
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span className="text-slate-300">Signed in via Google</span>
                  </>
                ) : (
                  <>
                    <Mail className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="text-slate-300">Email & Password Auth</span>
                  </>
                )}
              </div>
              <span className="text-[10px] text-slate-500">
                Connection: <span className={isConnected ? "text-emerald-400" : "text-rose-400"}>{isConnected ? "Active (Port 8080)" : "Offline"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Grid: Edit Profile Form + Active Concurrency State */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Edit Form (2 cols) */}
          <div className="md:col-span-2 bg-[#1E293B] border border-[#334155] rounded-2xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
              <User className="h-4 w-4 text-indigo-400" />
              <span>Edit Profile Details</span>
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name / Handle
                </label>
                <div className="relative">
                  <User className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0F172A] border border-[#334155] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-white outline-none"
                    placeholder="Your Name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Developer Email
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0F172A] border border-[#334155] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-white outline-none"
                    placeholder="developer@devsync.io"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Engineering Role
                </label>
                <div className="relative">
                  <Briefcase className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0F172A] border border-[#334155] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-white outline-none"
                    placeholder="Full Stack Developer"
                  />
                </div>
              </div>

              {/* Avatar Color Picker */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Avatar Theme Color
                </label>
                <div className="flex items-center space-x-2">
                  {AVATAR_COLORS.map((col) => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => setAvatarColor(col.hex)}
                      className={`h-7 w-7 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                        avatarColor === col.hex ? "ring-2 ring-white scale-110 shadow-lg" : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: col.hex }}
                      title={col.name}
                    >
                      {avatarColor === col.hex && <Check className="h-3.5 w-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center space-x-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Profile Updates</span>
                </button>
              </div>
            </form>
          </div>

          {/* Active Locks & Concurrency Telemetry (1 col) */}
          <div className="space-y-6">
            {/* Active Lock Card */}
            <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 shadow-xl">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Key className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Held Symbol Lock</span>
                </span>
                {myLock && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Active
                  </span>
                )}
              </h3>

              {myLock ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-[#0F172A] border border-emerald-500/40">
                    <div className="text-[11px] font-mono text-emerald-300 font-semibold truncate" title={myLock.symbolPath}>
                      {myLock.symbolPath.split("::").pop() || myLock.symbolPath}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                      {myLock.filePath}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Intent: {myLock.intent || "editing"}</span>
                      <span className="font-mono text-emerald-400">Lines {myLock.startLine}-{myLock.endLine}</span>
                    </div>
                  </div>

                  {onReleaseLock && (
                    <button
                      onClick={() => onReleaseLock(myLock.symbolPath)}
                      className="w-full py-1.5 text-xs rounded-lg bg-rose-950/60 border border-rose-800/80 hover:bg-rose-900/60 text-rose-300 font-medium transition-colors cursor-pointer"
                    >
                      Release Lock Now
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#0F172A] border border-[#334155] text-center text-xs text-slate-400">
                  <Lock className="h-6 w-6 text-slate-600 mx-auto mb-2" />
                  <p>You currently hold 0 locks.</p>
                  <p className="text-[10px] text-slate-500 mt-1">Ready to acquire symbols in the editor.</p>
                </div>
              )}
            </div>

            {/* Protocol Rules Card */}
            <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 shadow-xl text-xs space-y-2.5">
              <h3 className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Shield className="h-3.5 w-3.5 text-indigo-400" />
                <span>DevSync Concurrency Rules</span>
              </h3>
              <ul className="space-y-1.5 text-[11px] text-slate-400">
                <li className="flex items-start space-x-1.5">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>1 Lock Limit:</strong> Strict single active lock per developer to prevent hoard deadlocks.</span>
                </li>
                <li className="flex items-start space-x-1.5">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>30s TTL:</strong> Ephemeral leases with automated background sweep evictions.</span>
                </li>
                <li className="flex items-start space-x-1.5">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Heartbeats:</strong> Heartbeat pings extend lease duration while editing.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
