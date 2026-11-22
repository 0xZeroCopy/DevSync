import React, { useState, useEffect } from "react";
import { 
  Wifi, 
  WifiOff, 
  Lock, 
  Key, 
  User, 
  ChevronDown, 
  Clock, 
  ShieldCheck, 
  Layers,
  FolderGit2,
  LogOut
} from "lucide-react";

export function Header({ 
  isConnected, 
  currentUser, 
  locks = [], 
  onRefresh,
  onNavigateProfile,
  onNavigateDashboard,
  activeProject,
  onLogout,
  currentView = "workspace"
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const myLock = locks.find((l) => l.ownerId === currentUser.id);

  // Countdown timer for user's active lock lease
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!myLock || !myLock.expiresAt) {
      setTimeLeft(0);
      return;
    }
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((myLock.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [myLock]);

  return (
    <header className="h-14 bg-[#1E293B] border-b border-[#334155] px-4 flex items-center justify-between text-xs select-none">
      {/* Brand & Connection Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="h-7 w-7 rounded bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shadow-md">
            <Layers className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide text-white">DevSync</span>
            <span className="text-[10px] text-emerald-400 font-mono ml-1.5 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
              v1.0.0
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-[#334155] mx-1" />

        {/* Dashboard Shortcut */}
        {onNavigateDashboard && (
          <button
            onClick={onNavigateDashboard}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#0F172A] border border-[#334155] hover:border-indigo-500 text-slate-300 hover:text-white transition-colors cursor-pointer font-medium"
            title="Return to Projects Dashboard"
          >
            <FolderGit2 className="h-3.5 w-3.5 text-indigo-400" />
            <span className="max-w-[140px] truncate">{activeProject ? activeProject.name : "Dashboard"}</span>
          </button>
        )}

        {/* WebSocket Pill */}
        <div 
          onClick={onRefresh}
          className={`cursor-pointer inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full border transition-colors ${
            isConnected
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/60"
              : "bg-rose-950/40 border-rose-500/40 text-rose-400 hover:bg-rose-950/60"
          }`}
          title="Click to ping/refresh state"
        >
          {isConnected ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <Wifi className="h-3 w-3" />
              <span className="font-mono text-[11px]">ws://localhost:8080</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-rose-400" />
              <span className="font-mono text-[11px]">Disconnected (Retrying...)</span>
            </>
          )}
        </div>
      </div>

      {/* Center: Real-time Lease Telemetry */}
      <div className="hidden md:flex items-center space-x-4">
        <div className="flex items-center space-x-1.5 text-slate-300">
          <Lock className="h-3.5 w-3.5 text-indigo-400" />
          <span>Active Cluster Locks:</span>
          <span className="font-mono font-semibold px-1.5 py-0.5 rounded bg-[#0F172A] border border-[#334155] text-indigo-300">
            {locks.length}
          </span>
        </div>

        {myLock ? (
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded bg-[#0F172A] border border-emerald-500/40 text-emerald-400 animate-pulse-glow">
            <Key className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-mono truncate max-w-[200px]" title={myLock.symbolPath}>
              {myLock.symbolPath.split("::").pop()}
            </span>
            <div className="flex items-center space-x-1 pl-1 border-l border-emerald-800">
              <Clock className="h-3 w-3" />
              <span className="font-mono font-bold">{timeLeft}s TTL</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
            <span>You hold 0 locks (Ready to acquire)</span>
          </div>
        )}
      </div>

      {/* User Switcher Dropdown */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center space-x-2 px-2.5 py-1.5 rounded bg-[#0F172A] border border-[#334155] hover:border-slate-500 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none cursor-pointer"
        >
          <div 
            className="h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-inner"
            style={{ backgroundColor: currentUser.avatarColor }}
          >
            {currentUser.name[0]}
          </div>
          <div className="text-left">
            <div className="font-semibold text-white leading-tight flex items-center space-x-1">
              <span>{currentUser.name}</span>
              <span className="text-[10px] text-slate-400">({currentUser.role})</span>
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>

        {dropdownOpen && (
          <div 
            className="absolute right-0 mt-2 w-56 rounded-xl bg-[#1E293B] border border-[#475569] shadow-2xl py-1.5 z-50 divide-y divide-[#334155]"
            onMouseLeave={() => setDropdownOpen(false)}
          >
            {/* User Identity Header */}
            <div className="px-3.5 py-2.5 bg-[#0F172A]/70">
              <div className="flex items-center space-x-2">
                <span 
                  className="h-7 w-7 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-inner"
                  style={{ backgroundColor: currentUser.avatarColor || "#8B5CF6" }}
                >
                  {currentUser.name?.[0] || "U"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-indigo-400 font-mono truncate">
                    @{currentUser.username || currentUser.name.toLowerCase()}
                  </div>
                </div>
              </div>
            </div>

            {/* Profile & Dashboard Actions */}
            <div className="py-1">
              {onNavigateDashboard && (
                <button
                  onClick={() => {
                    onNavigateDashboard();
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 flex items-center space-x-2.5 hover:bg-[#27354F] text-slate-200 hover:text-white transition-colors cursor-pointer text-xs"
                >
                  <FolderGit2 className="h-4 w-4 text-emerald-400" />
                  <span className="font-medium">Projects Dashboard</span>
                </button>
              )}
              <button
                onClick={() => {
                  if (onNavigateProfile) onNavigateProfile();
                  setDropdownOpen(false);
                }}
                className="w-full text-left px-3.5 py-2 flex items-center space-x-2.5 hover:bg-[#27354F] text-slate-200 hover:text-white transition-colors cursor-pointer text-xs"
              >
                <User className="h-4 w-4 text-indigo-400" />
                <span className="font-medium">My Profile & Settings</span>
              </button>
            </div>

            {/* Logout Action */}
            <div className="py-1">
              <button
                onClick={() => {
                  if (onLogout) onLogout();
                  setDropdownOpen(false);
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 transition-colors cursor-pointer flex items-center space-x-2.5"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-400" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

