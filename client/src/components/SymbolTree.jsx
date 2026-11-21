import React, { useState, useEffect } from "react";
import { 
  FolderTree, 
  FileCode2, 
  ChevronRight, 
  ChevronDown, 
  Lock, 
  Unlock, 
  Clock, 
  AlertCircle,
  Code2
} from "lucide-react";

export function SymbolTree({ 
  files = [], 
  locks = [], 
  selectedFile, 
  selectedSymbol, 
  onSelectFile, 
  onSelectSymbol,
  currentUser 
}) {
  const [openFolders, setOpenFolders] = useState({ src: true });

  const toggleFolder = (folder) => {
    setOpenFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));
  };

  return (
    <div className="w-72 bg-[#141E33] border-r border-[#334155] flex flex-col h-full text-xs select-none">
      {/* Panel Header */}
      <div className="p-3 border-b border-[#334155] flex items-center justify-between">
        <div className="flex items-center space-x-2 text-slate-200 font-semibold tracking-wide">
          <FolderTree className="h-4 w-4 text-indigo-400" />
          <span>PROJECT SYMBOLS</span>
        </div>
        <span className="text-[10px] text-slate-400 bg-[#0F172A] px-1.5 py-0.5 rounded border border-[#334155]">
          {files.reduce((acc, f) => acc + f.symbols.length, 0)} symbols
        </span>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {files.map((file) => {
          const isFileActive = selectedFile?.filePath === file.filePath;

          return (
            <div key={file.filePath} className="space-y-1">
              {/* File Row */}
              <div
                onClick={() => onSelectFile(file)}
                className={`flex items-center space-x-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                  isFileActive 
                    ? "bg-[#1E293B] text-white font-medium border border-[#334155]" 
                    : "text-slate-300 hover:bg-[#1E293B]/50 hover:text-white"
                }`}
              >
                <FileCode2 className={`h-4 w-4 ${isFileActive ? "text-indigo-400" : "text-slate-400"}`} />
                <span className="font-mono truncate flex-1">{file.filePath}</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {file.symbols.length}
                </span>
              </div>

              {/* Symbols under file */}
              <div className="pl-4 space-y-0.5 border-l border-[#334155]/60 ml-2">
                {file.symbols.map((symbol) => {
                  const isSymbolActive = selectedSymbol?.symbolPath === symbol.symbolPath;
                  const activeLock = locks.find((l) => l.symbolPath === symbol.symbolPath);
                  const isLockedByMe = activeLock && activeLock.ownerId === currentUser.id;
                  const isLockedByOther = activeLock && !isLockedByMe;

                  return (
                    <div
                      key={symbol.symbolPath}
                      onClick={() => onSelectSymbol(file, symbol)}
                      className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-all ${
                        isSymbolActive
                          ? "bg-indigo-950/60 border border-indigo-500/50 text-indigo-200"
                          : "text-slate-300 hover:bg-[#1E293B] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <Code2 className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300" />
                        <span className="font-mono text-[11px] truncate" title={symbol.name}>
                          {symbol.name}
                        </span>
                      </div>

                      {/* Status Badges */}
                      <div>
                        {isLockedByMe && (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                            <Lock className="h-2.5 w-2.5" />
                            <span>You</span>
                          </span>
                        )}

                        {isLockedByOther && (
                          <span 
                            className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-950/80 border border-amber-500/40 text-amber-300"
                            title={`Locked by ${activeLock.ownerName}: "${activeLock.intent || 'No intent'}"`}
                          >
                            <Lock className="h-2.5 w-2.5" />
                            <span className="truncate max-w-[50px]">{activeLock.ownerName}</span>
                          </span>
                        )}

                        {!activeLock && (
                          <span className="inline-flex items-center space-x-0.5 px-1 py-0.5 rounded text-[9px] text-slate-500 group-hover:text-emerald-400 transition-colors">
                            <Unlock className="h-2.5 w-2.5" />
                            <span>free</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend Footer */}
      <div className="p-3 border-t border-[#334155] bg-[#0F172A]/70 text-[10px] text-slate-400 space-y-1">
        <div className="font-semibold text-slate-300 uppercase tracking-wider mb-1">
          Lock Legend
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>Locked by you (Leased)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span>Locked by peer (Click to request handover)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-500" />
          <span>Unassigned (Available for immediate lease)</span>
        </div>
      </div>
    </div>
  );
}

