const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, "public")));

const players = {};
const WORLD = {
  width: 80,
  height: 80,
  speed: 1
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

io.on("connection", (socket) => {
  players[socket.id] = {
    id: socket.id,
    name: "Player",
    color: `hsl(${Math.floor(Math.random() * 360)} 80% 60%)`,
    x: Math.floor(Math.random() * 60) + 10,
    y: Math.floor(Math.random() * 60) + 10,
    dir: "right"
  };

  socket.emit("init", { id: socket.id, world: WORLD });

  socket.on("setName", (name) => {
    if (players[socket.id]) players[socket.id].name = String(name || "Player").slice(0, 20);
  });

  socket.on("move", (dir) => {
    const p = players[socket.id];
    if (!p) return;
    if (["up", "down", "left", "right"].includes(dir)) p.dir = dir;
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
  });
});

setInterval(() => {
  Object.values(players).forEach((p) => {
    if (p.dir === "up") p.y -= WORLD.speed;
    if (p.dir === "down") p.y += WORLD.speed;
    if (p.dir === "left") p.x -= WORLD.speed;
    if (p.dir === "right") p.x += WORLD.speed;
    p.x = clamp(p.x, 0, WORLD.width - 1);
    p.y = clamp(p.y, 0, WORLD.height - 1);
  });

  io.emit("world", {
    world: WORLD,
    players: Object.values(players)
  });
}, 50);

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Socket frontend server läuft auf http://localhost:${PORT}`);
});
