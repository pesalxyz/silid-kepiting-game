import http from "node:http";
import { WebSocketServer } from "ws";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT || 8787);
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }

  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end("Impostor Kepiting online server is running.");
});

const wss = new WebSocketServer({ noServer: true });

const rooms = new Map();

function normalizeName(name) {
  const clean = String(name || "").trim();
  return clean || "Pemain";
}

function makeRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function send(ws, type, payload = {}) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify({ type, ...payload }));
}

function getPeers(room) {
  return room.members.map((m) => ({ clientId: m.clientId, name: m.name, isHost: m.clientId === room.hostId }));
}

function broadcastPeers(room) {
  const peers = getPeers(room);
  room.members.forEach((m) => send(m.ws, "peers_update", { roomCode: room.code, peers }));
}

function broadcastState(room, senderId, snapshot) {
  room.members.forEach((m) => send(m.ws, "state_update", { roomCode: room.code, senderId, snapshot }));
}

function joinRoom(ws, roomCode, playerName) {
  const room = rooms.get(roomCode);
  if (!room) {
    send(ws, "server_error", { message: "Room tidak ditemukan." });
    return;
  }

  if (room.members.find((m) => m.clientId === ws.clientId)) return;

  room.members.push({ ws, clientId: ws.clientId, name: normalizeName(playerName) });
  ws.roomCode = roomCode;

  send(ws, "room_joined", {
    roomCode,
    isHost: ws.clientId === room.hostId,
    clientId: ws.clientId,
    peers: getPeers(room),
    snapshot: room.snapshot || null
  });

  broadcastPeers(room);
}

function createRoom(ws, playerName) {
  let code = makeRoomCode();
  while (rooms.has(code)) code = makeRoomCode();

  const room = {
    code,
    hostId: ws.clientId,
    members: [{ ws, clientId: ws.clientId, name: normalizeName(playerName) }],
    snapshot: null
  };

  rooms.set(code, room);
  ws.roomCode = code;

  send(ws, "room_created", {
    roomCode: code,
    isHost: true,
    clientId: ws.clientId,
    peers: getPeers(room)
  });
}

function leaveCurrentRoom(ws) {
  const roomCode = ws.roomCode;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  ws.roomCode = null;
  if (!room) return;

  room.members = room.members.filter((m) => m.clientId !== ws.clientId);

  if (!room.members.length) {
    rooms.delete(roomCode);
    return;
  }

  if (room.hostId === ws.clientId) {
    room.hostId = room.members[0].clientId;
    room.members.forEach((m) => send(m.ws, "host_changed", { roomCode, hostId: room.hostId }));
  }

  broadcastPeers(room);
}

wss.on("connection", (ws) => {
  ws.clientId = randomUUID();
  ws.roomCode = null;

  send(ws, "hello", { clientId: ws.clientId });

  ws.on("message", (buf) => {
    let msg;
    try {
      msg = JSON.parse(String(buf));
    } catch {
      send(ws, "server_error", { message: "Payload tidak valid." });
      return;
    }

    if (msg.type === "create_room") {
      leaveCurrentRoom(ws);
      createRoom(ws, msg.playerName);
      return;
    }

    if (msg.type === "join_room") {
      const roomCode = String(msg.roomCode || "").toUpperCase().trim();
      if (!roomCode) {
        send(ws, "server_error", { message: "Room code kosong." });
        return;
      }
      leaveCurrentRoom(ws);
      joinRoom(ws, roomCode, msg.playerName);
      return;
    }

    if (msg.type === "state_sync") {
      const roomCode = String(msg.roomCode || "").toUpperCase().trim();
      const room = rooms.get(roomCode);
      if (!room || ws.roomCode !== roomCode) {
        send(ws, "server_error", { message: "Anda belum join room ini." });
        return;
      }
      room.snapshot = msg.snapshot || null;
      broadcastState(room, ws.clientId, room.snapshot);
      return;
    }

    if (msg.type === "player_action") {
      const roomCode = String(msg.roomCode || "").toUpperCase().trim();
      const room = rooms.get(roomCode);
      if (!room || ws.roomCode !== roomCode) {
        send(ws, "server_error", { message: "Anda belum join room ini." });
        return;
      }
      const host = room.members.find((m) => m.clientId === room.hostId);
      if (!host) return;
      send(host.ws, "player_action", {
        roomCode,
        senderId: ws.clientId,
        action: msg.action || null
      });
    }
  });

  ws.on("close", () => leaveCurrentRoom(ws));
});

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

server.listen(PORT, () => {
  console.log(`[online-server] listening on :${PORT}`);
});
