import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Custom hook connecting to DevSync WebSocket server (`ws://localhost:8080`).
 * Handles auto-reconnect, snapshot parsing, heartbeat loop, and telemetry logging.
 */
export function useDevSyncSocket(wsUrl = "ws://localhost:8080", currentUser) {
  const [isConnected, setIsConnected] = useState(false);
  const [locks, setLocks] = useState([]);
  const [events, setEvents] = useState([]);
  const [lastError, setLastError] = useState(null);
  const [latency, setLatency] = useState(12);
  const [handoverAlert, setHandoverAlert] = useState(null);

  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatTimerRef = useRef(null);

  const logEvent = useCallback((type, payload, direction = "IN") => {
    const entry = {
      id: "ev_" + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      direction,
      type,
      payload,
    };
    setEvents((prev) => [entry, ...prev.slice(0, 49)]); // keep last 50 events
  }, []);

  const send = useCallback((payload) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
      logEvent(payload.type, payload, "OUT");
      return true;
    } else {
      console.warn("WebSocket not connected; unable to send:", payload);
      return false;
    }
  }, [logEvent]);

  // Connect & message dispatcher
  useEffect(() => {
    let unmounted = false;

    function connect() {
      if (unmounted) return;
      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (unmounted) return;
          setIsConnected(true);
          setLastError(null);
          // Request initial state if server didn't push it
          send({ type: "GET_STATE" });
        };

        ws.onmessage = (event) => {
          if (unmounted) return;
          try {
            const data = JSON.parse(event.data);
            logEvent(data.type, data, "IN");

            switch (data.type) {
              case "STATE_SNAPSHOT":
                setLocks(data.locks || []);
                break;

              case "LOCK_ACQUIRED":
                setLocks((prev) => {
                  const filtered = prev.filter((l) => l.symbolPath !== data.symbolPath);
                  return [...filtered, data];
                });
                break;

              case "LOCK_RELEASED":
                setLocks((prev) => prev.filter((l) => l.symbolPath !== data.symbolPath));
                break;

              case "LOCK_RENEWED":
                setLocks((prev) =>
                  prev.map((l) =>
                    l.symbolPath === data.symbolPath ? { ...l, expiresAt: data.expiresAt } : l
                  )
                );
                break;

              case "LOCK_DENIED":
                setLastError({
                  type: "LOCK_DENIED",
                  reason: data.reason,
                  holder: data.holder,
                  symbolPath: data.symbolPath,
                });
                break;

              case "HANDOVER_REQUEST":
                if (data.toUserId === currentUser?.id) {
                  setHandoverAlert(data);
                }
                break;

              case "HANDOVER_DECLINED":
                setLastError({
                  type: "HANDOVER_DECLINED",
                  reason: data.reason || "Holder declined handover request",
                });
                break;

              case "ERROR":
                setLastError({ type: "ERROR", reason: data.reason });
                break;

              default:
                break;
            }
          } catch (err) {
            console.error("Failed to parse incoming WebSocket message", err);
          }
        };

        ws.onerror = (err) => {
          if (unmounted) return;
          setLastError({ type: "WS_ERROR", message: "Failed to connect to " + wsUrl });
        };

        ws.onclose = () => {
          if (unmounted) return;
          setIsConnected(false);
          // Auto-reconnect after 2.5s
          reconnectTimeoutRef.current = setTimeout(connect, 2500);
        };
      } catch (err) {
        if (!unmounted) {
          setIsConnected(false);
          reconnectTimeoutRef.current = setTimeout(connect, 2500);
        }
      }
    }

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [wsUrl, currentUser?.id, logEvent, send]);

  // Periodic Heartbeat loop: if current user holds an active lock, ping every 5 seconds
  useEffect(() => {
    if (!isConnected || !currentUser) return;

    heartbeatTimerRef.current = setInterval(() => {
      const myLock = locks.find((l) => l.ownerId === currentUser.id);
      if (myLock) {
        send({
          type: "HEARTBEAT",
          symbolPath: myLock.symbolPath,
          ownerId: currentUser.id,
        });
      }
    }, 5000);

    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, [isConnected, currentUser, locks, send]);

  // Public helper methods
  const acquireLock = useCallback(
    (file, symbol, intent) => {
      setLastError(null);
      send({
        type: "ACQUIRE_LOCK",
        filePath: file.filePath,
        symbolPath: symbol.symbolPath,
        startOffset: symbol.startOffset,
        endOffset: symbol.endOffset,
        ownerId: currentUser.id,
        ownerName: currentUser.name,
        intent: intent || "Active symbol edit",
      });
    },
    [currentUser, send]
  );

  const releaseLock = useCallback(
    (symbolPath) => {
      setLastError(null);
      send({
        type: "RELEASE_LOCK",
        symbolPath,
        ownerId: currentUser.id,
      });
    },
    [currentUser, send]
  );

  const requestHandover = useCallback(
    (lock, note) => {
      setLastError(null);
      send({
        type: "HANDOVER_REQUEST",
        requestId: "ho_" + Date.now().toString(36),
        filePath: lock.filePath,
        symbolPath: lock.symbolPath,
        fromUserId: currentUser.id,
        fromUserName: currentUser.name,
        toUserId: lock.ownerId,
        note: note || "Need to edit this symbol next",
      });
    },
    [currentUser, send]
  );

  const respondHandover = useCallback(
    (requestId, symbolPath, accepted, nextIntent) => {
      send({
        type: "HANDOVER_RESPONSE",
        requestId,
        symbolPath,
        accepted,
        nextIntent,
      });
      setHandoverAlert(null);
    },
    [send]
  );

  return {
    isConnected,
    locks,
    events,
    lastError,
    setLastError,
    latency,
    handoverAlert,
    setHandoverAlert,
    acquireLock,
    releaseLock,
    requestHandover,
    respondHandover,
    refreshState: () => send({ type: "GET_STATE" }),
  };
}

