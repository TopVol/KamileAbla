const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = 3010;
const WORLD = { width: 72, height: 72, tickMs: 110 };
const COLORS = ["#63a4ff", "#ff7a7a", "#63e6be", "#ffd166", "#c77dff", "#ff9f1c"];

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "paperio_multiplayer.html"));
});
app.use(express.static(path.join(__dirname, "public")));

let players = {};
let grid = [];

function makeGrid() {
  grid = Array.from({ length: WORLD.width }, () => Array(WORLD.height).fill(0));
}

function seedTerritory(x, y, radius, ownerId) {
  for (let ix = x - radius; ix <= x + radius; ix++) {
    for (let iy = y - radius; iy <= y + radius; iy++) {
      if (ix >= 0 && iy >= 0 && ix < WORLD.width && iy < WORLD.height) {
        grid[ix][iy] = ownerId;
      }
    }
  }
}

function randomSpawn() {
  return {
    x: Math.floor(Math.random() * (WORLD.width - 20)) + 10,
    y: Math.floor(Math.random() * (WORLD.height - 20)) + 10,
  };
}

function countArea(id) {
  let c = 0;
  for (let x = 0; x < WORLD.width; x++) {
    for (let y = 0; y < WORLD.height; y++) {
      if (grid[x][y] === id) c++;
    }
  }
  return c;
}

function canTurn(current, next) {
  if (current === "up" && next === "down") return false;
  if (current === "down" && next === "up") return false;
  if (current === "left" && next === "right") return false;
  if (current === "right" && next === "left") return false;
  return true;
}

function dirVec(dir) {
  if (dir === "up") return { dx: 0, dy: -1 };
  if (dir === "down") return { dx: 0, dy: 1 };
  if (dir === "left") return { dx: -1, dy: 0 };
  return { dx: 1, dy: 0 };
}

function killPlayer(p) {
  p.alive = false;
  p.trail = [];
}

function floodClaim(p) {
  p.trail.forEach((t) => {
    if (t.x >= 0 && t.y >= 0 && t.x < WORLD.width && t.y < WORLD.height) {
      grid[t.x][t.y] = p.id;
    }
  });

  const outside = Array.from({ length: WORLD.width }, () => Array(WORLD.height).fill(false));
  const q = [];

  function push(x, y) {
    if (x < 0 || y < 0 || x >= WORLD.width || y >= WORLD.height) return;
    if (outside[x][y]) return;
    const v = grid[x][y];
    if (v === p.id) return;
    outside[x][y] = true;
    q.push([x, y]);
  }

  for (let x = 0; x < WORLD.width; x++) {
    push(x, 0);
    push(x, WORLD.height - 1);
  }
  for (let y = 0; y < WORLD.height; y++) {
    push(0, y);
    push(WORLD.width - 1, y);
  }

  while (q.length) {
    const [x, y] = q.shift();
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  for (let x = 0; x < WORLD.width; x++) {
    for (let y = 0; y < WORLD.height; y++) {
      if (!outside[x][y]) grid[x][y] = p.id;
    }
  }

  p.trail = [];
  p.inside = true;
}

function serializePlayers() {
  return Object.values(players).map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    x: p.x,
    y: p.y,
    alive: p.alive,
    area: countArea(p.id),
    trail: p.trail,
  }));
}

function resetPlayer(id) {
  const p = players[id];
  if (!p) return;
  const spawn = randomSpawn();
  p.x = spawn.x;
  p.y = spawn.y;
  p.dir = "right";
  p.alive = true;
  p.inside = true;
  p.trail = [];
  seedTerritory(p.x, p.y, 3, p.id);
}

makeGrid();

io.on("connection", (socket) => {
  const spawn = randomSpawn();
  players[socket.id] = {
    id: socket.id,
    name: "Player",
    color: COLORS[Object.keys(players).length % COLORS.length],
    x: spawn.x,
    y: spawn.y,
    dir: "right",
    alive: true,
    inside: true,
    trail: [],
  };
  seedTerritory(spawn.x, spawn.y, 3, socket.id);

  socket.emit("init", { id: socket.id, world: WORLD });

  socket.on("setName", (name) => {
    if (players[socket.id]) players[socket.id].name = String(name || "Player").trim().slice(0, 20) || "Player";
  });

  socket.on("move", (dir) => {
    const p = players[socket.id];
    if (!p || !p.alive) return;
    if (["up", "down", "left", "right"].includes(dir) && canTurn(p.dir, dir)) {
      p.dir = dir;
    }
  });

  socket.on("respawn", () => {
    resetPlayer(socket.id);
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
  });
});

setInterval(() => {
  const ids = Object.keys(players);

  ids.forEach((id) => {
    const p = players[id];
    if (!p || !p.alive) return;

    const { dx, dy } = dirVec(p.dir);
    p.x += dx;
    p.y += dy;

    if (p.x < 0 || p.y < 0 || p.x >= WORLD.width || p.y >= WORLD.height) {
      killPlayer(p);
      return;
    }

    const cell = grid[p.x][p.y];

    if (cell === p.id) {
      if (!p.inside && p.trail.length) {
        floodClaim(p);
      }
      p.inside = true;
      return;
    }

    // hit any open trail
    for (const otherId of ids) {
      const other = players[otherId];
      if (!other || !other.alive || !other.trail.length) continue;
      if (other.trail.some((t) => t.x === p.x && t.y === p.y)) {
        killPlayer(other);
        if (otherId === id) {
          return;
        }
      }
    }

    p.inside = false;
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 240) p.trail.shift();
  });

  io.emit("world", {
    world: WORLD,
    grid,
    players: serializePlayers(),
  });
}, WORLD.tickMs);

server.listen(PORT, () => {
  console.log(`PaperIO multiplayer server läuft auf http://localhost:${PORT}`);
});
