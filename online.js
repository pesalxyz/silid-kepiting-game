function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function createOnlineClient(handlers = {}) {
  let ws = null;
  let url = "";

  function emit(name, payload) {
    const fn = handlers[name];
    if (typeof fn === "function") fn(payload);
  }

  function isConnected() {
    return ws && ws.readyState === WebSocket.OPEN;
  }

  function send(type, payload = {}) {
    if (!isConnected()) return false;
    ws.send(JSON.stringify({ type, ...payload }));
    return true;
  }

  function connect(nextUrl) {
    if (isConnected() && url === nextUrl) return true;
    if (ws && ws.readyState === WebSocket.CONNECTING) return true;
    if (ws) ws.close();

    url = nextUrl;
    ws = new WebSocket(url);

    ws.addEventListener("open", () => emit("onOpen"));
    ws.addEventListener("close", () => emit("onClose"));
    ws.addEventListener("error", (event) => emit("onError", event));
    ws.addEventListener("message", (event) => {
      const msg = safeParse(event.data);
      if (!msg?.type) return;

      if (msg.type === "room_created" || msg.type === "room_joined") {
        emit("onRoom", msg);
        return;
      }
      if (msg.type === "state_update") {
        emit("onState", msg);
        return;
      }
      if (msg.type === "peers_update") {
        emit("onPeers", msg);
        return;
      }
      if (msg.type === "host_changed") {
        emit("onHostChanged", msg);
        return;
      }
      if (msg.type === "server_error") {
        emit("onServerError", msg);
      }
    });

    return true;
  }

  function disconnect() {
    if (ws) ws.close();
    ws = null;
  }

  return {
    connect,
    disconnect,
    isConnected,
    createRoom(playerName) {
      return send("create_room", { playerName });
    },
    joinRoom(roomCode, playerName) {
      return send("join_room", { roomCode, playerName });
    },
    publishState(roomCode, snapshot) {
      return send("state_sync", { roomCode, snapshot });
    }
  };
}
