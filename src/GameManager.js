const { PECAS, SLOTS, calcularStats } = require("./pieces");
const { verificarCombos } = require("./combos");
const { batalhar, gerarConfrontos } = require("./CombatEngine");

const FASE = {
  LOBBY: "lobby",
  CRIACAO: "criacao",
  REVELACAO: "revelacao",
  COMBATE: "combate",
  RESULTADO: "resultado",
};

const DURACAO_CRIACAO = 60;
const MIN_JOGADORES = 2;
const MAX_JOGADORES = 8;

class GameManager {
  constructor(salaId, io) {
    this.salaId = salaId;
    this.io = io;
    this.jogadores = {}; // socketId → { id, nome, pronto, monster }
    this.fase = FASE.LOBBY;
    this.timer = null;
    this.pontuacao = {}; // socketId → vitorias
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────

  entrar(socketId, nome) {
    if (Object.keys(this.jogadores).length >= MAX_JOGADORES)
      return { erro: "Sala cheia." };
    if (this.fase !== FASE.LOBBY)
      return { erro: "Partida já em andamento." };

    this.jogadores[socketId] = { id: socketId, nome: nome.trim(), pronto: false, monster: null };
    this._broadcast("sala_atualizada", this._estadoLobby());
    return { ok: true };
  }

  sair(socketId) {
    delete this.jogadores[socketId];
    if (this.fase === FASE.LOBBY) {
      this._broadcast("sala_atualizada", this._estadoLobby());
    }
  }

  marcarPronto(socketId) {
    if (!this.jogadores[socketId]) return;
    this.jogadores[socketId].pronto = true;
    this._broadcast("sala_atualizada", this._estadoLobby());

    const lista = Object.values(this.jogadores);
    if (lista.length >= MIN_JOGADORES && lista.every((j) => j.pronto)) {
      setTimeout(() => this._iniciarCriacao(), 500);
    }
  }

  // ── Criação ────────────────────────────────────────────────────────────────

  _iniciarCriacao() {
    this.fase = FASE.CRIACAO;

    // Envia catálogo de peças para o cliente
    const catalogo = {};
    SLOTS.forEach((slot) => {
      catalogo[slot] = Object.values(PECAS)
        .filter((p) => p.slot === slot)
        .map((p) => ({ id: p.id, nome: p.nome, emoji: p.emoji, raridade: p.raridade, tipo: p.tipo, stats: p.stats, descricao: p.descricao }));
    });

    this._broadcast("fase_criacao", { duracao: DURACAO_CRIACAO, catalogo });

    let restante = DURACAO_CRIACAO;
    this.timer = setInterval(() => {
      restante--;
      this._broadcast("timer_criacao", { restante });
      if (restante <= 0) {
        clearInterval(this.timer);
        this._autoCompletarMonstros();
        this._iniciarRevelacao();
      }
    }, 1000);
  }

  submeterMonstro(socketId, { nome, pecas }) {
    if (this.fase !== FASE.CRIACAO) return;
    const jogador = this.jogadores[socketId];
    if (!jogador) return;

    // Valida: um de cada slot obrigatório (exceto asas)
    const slots = { cabeca: null, corpo: null, membros: null, asas: "asas_nenhuma" };
    for (const id of pecas) {
      const peca = PECAS[id];
      if (peca) slots[peca.slot] = id;
    }
    if (!slots.cabeca || !slots.corpo || !slots.membros) return;

    const pecaIds = Object.values(slots).filter(Boolean);
    const { stats, efeitos, tipos } = calcularStats(pecaIds);
    const combos = verificarCombos(pecaIds);

    // Aplica bônus dos combos
    for (const combo of combos) {
      stats.hp  += combo.bonus.hp;
      stats.atk += combo.bonus.atk;
      stats.def += combo.bonus.def;
      stats.spd += combo.bonus.spd;
      for (const ef of combo.efeitos) {
        if (!efeitos.includes(ef)) efeitos.push(ef);
      }
    }

    jogador.monster = {
      jogadorId: socketId,
      jogadorNome: jogador.nome,
      nome: nome || `Monstro de ${jogador.nome}`,
      pecas: slots,
      stats,
      efeitos,
      tipos,
      combos: combos.map((c) => ({ id: c.id, nome: c.nome, emoji: c.emoji, descricao: c.descricao })),
    };

    this.io.to(socketId).emit("monster_confirmado", { monster: jogador.monster });

    // Se todos já submeteram, adianta
    if (Object.values(this.jogadores).every((j) => j.monster)) {
      clearInterval(this.timer);
      this._iniciarRevelacao();
    }
  }

  _autoCompletarMonstros() {
    const defaultPecas = ["cabeca_lobo", "corpo_ogro", "membros_garras", "asas_nenhuma"];
    for (const j of Object.values(this.jogadores)) {
      if (j.monster) continue;
      const { stats, efeitos, tipos } = calcularStats(defaultPecas);
      j.monster = {
        jogadorId: j.id,
        jogadorNome: j.nome,
        nome: `Monstro de ${j.nome}`,
        pecas: { cabeca: defaultPecas[0], corpo: defaultPecas[1], membros: defaultPecas[2], asas: defaultPecas[3] },
        stats,
        efeitos,
        tipos,
        combos: [],
      };
    }
  }

  // ── Revelação ──────────────────────────────────────────────────────────────

  _iniciarRevelacao() {
    this.fase = FASE.REVELACAO;
    const monstros = Object.values(this.jogadores).map((j) => j.monster);
    this._broadcast("fase_revelacao", { monstros });
    setTimeout(() => this._iniciarTorneio(), 6000);
  }

  // ── Torneio ────────────────────────────────────────────────────────────────

  _iniciarTorneio() {
    this.fase = FASE.COMBATE;

    const jogadores = Object.values(this.jogadores);
    const confrontos = gerarConfrontos(jogadores.map((j) => j.monster));

    // Inicializa pontuação
    jogadores.forEach((j) => { this.pontuacao[j.id] = 0; });

    this._broadcast("fase_combate", {
      totalConfrontos: confrontos.length,
      nomes: jogadores.map((j) => j.nome),
    });

    // Executa confrontos sequencialmente com pausa entre eles
    this._executarConfrontos(confrontos, 0);
  }

  _executarConfrontos(confrontos, index) {
    if (index >= confrontos.length) {
      setTimeout(() => this._encerrar(), 2000);
      return;
    }

    const [monsterA, monsterB] = confrontos[index];
    const resultado = batalhar(monsterA, monsterB);

    if (resultado.vencedor && this.pontuacao[resultado.vencedor] !== undefined) {
      this.pontuacao[resultado.vencedor]++;
    }

    this._broadcast("resultado_batalha", {
      confrontoAtual: index + 1,
      total: confrontos.length,
      nomeA: monsterA.nome,
      nomeB: monsterB.nome,
      log: resultado.log,
      vencedor: resultado.vencedor
        ? (this.jogadores[resultado.vencedor]?.nome || "?")
        : "Empate",
    });

    setTimeout(() => this._executarConfrontos(confrontos, index + 1), 3000);
  }

  // ── Resultado ──────────────────────────────────────────────────────────────

  _encerrar() {
    this.fase = FASE.RESULTADO;

    const ranking = Object.values(this.jogadores)
      .map((j) => ({
        nome: j.nome,
        monster: j.monster,
        vitorias: this.pontuacao[j.id] || 0,
      }))
      .sort((a, b) => b.vitorias - a.vitorias);

    this._broadcast("resultado_final", { ranking });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _estadoLobby() {
    return {
      jogadores: Object.values(this.jogadores).map((j) => ({ nome: j.nome, pronto: j.pronto })),
      min: MIN_JOGADORES,
    };
  }

  _broadcast(evento, dados) {
    this.io.to(this.salaId).emit(evento, dados);
  }
}

module.exports = { GameManager };
