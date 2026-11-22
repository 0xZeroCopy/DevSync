import React, { useState } from "react";
import { 
  FolderTree, 
  FileCode2, 
  ChevronRight, 
  ChevronDown, 
  Lock, 
  Unlock, 
  Code2,
  FilePlus2,
  FolderPlus,
  Trash2,
  GitBranch,
  Check,
  X,
  FileText
} from "lucide-react";

export function SymbolTree({ 
  files = [], 
  locks = [], 
  selectedFile, 
  selectedSymbol, 
  onSelectFile, 
  onSelectSymbol,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  activeProject,
  currentUser 
}) {
  const [openFolders, setOpenFolders] = useState({});
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const toggleFolder = (folder) => {
    setOpenFolders((prev) => ({ ...prev, [folder]: prev[folder] === undefined ? false : !prev[folder] }));
  };

  const handleCreateFileSubmit = (e) => {
    e.preventDefault();
    const trimmed = newFilePath.trim().replace(/^\/+/, "");
    if (!trimmed) return;
    onCreateFile?.(trimmed);
    setNewFilePath("");
    setIsCreatingFile(false);
  };

  const handleCreateFolderSubmit = (e) => {
    e.preventDefault();
    const trimmed = newFolderName.trim().replace(/^\/+|\/+$/g, "");
    if (!trimmed) return;
    onCreateFolder?.(trimmed);
    setNewFolderName("");
    setIsCreatingFolder(false);
  };

  // Group files by root directory (e.g. "src/", "config/", or root files)
  const groupedFiles = files.reduce((acc, file) => {
    const parts = file.filePath.split("/");
    if (parts.length > 1) {
      const folder = parts[0];
      if (!acc[folder]) acc[folder] = [];
      acc[folder].push(file);
    } else {
      if (!acc["_root"]) acc["_root"] = [];
      acc["_root"].push(file);
    }
    return acc;
  }, {});

  const totalSymbols = files.reduce((acc, f) => acc + (f.symbols?.length || 0), 0);

  return (
    <div className="w-72 bg-[#141E33] border-r border-[#334155] flex flex-col h-full text-xs select-none">
      {/* 1. Repository Info Header */}
      <div className="p-3 border-b border-[#334155] bg-[#0F172A]/60">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-1.5 min-w-0">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-bold text-white truncate text-xs">
              {activeProject?.name || "Workspace Repository"}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 bg-[#0F172A] px-1.5 py-0.5 rounded border border-[#334155] font-mono">
            {files.length} files
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-1 text-slate-400 font-mono text-[10px]">
            <GitBranch className="h-3 w-3 text-indigo-400" />
            <span>{activeProject?.defaultBranch || "main"}</span>
          </div>

          {/* Create File & Folder Action Buttons */}
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => {
                setIsCreatingFile(true);
                setIsCreatingFolder(false);
              }}
              title="Create New File"
              className="p-1 rounded hover:bg-[#1E293B] text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreatingFolder(true);
                setIsCreatingFile(false);
              }}
              title="Create New Folder"
              className="p-1 rounded hover:bg-[#1E293B] text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Inline New File Creator */}
      {isCreatingFile && (
        <form onSubmit={handleCreateFileSubmit} className="p-2 border-b border-[#334155] bg-[#1E293B]/90 animate-in fade-in duration-150">
          <div className="text-[10px] font-semibold text-indigo-300 mb-1 flex items-center justify-between">
            <span>NEW FILE PATH:</span>
            <button 
              type="button" 
              onClick={() => setIsCreatingFile(false)} 
              className="text-slate-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="flex items-center space-x-1.5">
            <input
              type="text"
              value={newFilePath}
              onChange={(e) => setNewFilePath(e.target.value)}
              placeholder="e.g. src/service.py, utils.js"
              className="flex-1 px-2 py-1 bg-[#0F172A] border border-[#334155] focus:border-indigo-500 rounded text-[11px] text-white outline-none font-mono"
              autoFocus
            />
            <button
              type="submit"
              className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="text-[9px] text-slate-500 mt-1">
            Extensions supported: .py, .js, .ts, .json, .md, .rs, .go
          </div>
        </form>
      )}

      {/* 3. Inline New Folder Creator */}
      {isCreatingFolder && (
        <form onSubmit={handleCreateFolderSubmit} className="p-2 border-b border-[#334155] bg-[#1E293B]/90 animate-in fade-in duration-150">
          <div className="text-[10px] font-semibold text-emerald-300 mb-1 flex items-center justify-between">
            <span>NEW FOLDER NAME:</span>
            <button 
              type="button" 
              onClick={() => setIsCreatingFolder(false)} 
              className="text-slate-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="flex items-center space-x-1.5">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. controllers, models, utils"
              className="flex-1 px-2 py-1 bg-[#0F172A] border border-[#334155] focus:border-emerald-500 rounded text-[11px] text-white outline-none font-mono"
              autoFocus
            />
            <button
              type="submit"
              className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      )}

      {/* 4. Explorer Tree Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {files.length === 0 ? (
          <div className="text-center py-8 px-4 text-slate-500">
            <FileCode2 className="h-8 w-8 mx-auto mb-2 text-slate-600" />
            <p className="text-xs">No files in this repository yet.</p>
            <button
              type="button"
              onClick={() => setIsCreatingFile(true)}
              className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors cursor-pointer"
            >
              + Create First File
            </button>
          </div>
        ) : (
          Object.entries(groupedFiles).map(([folderName, folderFiles]) => {
            if (folderName === "_root") {
              // Root level files
              return folderFiles.map((file) => renderFileItem(file));
            }

            // Folder Group
            const isOpen = openFolders[folderName] !== false; // open by default

            return (
              <div key={folderName} className="space-y-1">
                {/* Folder Header */}
                <div
                  onClick={() => toggleFolder(folderName)}
                  className="flex items-center space-x-1.5 px-2 py-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]/40 cursor-pointer font-mono font-medium text-[11px]"
                >
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  <FolderTree className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="truncate flex-1">{folderName}/</span>
                  <span className="text-[10px] text-slate-600 font-mono">{folderFiles.length}</span>
                </div>

                {/* Folder Files */}
                {isOpen && (
                  <div className="pl-2 space-y-1">
                    {folderFiles.map((file) => renderFileItem(file))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. Legend Footer */}
      <div className="p-3 border-t border-[#334155] bg-[#0F172A]/70 text-[10px] text-slate-400 space-y-1">
        <div className="font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
          <span>Lock Status</span>
          <span className="font-mono text-[9px] text-slate-500">{totalSymbols} symbols</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
          <span>Locked by you (Editing)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
          <span>Locked by peer (Request handover)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-500 shrink-0" />
          <span>Available for immediate lock</span>
        </div>
      </div>
    </div>
  );

  // Helper to render individual file + its symbols
  function renderFileItem(file) {
    const isFileActive = selectedFile?.filePath === file.filePath;

    return (
      <div key={file.filePath} className="space-y-0.5">
        {/* File Row */}
        <div
          onClick={() => onSelectFile(file)}
          className={`group flex items-center space-x-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
            isFileActive 
              ? "bg-[#1E293B] text-white font-medium border border-[#334155]" 
              : "text-slate-300 hover:bg-[#1E293B]/50 hover:text-white"
          }`}
        >
          {file.filePath.endsWith(".md") ? (
            <FileText className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          ) : (
            <FileCode2 className={`h-3.5 w-3.5 shrink-0 ${isFileActive ? "text-indigo-400" : "text-slate-400"}`} />
          )}
          <span className="font-mono truncate flex-1 text-[11px]">{file.filePath}</span>
          
          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-slate-500 font-mono">
              {file.symbols?.length || 0}
            </span>
            {/* Delete File Button */}
            {onDeleteFile && files.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete "${file.filePath}"?`)) {
                    onDeleteFile(file.filePath);
                  }
                }}
                title="Delete file"
                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Symbols list under file */}
        {file.symbols && file.symbols.length > 0 && (
          <div className="pl-3.5 space-y-0.5 border-l border-[#334155]/60 ml-2">
            {file.symbols.map((symbol) => {
              const isSymbolActive = selectedSymbol?.symbolPath === symbol.symbolPath;
              const activeLock = locks.find((l) => l.symbolPath === symbol.symbolPath);
              const isLockedByMe = activeLock && activeLock.ownerId === currentUser.id;
              const isLockedByOther = activeLock && !isLockedByMe;

              return (
                <div
                  key={symbol.symbolPath}
                  onClick={() => onSelectSymbol(file, symbol)}
                  className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-all ${
                    isSymbolActive
                      ? "bg-indigo-950/70 border border-indigo-500/50 text-indigo-200"
                      : "text-slate-300 hover:bg-[#1E293B] hover:text-white"
                  }`}
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    <Code2 className="h-3 w-3 text-slate-500 group-hover:text-slate-300 shrink-0" />
                    <span className="font-mono text-[11px] truncate" title={symbol.name}>
                      {symbol.name}
                    </span>
                  </div>

                  {/* Status Badges */}
                  <div>
                    {isLockedByMe && (
                      <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                        <Lock className="h-2 w-2" />
                        <span>You</span>
                      </span>
                    )}

                    {isLockedByOther && (
                      <span 
                        className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-950/80 border border-amber-500/40 text-amber-300"
                        title={`Locked by ${activeLock.ownerName}: "${activeLock.intent || 'No intent'}"`}
                      >
                        <Lock className="h-2 w-2" />
                        <span className="truncate max-w-[45px]">{activeLock.ownerName}</span>
                      </span>
                    )}

                    {!activeLock && (
                      <span className="inline-flex items-center space-x-0.5 px-1 py-0.2 rounded text-[9px] text-slate-500 group-hover:text-emerald-400 transition-colors">
                        <Unlock className="h-2 w-2" />
                        <span>free</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}
