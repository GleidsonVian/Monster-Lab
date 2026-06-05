const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { GameManager } = require("./src/GameManager");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

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

  socket.on("pedir_catalogo", () => {
    // Modo solo: envia catálogo direto sem passar pelo lobby
    const { PECAS, SLOTS } = require("./src/pieces");
    const catalogo = {};
    SLOTS.forEach((slot) => {
      catalogo[slot] = Object.values(PECAS)
        .filter((p) => p.slot === slot)
        .map(({ id, nome, emoji, raridade, tipo, stats, descricao }) =>
          ({ id, nome, emoji, raridade, tipo, stats, descricao })
        );
    });
    socket.emit("fase_criacao", { duracao: 0, catalogo });
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

  socket.on("disconnect", () => {
    if (!salaAtual || !salas[salaAtual]) return;
    salas[salaAtual].sair(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🐉 Monster Lab rodando em http://localhost:${PORT}`);
});
