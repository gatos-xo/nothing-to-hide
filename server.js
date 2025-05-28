const fs = require("fs");
const https = require("https");
const express = require("express");
const socketIo = require("socket.io");
const path = require("path");
const os = require("os");
require("dotenv").config();

const app = express();

const options = {
  key: fs.readFileSync(path.join(__dirname, "key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "cert.pem")),
};

const server = https.createServer(options, app);
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

// Endpoint para retornar IP local do servidor
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

// Função para obter IP local
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const alias of iface) {
      if (alias.family === "IPv4" && !alias.internal) {
        return alias.address;
      }
    }
  }
  return "IP não encontrado";
}

server.listen(PORT, "0.0.0.0", () => {
  const localIp = getLocalIp();
  console.log(`Servidor HTTPS a correr na porta ${PORT}`);
  console.log(`Acede com o teu pc a: https://localhost:${PORT}/camera.html`);
  console.log(`E no telemóvel entra no site: https://${localIp}:${PORT}`);
});
