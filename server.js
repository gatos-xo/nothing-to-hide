const express = require("express");
const socketIo = require("socket.io");
const path = require("path");
const os = require("os");
const http = require("http");
require("dotenv").config();

const app = express();
const server = http.createServer(app); // HTTP em vez de HTTPS

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Servir ficheiros estáticos
app.use(express.static(path.join(__dirname, "public")));

// Rota principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Endpoint para retornar IP local do servidor (opcional)
app.get("/api/ip", (req, res) => {
  const interfaces = os.networkInterfaces();
  let address = "IP não encontrado";

  for (const iface of Object.values(interfaces)) {
    for (const alias of iface) {
      if (alias.family === "IPv4" && !alias.internal) {
        address = alias.address;
        break;
      }
    }
    if (address !== "IP não encontrado") break;
  }

  res.json({ ip: address });
});

// Variável para armazenar o último frame da câmara
let latestFrame = null;

// Gestão de conexões WebSocket
io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  // Quando recebemos um frame da câmara (do PC)
  socket.on("camera-frame", (frameData) => {
    latestFrame = frameData;
    // Broadcast do frame para todos os clientes (telemóveis)
    socket.broadcast.emit("video-frame", frameData);
  });

  // Enviar o último frame para novos clientes
  if (latestFrame) {
    socket.emit("video-frame", latestFrame);
  }

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});
