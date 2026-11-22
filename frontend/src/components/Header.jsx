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
  Activity,
  Layers
} from "lucide-react";
import { MOCK_DEVELOPERS } from "../data/mockFiles";

export function Header({ 
  isConnected, 
  currentUser, 
  onSelectUser, 
  locks = [], 
  onRefresh,
  onNavigateProfile,
  onNavigateAuth,
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
            className="absolute right-0 mt-2 w-60 rounded-xl bg-[#1E293B] border border-[#475569] shadow-2xl py-1.5 z-50 divide-y divide-[#334155]"
            onMouseLeave={() => setDropdownOpen(false)}
          >
            {/* Profile Action */}
            <div className="py-1">
              <button
                onClick={() => {
                  if (onNavigateProfile) onNavigateProfile();
                  setDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 flex items-center space-x-2.5 hover:bg-[#27354F] text-slate-200 hover:text-white transition-colors cursor-pointer text-xs"
              >
                <User className="h-4 w-4 text-indigo-400" />
                <span className="font-medium">My Profile & Settings</span>
              </button>
            </div>

            <div className="py-1">
              <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Switch Developer Identity
              </div>
              {MOCK_DEVELOPERS.map((dev) => (
                <button
                  key={dev.id}
                  onClick={() => {
                    onSelectUser(dev);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[#27354F] transition-colors cursor-pointer ${
                    dev.id === currentUser.id ? "bg-[#27354F]/70 text-indigo-400" : "text-slate-200"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span 
                      className="h-3.5 w-3.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                      style={{ backgroundColor: dev.avatarColor }}
                    >
                      {dev.name[0]}
                    </span>
                    <div>
                      <div className="font-medium text-xs text-white">{dev.name}</div>
                      <div className="text-[10px] text-slate-400">{dev.role}</div>
                    </div>
                  </div>
                  {dev.id === currentUser.id && (
                    <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-800">
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Auth Actions */}
            <div className="py-1">
              <button
                onClick={() => {
                  if (onNavigateAuth) onNavigateAuth("login");
                  setDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-[#27354F] transition-colors cursor-pointer flex items-center space-x-2"
              >
                <Key className="h-3.5 w-3.5 text-slate-400" />
                <span>Switch / Sign In</span>
              </button>
              <button
                onClick={() => {
                  if (onLogout) onLogout();
                  setDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 transition-colors cursor-pointer flex items-center space-x-2"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-rose-400" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

