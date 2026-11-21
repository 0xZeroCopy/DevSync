import React from "react";
import { GitFork, AlertTriangle, ArrowRight, Lock, ExternalLink } from "lucide-react";

/**
 * Dependency-aware notifications: Surfaces real-time alerts to teammates
 * editing direct callers or callees of a locked function (Abstract Primitive #3).
 */
export function CallGraphAlert({
  selectedSymbol,
  locks = [],
  files = [],
  currentUser,
  onOpenHandover,
  onNavigateToSymbol,
}) {
  if (!selectedSymbol) return null;

  const callers = selectedSymbol.callers || [];
  const callees = selectedSymbol.callees || [];

  // Find if any caller or callee is locked by another developer
  const lockedDependencies = [];

  callers.forEach((callerPath) => {
    const lock = locks.find((l) => l.symbolPath === callerPath);
    if (lock && lock.ownerId !== currentUser.id) {
      lockedDependencies.push({ relation: "Caller", lock, symbolPath: callerPath });
    }
  });

  callees.forEach((calleePath) => {
    const lock = locks.find((l) => l.symbolPath === calleePath);
    if (lock && lock.ownerId !== currentUser.id) {
      lockedDependencies.push({ relation: "Callee", lock, symbolPath: calleePath });
    }
  });

  if (lockedDependencies.length === 0) return null;

  return (
    <div className="bg-amber-950/80 border-b border-amber-500/60 px-4 py-2 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-lg animate-in slide-in-from-top-1 select-none">
      <div className="flex items-center space-x-2.5">
        <div className="p-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
          <GitFork className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center space-x-1.5 font-semibold text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span>Dependency-Aware Call Graph Alert:</span>
            <span className="font-mono text-white text-[11px] underline">
              {lockedDependencies.map((d) => `${d.relation} (${d.lock.ownerName})`).join(", ")}
            </span>
          </div>
          <div className="text-slate-300 text-[11px] mt-0.5 space-x-1">
            {lockedDependencies.map((dep, idx) => (
              <span key={idx}>
                Teammate <span className="font-bold text-amber-300">{dep.lock.ownerName}</span> is modifying direct {dep.relation.toLowerCase()}{" "}
                <span className="font-mono text-indigo-300">"{dep.symbolPath.split("::").pop()}"</span>:{" "}
                <span className="italic text-slate-200">"{dep.lock.intent || "Active modification"}"</span>.
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        {lockedDependencies.map((dep, idx) => (
          <button
            key={idx}
            onClick={() => onOpenHandover({ symbolPath: dep.symbolPath }, dep.lock)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-xs transition-colors cursor-pointer text-[11px]"
          >
            <Lock className="h-3 w-3" />
            <span>Request Handover</span>
          </button>
        ))}
      </div>
    </div>
  );
}

