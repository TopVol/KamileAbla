const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = 3000;
const WORLD = { width: 96, height: 72, tickMs: 80 };
const players = {};

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "multiplayer.html"));
});
app.use(express.static(path.join(__dirname, "public")));

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function randomSpawn() {
  return {
    x: Math.floor(Math.random() * (WORLD.width - 20)) + 10,
    y: Math.floor(Math.random() * (WORLD.height - 20)) + 10
  };
}

function randomColor() {
  const palette = ["#63a4ff", "#ff7a7a", "#63e6be", "#ffd166", "#c77dff", "#ff9f1c"];
  return palette[Math.floor(Math.random() * palette.length)];
}

io.on("connection", (socket) => {
  const spawn = randomSpawn();
  players[socket.id] = {
    id: socket.id,
    name: "Player",
    color: randomColor(),
    x: spawn.x,
    y: spawn.y,
    dir: "right",
    trail: [{ x: spawn.x, y: spawn.y }],
    alive: true
  };

  socket.emit("init", {
    id: socket.id,
    world: WORLD,
    tickMs: WORLD.tickMs
  });

  socket.on("setName", (name) => {
    if (players[socket.id]) players[socket.id].name = String(name || "Player").trim().slice(0, 20) || "Player";
  });

  socket.on("move", (dir) => {
    const p = players[socket.id];
    if (!p || !p.alive) return;
    if (["up", "down", "left", "right"].includes(dir)) p.dir = dir;
  });

  socket.on("respawn", () => {
    const p = players[socket.id];
    if (!p) return;
    const spawn2 = randomSpawn();
    p.x = spawn2.x;
    p.y = spawn2.y;
    p.dir = "right";
    p.trail = [{ x: p.x, y: p.y }];
    p.alive = true;
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
  });
});

setInterval(() => {
  Object.values(players).forEach((p) => {
    if (!p.alive) return;

    if (p.dir === "up") p.y -= 1;
    if (p.dir === "down") p.y += 1;
    if (p.dir === "left") p.x -= 1;
    if (p.dir === "right") p.x += 1;

    p.x = clamp(p.x, 0, WORLD.width - 1);
    p.y = clamp(p.y, 0, WORLD.height - 1);

    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 18) p.trail.shift();
  });

  const list = Object.values(players);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (a.alive && b.alive && a.x === b.x && a.y === b.y) {
        a.alive = false;
        b.alive = false;
      }
    }
  }

  io.emit("world", {
    world: WORLD,
    players: Object.values(players)
  });
}, WORLD.tickMs);

server.listen(PORT, () => {
  console.log(`Socket sandbox v2 läuft auf http://localhost:${PORT}`);
});
