import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { 
  Lock, 
  Unlock, 
  Clock, 
  Share2, 
  FileCode, 
  CheckCircle, 
  Copy,
  ShieldAlert
} from "lucide-react";

export function CodeCanvas({
  file,
  selectedSymbol,
  locks = [],
  currentUser,
  onOpenAcquire,
  onOpenHandover,
  onReleaseLock,
  onUpdateCode,
}) {
  const [copied, setCopied] = useState(false);
  const [readOnlyWarning, setReadOnlyWarning] = useState(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0F172A] text-slate-500 text-xs">
        Select a file from the explorer to preview source and lock states
      </div>
    );
  }

  const activeLock = selectedSymbol ? locks.find((l) => l.symbolPath === selectedSymbol.symbolPath) : null;
  const isLockedByMe = activeLock && activeLock.ownerId === currentUser.id;
  const isLockedByOther = activeLock && !isLockedByMe;

  // Lease countdown timer for the selected symbol's lock
  const [leaseSeconds, setLeaseSeconds] = useState(0);

  useEffect(() => {
    if (!activeLock || !activeLock.expiresAt) {
      setLeaseSeconds(0);
      return;
    }
    const update = () => {
      setLeaseSeconds(Math.max(0, Math.ceil((activeLock.expiresAt - Date.now()) / 1000)));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [activeLock]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(file.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Configure Monaco Editor Theme and Decorations
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.editor.defineTheme("devsync-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "64748B", fontStyle: "italic" },
        { token: "keyword", foreground: "818CF8", fontStyle: "bold" },
        { token: "string", foreground: "34D399" },
        { token: "number", foreground: "F59E0B" },
        { token: "type", foreground: "38BDF8" },
      ],
      colors: {
        "editor.background": "#0F172A",
        "editor.foreground": "#F8FAFC",
        "editorLineNumber.foreground": "#475569",
        "editorLineNumber.activeForeground": "#818CF8",
        "editorGutter.background": "#0F172A",
        "editor.lineHighlightBackground": "#1E293B33",
        "editor.selectionBackground": "#334155",
        "editorCursor.foreground": "#22C55E",
      },
    });

    monaco.editor.setTheme("devsync-dark");

    // Guard locked symbol ranges against unauthorized edits
    editor.onKeyDown((e) => {
      const position = editor.getPosition();
      if (!position) return;

      // Check if cursor is inside any symbol locked by a peer
      const lockedSymbol = file.symbols.find((s) => {
        const l = locks.find((lk) => lk.symbolPath === s.symbolPath);
        return l && l.ownerId !== currentUser.id && position.lineNumber >= s.startLine && position.lineNumber <= s.endLine;
      });

      if (lockedSymbol) {
        // Prevent key modifications in locked range (allow navigation keys)
        const allowedCodes = [15, 16, 17, 18, 33, 34, 35, 36, 37, 38, 39, 40]; // arrows, shift, ctrl
        if (!allowedCodes.includes(e.keyCode)) {
          e.preventDefault();
          e.stopPropagation();
          const lock = locks.find((l) => l.symbolPath === lockedSymbol.symbolPath);
          setReadOnlyWarning(
            `Symbol "${lockedSymbol.name}" is locked by ${lock?.ownerName || 'a teammate'}. Request handover to edit.`
          );
          setTimeout(() => setReadOnlyWarning(null), 3500);
        }
      }
    });

    updateDecorations();
  };

  // Update Monaco decorations for locks and selected symbol
  const updateDecorations = () => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const newDecorations = [];

    file.symbols.forEach((symbol) => {
      const lock = locks.find((l) => l.symbolPath === symbol.symbolPath);
      const isSelected = selectedSymbol && selectedSymbol.symbolPath === symbol.symbolPath;

      if (lock) {
        const isMine = lock.ownerId === currentUser.id;
        newDecorations.push({
          range: new monaco.Range(symbol.startLine, 1, symbol.endLine, 1),
          options: {
            isWholeLine: true,
            className: isMine ? "bg-emerald-950/20" : "bg-amber-950/20",
            glyphMarginClassName: isMine ? "monaco-glyph-lock-mine" : "monaco-glyph-lock-peer",
            glyphMarginHoverMessage: {
              value: `**Locked by ${lock.ownerName}**\n\nIntent: "${lock.intent || "Editing"}"`,
            },
          },
        });
      }

      if (isSelected && !lock) {
        newDecorations.push({
          range: new monaco.Range(symbol.startLine, 1, symbol.endLine, 1),
          options: {
            isWholeLine: true,
            className: "bg-indigo-950/30 border-l-2 border-indigo-500",
          },
        });
      }
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  };

  useEffect(() => {
    updateDecorations();
  }, [locks, selectedSymbol, file]);

  // Jump to symbol in Monaco when selected
  useEffect(() => {
    if (editorRef.current && selectedSymbol) {
      editorRef.current.revealLineInCenter(selectedSymbol.startLine);
      editorRef.current.setPosition({ lineNumber: selectedSymbol.startLine, column: 1 });
    }
  }, [selectedSymbol]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0F172A] overflow-hidden text-xs">
      {/* Code Canvas Toolbar */}
      <div className="h-10 bg-[#141E33] border-b border-[#334155] px-4 flex items-center justify-between select-none">
        <div className="flex items-center space-x-2">
          <FileCode className="h-4 w-4 text-indigo-400" />
          <span className="font-mono text-slate-200 font-semibold">{file.filePath}</span>
          <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-[#0F172A] border border-[#334155] uppercase font-mono">
            Monaco • {file.language}
          </span>
          {selectedSymbol && (
            <span className="text-slate-400 text-[11px] font-mono flex items-center space-x-1 pl-2 border-l border-[#334155]">
              <span>AST:</span>
              <span className="text-indigo-300 font-bold">{selectedSymbol.name}</span>
            </span>
          )}
        </div>

        {/* Action Controls for Selected Symbol */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-slate-300 border border-[#334155] transition-colors cursor-pointer text-[11px]"
          >
            {copied ? <CheckCircle className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? "Copied" : "Copy Source"}</span>
          </button>

          {selectedSymbol && (
            <>
              {isLockedByMe && (
                <button
                  onClick={() => onReleaseLock(selectedSymbol.symbolPath)}
                  className="flex items-center space-x-1.5 px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-xs transition-colors cursor-pointer"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  <span>Release Lock</span>
                </button>
              )}

              {isLockedByOther && (
                <button
                  onClick={() => onOpenHandover(selectedSymbol, activeLock)}
                  className="flex items-center space-x-1.5 px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-xs transition-colors cursor-pointer animate-pulse"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Request Handover</span>
                </button>
              )}

              {!activeLock && (
                <button
                  onClick={() => onOpenAcquire(file, selectedSymbol)}
                  className="flex items-center space-x-1.5 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-xs transition-colors cursor-pointer"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Acquire Lock</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Read-Only Protection Toast when user tries to type in peer-locked AST range */}
      {readOnlyWarning && (
        <div className="bg-rose-950/90 border-b border-rose-500 px-4 py-2 flex items-center space-x-2 text-rose-200 text-xs animate-in slide-in-from-top-1">
          <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
          <span className="font-semibold">{readOnlyWarning}</span>
        </div>
      )}

      {/* Floating Intent Banner if selected symbol is locked */}
      {selectedSymbol && activeLock && (
        <div className={`px-4 py-2 border-b select-none flex items-center justify-between transition-colors ${
          isLockedByMe 
            ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-200" 
            : "bg-amber-950/70 border-amber-500/50 text-amber-200"
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-1.5 rounded-full ${isLockedByMe ? "bg-emerald-500 text-slate-950" : "bg-amber-500 text-slate-950"}`}>
              <Lock className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="font-semibold text-xs flex items-center space-x-2">
                <span>{isLockedByMe ? "You hold this symbol lock" : `Locked by ${activeLock.ownerName}`}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 border border-white/10 font-mono">
                  {selectedSymbol.symbolPath}
                </span>
              </div>
              <div className="text-[11px] text-slate-200 mt-0.5">
                <span className="font-medium text-slate-400">Declared Intent:</span>{" "}
                <span className="italic font-sans">"{activeLock.intent || 'No intent provided'}"</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Lease TTL</div>
              <div className="font-mono font-bold text-xs flex items-center space-x-1 justify-end">
                <Clock className="h-3 w-3" />
                <span>{leaseSeconds}s remaining</span>
              </div>
            </div>
            <div className="w-16 h-2 bg-black/50 rounded-full overflow-hidden border border-white/20">
              <div 
                className={`h-full transition-all duration-1000 ${isLockedByMe ? "bg-emerald-400" : "bg-amber-400"}`}
                style={{ width: `${Math.min(100, (leaseSeconds / 30) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Monaco Editor Container */}
      <div className="flex-1 relative overflow-hidden">
        <Editor
          height="100%"
          language={file.language}
          value={file.code}
          onChange={(value) => onUpdateCode?.(value || "")}
          theme="devsync-dark"
          options={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 13,
            lineHeight: 22,
            minimap: { enabled: true },
            glyphMargin: true,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            automaticLayout: true,
            tabSize: 4,
            renderWhitespace: "selection",
          }}
          onMount={handleEditorDidMount}
        />
      </div>
    </div>
  );
}
