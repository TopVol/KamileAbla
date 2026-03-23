const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

let players = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  players[socket.id] = {
    id: socket.id,
    x: Math.floor(Math.random() * 50) + 10,
    y: Math.floor(Math.random() * 50) + 10,
    name: "Player"
  };

  socket.on("setName", (name) => {
    if (players[socket.id]) players[socket.id].name = name;
  });

  socket.on("move", (dir) => {
    const p = players[socket.id];
    if (!p) return;

    if (dir === "up") p.y--;
    if (dir === "down") p.y++;
    if (dir === "left") p.x--;
    if (dir === "right") p.x++;
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    delete players[socket.id];
  });
});

setInterval(() => {
  io.emit("world", players);
}, 50);

server.listen(3000, () => {
  console.log("Server läuft auf http://localhost:3000");
});
