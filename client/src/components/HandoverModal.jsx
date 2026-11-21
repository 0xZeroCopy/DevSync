import React, { useState } from "react";
import { 
  Lock, 
  Send, 
  X, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  ShieldAlert
} from "lucide-react";

export function HandoverModal({
  isOpen,
  mode = "ACQUIRE", // "ACQUIRE" | "REQUEST_HANDOVER"
  file,
  symbol,
  activeLock,
  currentUser,
  onClose,
  onAcquire,
  onRequestHandover,
}) {
  const [intent, setIntent] = useState("");
  const [note, setNote] = useState("");

  if (!isOpen || !symbol) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "ACQUIRE") {
      onAcquire(file, symbol, intent || "Symbol refactoring and tests");
    } else {
      onRequestHandover(activeLock, note || "Need to wire subsequent handler logic");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div 
        className="w-full max-w-md bg-[#1E293B] border border-[#475569] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#334155] flex items-center justify-between bg-[#141E33]">
          <div className="flex items-center space-x-2">
            {mode === "ACQUIRE" ? (
              <div className="p-1.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                <Lock className="h-4 w-4" />
              </div>
            ) : (
              <div className="p-1.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
                <AlertTriangle className="h-4 w-4" />
              </div>
            )}
            <h3 className="font-semibold text-sm text-white">
              {mode === "ACQUIRE" ? "Acquire Symbol Lock" : "Request Lock Handover"}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#334155] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Target Symbol Info */}
          <div className="p-3 rounded bg-[#0F172A] border border-[#334155] space-y-1 font-mono">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Target Symbol</div>
            <div className="text-indigo-300 font-semibold truncate">{symbol.symbolPath}</div>
            <div className="text-slate-400 text-[11px] flex justify-between pt-1 border-t border-[#1E293B]">
              <span>Offsets: {symbol.startOffset}–{symbol.endOffset}</span>
              <span>Lines: {symbol.startLine}–{symbol.endLine}</span>
            </div>
          </div>

          {mode === "ACQUIRE" ? (
            <div className="space-y-1.5">
              <label className="block text-slate-200 font-medium">
                Intent Description <span className="text-indigo-400">*</span>
              </label>
              <p className="text-[11px] text-slate-400">
                Broadcast to other developers so they know what change you are making.
              </p>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Adding token expiry check and rate limiting"
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#0F172A] border border-[#475569] text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                required
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-2.5 rounded bg-amber-950/30 border border-amber-600/30 text-amber-200 text-[11px]">
                <div className="font-semibold flex items-center space-x-1">
                  <span>Currently held by:</span>
                  <span className="text-amber-300 font-bold underline">{activeLock?.ownerName}</span>
                </div>
                <div className="text-slate-300 mt-1 italic">
                  "{activeLock?.intent || 'No intent provided'}"
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-200 font-medium">
                  Handover Note <span className="text-amber-400">*</span>
                </label>
                <textarea
                  rows={3}
                  autoFocus
                  placeholder="Need to wire login error handling right after your change..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#0F172A] border border-[#475569] text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                  required
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-[#475569] text-slate-300 hover:bg-[#334155] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-1.5 rounded font-semibold text-white flex items-center space-x-1.5 transition-colors cursor-pointer ${
                mode === "ACQUIRE"
                  ? "bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-900/50"
                  : "bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-900/50"
              }`}
            >
              <span>{mode === "ACQUIRE" ? "Claim 30s Lease" : "Send Handover Request"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Banner shown to a lock holder when an incoming Handover Request arrives
 */
export function IncomingHandoverBanner({ alert, onAccept, onDecline }) {
  if (!alert) return null;

  return (
    <div className="bg-amber-950/90 border-b border-amber-500 px-4 py-3 flex items-center justify-between text-xs animate-in slide-in-from-top-2 duration-200 shadow-lg z-40">
      <div className="flex items-center space-x-3">
        <div className="p-1 rounded-full bg-amber-400 text-slate-950">
          <ShieldAlert className="h-4 w-4" />
        </div>
        <div>
          <span className="font-bold text-amber-200">
            {alert.fromUserName} requested handover of lock:
          </span>{" "}
          <span className="font-mono text-white underline">{alert.symbolPath}</span>
          <div className="text-slate-300 italic text-[11px] mt-0.5">
            "{alert.note}"
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onDecline(alert.requestId, alert.symbolPath)}
          className="px-3 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600 transition-colors cursor-pointer flex items-center space-x-1"
        >
          <XCircle className="h-3.5 w-3.5 text-rose-400" />
          <span>Decline</span>
        </button>
        <button
          onClick={() => onAccept(alert.requestId, alert.symbolPath, alert.note)}
          className="px-3 py-1 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-500 shadow transition-colors cursor-pointer flex items-center space-x-1"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Accept & Transfer</span>
        </button>
      </div>
    </div>
  );
}

