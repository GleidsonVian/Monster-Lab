const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { GameManager } = require("./src/GameManager");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// salaId → GameManager
const salas = {};

function obterOuCriarSala(salaId) {
  if (!salas[salaId]) {
    salas[salaId] = new GameManager(salaId, io);
  }
  return salas[salaId];
}

io.on("connection", (socket) => {
  let salaAtual = null;

  socket.on("entrar_sala", ({ sala, nome }) => {
    if (!sala || !nome) return;

    salaAtual = sala.toUpperCase().trim();
    const game = obterOuCriarSala(salaAtual);

    const resultado = game.entrar(socket.id, nome.trim());
    if (resultado.erro) {
      socket.emit("erro", resultado.erro);
      return;
    }

    socket.join(salaAtual);
    socket.emit("entrou_sala", { sala: salaAtual });
  });

  socket.on("marcar_pronto", () => {
    if (!salaAtual || !salas[salaAtual]) return;
    salas[salaAtual].marcarPronto(socket.id);
  });

  socket.on("acao_noite", ({ alvoId }) => {
    if (!salaAtual || !salas[salaAtual]) return;
    salas[salaAtual].registrarAcaoNoite(socket.id, alvoId);
  });

  socket.on("votar", ({ alvoId }) => {
    if (!salaAtual || !salas[salaAtual]) return;
    salas[salaAtual].registrarVoto(socket.id, alvoId);
  });

  socket.on("tiro_cacador", ({ alvoId }) => {
    if (!salaAtual || !salas[salaAtual]) return;
    salas[salaAtual].registrarTiroCacador(socket.id, alvoId);
  });

  socket.on("disconnect", () => {
    if (!salaAtual || !salas[salaAtual]) return;
    salas[salaAtual].sair(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🧛 Caça Vampiros rodando em http://localhost:${PORT}`);
});
