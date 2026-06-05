const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { GameManager } = require("./src/GameManager");
const { RoguelikeManager } = require("./src/RoguelikeManager");
const { PECAS, SLOTS } = require("./src/pieces");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const salas = {};
const runs  = {}; // socketId → RoguelikeManager

function obterOuCriarSala(salaId) {
  if (!salas[salaId]) salas[salaId] = new GameManager(salaId, io);
  return salas[salaId];
}

function catalogoCompleto() {
  const catalogo = {};
  SLOTS.forEach((slot) => {
    catalogo[slot] = Object.values(PECAS)
      .filter((p) => p.slot === slot)
      .map(({ id, nome, emoji, raridade, tipo, stats, descricao }) =>
        ({ id, nome, emoji, raridade, tipo, stats, descricao })
      );
  });
  return catalogo;
}

io.on("connection", (socket) => {
  let salaAtual = null;

  // ── Multijogador / Solo rápido ──────────────────────────────────────────
  socket.on("entrar_sala", ({ sala, nome }) => {
    if (!sala || !nome) return;
    salaAtual = sala.toUpperCase().trim();
    const game = obterOuCriarSala(salaAtual);
    const resultado = game.entrar(socket.id, nome.trim());
    if (resultado.erro) { socket.emit("erro", resultado.erro); return; }
    socket.join(salaAtual);
    socket.emit("entrou_sala", { sala: salaAtual });
  });

  socket.on("pedir_catalogo", () => {
    socket.emit("fase_criacao", { duracao: 0, catalogo: catalogoCompleto() });
  });

  socket.on("marcar_pronto", () => {
    if (!salaAtual || !salas[salaAtual]) return;
    salas[salaAtual].marcarPronto(socket.id);
  });

  socket.on("submeter_monster", (dados) => {
    if (!salaAtual || !salas[salaAtual]) return;
    salas[salaAtual].submeterMonstro(socket.id, dados);
  });

  socket.on("iniciar_solo", (dados) => {
    if (!salaAtual || !salas[salaAtual]) return;
    salas[salaAtual].iniciarSolo(socket.id, dados);
  });

  // ── Roguelike ───────────────────────────────────────────────────────────
  socket.on("rl_iniciar", ({ nome }) => {
    runs[socket.id] = new RoguelikeManager(socket.id, socket);
    runs[socket.id].iniciar(nome || "Jogador");
  });

  socket.on("rl_confirmar_draft", (dados) => {
    if (!runs[socket.id]) return;
    runs[socket.id].confirmarDraft(dados);
  });

  socket.on("rl_escolher_recompensa", (recompensa) => {
    if (!runs[socket.id]) return;
    runs[socket.id].confirmarRecompensa(recompensa);
  });

  // ── Desconexão ──────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    delete runs[socket.id];
    if (!salaAtual || !salas[salaAtual]) return;
    salas[salaAtual].sair(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🐉 Monster Lab rodando em http://localhost:${PORT}`);
});
