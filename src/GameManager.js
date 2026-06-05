const { ROLES, distribuirPapeis } = require("./roles");

const FASE = {
  LOBBY: "lobby",
  NOITE: "noite",
  AMANHECER: "amanhecer",
  DISCUSSAO: "discussao",
  JULGAMENTO: "julgamento",
  FIM: "fim",
};

const MIN_JOGADORES = 4;
const MAX_JOGADORES = 10;
const DURACAO_DISCUSSAO = 120; // segundos
const DURACAO_DEFESA = 30;

class GameManager {
  constructor(salaId, io) {
    this.salaId = salaId;
    this.io = io;
    this.jogadores = {}; // socketId → { id, nome, papel, vivo, pronto }
    this.fase = FASE.LOBBY;
    this.noite = 0;
    this.acoesNoite = {}; // socketId → alvoId
    this.votos = {};      // socketId → alvoId
    this.acusado = null;
    this.timer = null;
    this.mortesPendentes = []; // mensagens de morte acumuladas na noite
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────

  entrar(socketId, nome) {
    if (Object.keys(this.jogadores).length >= MAX_JOGADORES) {
      return { erro: "Sala cheia." };
    }
    if (this.fase !== FASE.LOBBY) {
      return { erro: "Partida já em andamento." };
    }
    this.jogadores[socketId] = { id: socketId, nome, papel: null, vivo: true, pronto: false };
    this._broadcast("sala_atualizada", this._estadoLobby());
    return { ok: true };
  }

  sair(socketId) {
    delete this.jogadores[socketId];
    if (this.fase === FASE.LOBBY) {
      this._broadcast("sala_atualizada", this._estadoLobby());
    } else {
      // Trata como morte durante a partida
      this._marcarMorto(socketId);
      this._verificarVitoria();
    }
  }

  marcarPronto(socketId) {
    if (!this.jogadores[socketId]) return;
    this.jogadores[socketId].pronto = true;
    this._broadcast("sala_atualizada", this._estadoLobby());

    const vivos = Object.values(this.jogadores);
    const todosProntos = vivos.length >= MIN_JOGADORES && vivos.every((j) => j.pronto);
    if (todosProntos) this._iniciarPartida();
  }

  // ── Início ─────────────────────────────────────────────────────────────────

  _iniciarPartida() {
    const ids = Object.keys(this.jogadores);
    const papeis = distribuirPapeis(ids.length);
    if (!papeis) return;

    ids.forEach((id, i) => {
      this.jogadores[id].papel = papeis[i];
    });

    this._broadcast("partida_iniciada", { totalJogadores: ids.length });

    // Envia papel individual para cada jogador
    ids.forEach((id) => {
      const j = this.jogadores[id];
      const role = ROLES[j.papel];
      // Vampiros conhecem uns aos outros
      const aliados =
        role.faccao === "vampiros"
          ? Object.values(this.jogadores)
              .filter((x) => x.papel === "VAMPIRO" && x.id !== id)
              .map((x) => x.nome)
          : [];

      this.io.to(id).emit("seu_papel", {
        papel: role,
        aliados,
      });
    });

    setTimeout(() => this._iniciarNoite(), 3000);
  }

  // ── Noite ──────────────────────────────────────────────────────────────────

  _iniciarNoite() {
    this.fase = FASE.NOITE;
    this.noite++;
    this.acoesNoite = {};
    this.mortesPendentes = [];

    const alvosVivos = this._jogadoresVivos().map((j) => ({ id: j.id, nome: j.nome }));

    this._broadcast("fase_noite", { noite: this.noite });

    // Envia ação específica para cada papel
    this._jogadoresVivos().forEach((j) => {
      const role = ROLES[j.papel];
      if (!role.acaoNoite) return;

      const alvos = alvosVivos.filter((a) => a.id !== j.id);
      this.io.to(j.id).emit("acao_noite", {
        papel: j.papel,
        alvos,
        instrucao: this._instrucaoNoite(j.papel),
      });
    });
  }

  _instrucaoNoite(papel) {
    const map = {
      VAMPIRO: "Escolha uma vítima para atacar.",
      CACADOR_VAMPIROS: "Escolha alguém para investigar.",
      MEDICO: "Escolha alguém para proteger.",
    };
    return map[papel] || "";
  }

  registrarAcaoNoite(socketId, alvoId) {
    if (this.fase !== FASE.NOITE) return;
    const jogador = this.jogadores[socketId];
    if (!jogador || !jogador.vivo) return;

    this.acoesNoite[socketId] = alvoId;
    this.io.to(socketId).emit("acao_confirmada");

    // Verifica se todos que podem agir já agiram
    const podamAgir = this._jogadoresVivos().filter((j) => ROLES[j.papel].acaoNoite);
    const todos = podamAgir.every((j) => this.acoesNoite[j.id] !== undefined);
    if (todos) this._resolverNoite();
  }

  _resolverNoite() {
    const protegido = this._acaoPor("MEDICO");
    const alvoVampiro = this._acaoPor("VAMPIRO");
    const investigado = this._acaoPor("CACADOR_VAMPIROS");

    // Resultado da investigação (privado)
    if (investigado) {
      const alvo = this.jogadores[investigado];
      const cacador = this._jogadorComPapel("CACADOR_VAMPIROS");
      if (cacador) {
        const suspeito = ROLES[alvo.papel].faccao === "vampiros";
        this.io.to(cacador.id).emit("resultado_investigacao", {
          nome: alvo.nome,
          suspeito,
        });
      }
    }

    // Ataque do vampiro
    if (alvoVampiro && alvoVampiro !== protegido) {
      this._marcarMorto(alvoVampiro);
      const morto = this.jogadores[alvoVampiro];
      this.mortesPendentes.push({ nome: morto ? morto.nome : "Alguém", razao: "ataque" });
    }

    this._iniciarAmanhecer();
  }

  _acaoPor(papel) {
    const jogador = this._jogadorComPapel(papel);
    if (!jogador) return null;
    return this.acoesNoite[jogador.id] || null;
  }

  // ── Amanhecer ──────────────────────────────────────────────────────────────

  _iniciarAmanhecer() {
    this.fase = FASE.AMANHECER;

    const mensagens =
      this.mortesPendentes.length > 0
        ? this.mortesPendentes.map((m) => `${m.nome} foi encontrado(a) sem vida.`)
        : ["Ninguém morreu esta noite."];

    this._broadcast("amanhecer", { mensagens, noite: this.noite });

    if (this._verificarVitoria()) return;

    setTimeout(() => this._iniciarDiscussao(), 4000);
  }

  // ── Discussão ──────────────────────────────────────────────────────────────

  _iniciarDiscussao() {
    this.fase = FASE.DISCUSSAO;
    this.votos = {};
    this.acusado = null;

    this._broadcast("fase_discussao", {
      duracao: DURACAO_DISCUSSAO,
      jogadores: this._jogadoresVivos().map((j) => ({ id: j.id, nome: j.nome })),
    });

    this.timer = setTimeout(() => this._iniciarVotacao(), DURACAO_DISCUSSAO * 1000);
  }

  registrarVoto(socketId, alvoId) {
    if (this.fase !== FASE.DISCUSSAO) return;
    if (!this.jogadores[socketId]?.vivo) return;
    this.votos[socketId] = alvoId;

    this._broadcast("votos_atualizados", this._contarVotos());

    const totalVivos = this._jogadoresVivos().length;
    const totalVotos = Object.keys(this.votos).length;
    if (totalVotos >= totalVivos) {
      clearTimeout(this.timer);
      this._iniciarVotacao();
    }
  }

  // ── Julgamento ─────────────────────────────────────────────────────────────

  _iniciarVotacao() {
    this.fase = FASE.JULGAMENTO;

    const contagem = this._contarVotos();
    const maisVotado = contagem[0];

    if (!maisVotado || maisVotado.votos === 0) {
      this._broadcast("sem_execucao", {});
      setTimeout(() => this._iniciarNoite(), 3000);
      return;
    }

    // Empate → ninguém é executado
    if (contagem.length > 1 && contagem[0].votos === contagem[1].votos) {
      this._broadcast("empate_execucao", {});
      setTimeout(() => this._iniciarNoite(), 3000);
      return;
    }

    this.acusado = maisVotado.id;
    const acusadoObj = this.jogadores[this.acusado];

    this._broadcast("fase_julgamento", {
      acusado: { id: this.acusado, nome: acusadoObj.nome },
      duracao: DURACAO_DEFESA,
    });

    // Após defesa, executa
    this.timer = setTimeout(() => this._executar(this.acusado), DURACAO_DEFESA * 1000);
  }

  _executar(socketId) {
    const jogador = this.jogadores[socketId];
    if (!jogador) return;

    this._marcarMorto(socketId);
    const role = ROLES[jogador.papel];

    this._broadcast("executado", {
      nome: jogador.nome,
      papel: role,
    });

    if (this._verificarVitoria()) return;

    // Habilidade do Caçador ao morrer
    if (jogador.papel === "CACADOR") {
      this.io.to(socketId).emit("habilidade_cacador", {
        alvos: this._jogadoresVivos().map((j) => ({ id: j.id, nome: j.nome })),
      });
      // Espera 15s para o caçador agir ou segue em frente
      this.timer = setTimeout(() => this._iniciarNoite(), 15000);
      return;
    }

    setTimeout(() => this._iniciarNoite(), 4000);
  }

  registrarTiroCacador(cacadorId, alvoId) {
    clearTimeout(this.timer);
    const alvo = this.jogadores[alvoId];
    if (!alvo || !alvo.vivo) {
      setTimeout(() => this._iniciarNoite(), 2000);
      return;
    }
    this._marcarMorto(alvoId);
    this._broadcast("tiro_cacador", {
      nomeCacador: this.jogadores[cacadorId]?.nome || "Caçador",
      nomeAlvo: alvo.nome,
      papel: ROLES[alvo.papel],
    });
    if (this._verificarVitoria()) return;
    setTimeout(() => this._iniciarNoite(), 4000);
  }

  // ── Vitória ────────────────────────────────────────────────────────────────

  _verificarVitoria() {
    const vivos = this._jogadoresVivos();
    const vampiros = vivos.filter((j) => ROLES[j.papel].faccao === "vampiros");
    const cidade = vivos.filter((j) => ROLES[j.papel].faccao === "cidade");

    if (vampiros.length === 0) {
      this._encerrar("cidade", "Todos os vampiros foram eliminados!");
      return true;
    }
    if (vampiros.length >= cidade.length) {
      this._encerrar("vampiros", "Os vampiros dominaram a cidade!");
      return true;
    }
    return false;
  }

  _encerrar(vencedor, mensagem) {
    this.fase = FASE.FIM;
    clearTimeout(this.timer);

    const resultado = Object.values(this.jogadores).map((j) => ({
      nome: j.nome,
      papel: ROLES[j.papel],
      vivo: j.vivo,
    }));

    this._broadcast("fim_de_jogo", { vencedor, mensagem, resultado });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _marcarMorto(socketId) {
    if (this.jogadores[socketId]) {
      this.jogadores[socketId].vivo = false;
    }
  }

  _jogadoresVivos() {
    return Object.values(this.jogadores).filter((j) => j.vivo);
  }

  _jogadorComPapel(papel) {
    return Object.values(this.jogadores).find((j) => j.papel === papel && j.vivo) || null;
  }

  _contarVotos() {
    const contagem = {};
    Object.values(this.votos).forEach((alvoId) => {
      contagem[alvoId] = (contagem[alvoId] || 0) + 1;
    });
    return Object.entries(contagem)
      .map(([id, votos]) => ({ id, nome: this.jogadores[id]?.nome, votos }))
      .sort((a, b) => b.votos - a.votos);
  }

  _estadoLobby() {
    return {
      jogadores: Object.values(this.jogadores).map((j) => ({ nome: j.nome, pronto: j.pronto })),
      min: MIN_JOGADORES,
      max: MAX_JOGADORES,
    };
  }

  _broadcast(evento, dados) {
    this.io.to(this.salaId).emit(evento, dados);
  }
}

module.exports = { GameManager, FASE };
