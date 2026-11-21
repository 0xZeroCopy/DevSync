import React, { useState } from "react";
import { Header } from "./components/Header";
import { SymbolTree } from "./components/SymbolTree";
import { CodeCanvas } from "./components/CodeCanvas";
import { HandoverModal, IncomingHandoverBanner } from "./components/HandoverModal";
import { BottomDrawer } from "./components/EventAuditDrawer";
import { CallGraphAlert } from "./components/CallGraphAlert";
import { useDevSyncSocket } from "./hooks/useDevSyncSocket";
import { MOCK_PROJECT_FILES, MOCK_DEVELOPERS } from "./data/mockFiles";
import { AlertCircle, X } from "lucide-react";

export function App() {
  const [currentUser, setCurrentUser] = useState(MOCK_DEVELOPERS[1]); // Default to Tanmay
  const [selectedFile, setSelectedFile] = useState(MOCK_PROJECT_FILES[0]);
  const [selectedSymbol, setSelectedSymbol] = useState(MOCK_PROJECT_FILES[0].symbols[0]);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("ACQUIRE"); // "ACQUIRE" | "REQUEST_HANDOVER"
  const [targetLock, setTargetLock] = useState(null);

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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0F172A] text-slate-100 font-sans">
      {/* 1. Global Header with WebSocket status, lock telemetry, and developer switcher */}
      <Header
        isConnected={isConnected}
        currentUser={currentUser}
        onSelectUser={setCurrentUser}
        locks={locks}
        onRefresh={refreshState}
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
