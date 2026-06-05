const { PECAS, calcularStats } = require("./pieces");
const { verificarCombos } = require("./combos");
const { batalhar } = require("./CombatEngine");

const TOTAL_RODADAS = 9;

const ZONAS = [
  { id: "floresta",  nome: "Floresta Sombria",   emoji: "🌲", raridades: ["comum"] },
  { id: "pantano",   nome: "Pântano Venenoso",    emoji: "🌿", raridades: ["comum", "rara"] },
  { id: "vulcao",    nome: "Vulcão Ancestral",    emoji: "🌋", raridades: ["comum", "rara", "lendaria"] },
];

const BOSSES = [
  { nome: "Rei Lobo",       emoji: "🐺👑", pecas: ["cabeca_lobo",    "corpo_troll",   "membros_garras_dragao", "asas_nenhuma"] },
  { nome: "Hidra Venenosa", emoji: "🐍👑", pecas: ["cabeca_cobra",   "corpo_aranha",  "membros_tentaculos",    "asas_morcego"] },
  { nome: "Dragão Ancião",  emoji: "🐉👑", pecas: ["cabeca_dragao",  "corpo_leviata", "membros_garras_dragao", "asas_dragao"] },
];

const NOMES_INIMIGO = ["Chimera", "Basilisco", "Wyvern", "Golem", "Manticora", "Gargoyle", "Wendigo", "Banshee", "Djinn"];

const RELIQUIAS = [
  { id: "coracao_fenix",   nome: "Coração de Fênix",   emoji: "🔥", descricao: "Ressuscita uma vez por batalha.",         efeito: "ressurreicao" },
  { id: "sangue_dragao",   nome: "Sangue de Dragão",   emoji: "🐉", descricao: "Ataques causam fogo persistente.",        efeito: "fogo_persistente" },
  { id: "veneno_ancestral",nome: "Veneno Ancestral",   emoji: "🐍", descricao: "Todos os ataques envenenam o inimigo.",   efeito: "veneno_permanente" },
  { id: "furia_berserker", nome: "Fúria Berserker",    emoji: "💢", descricao: "Abaixo de 50% HP ganha +50% de ataque.",  efeito: "berserk" },
  { id: "cura_troll",      nome: "Cura do Troll",      emoji: "🧌", descricao: "Regenera 5 HP no início de cada turno.",  efeito: "regeneracao" },
];

class RoguelikeManager {
  constructor(socketId, socket) {
    this.socketId = socketId;
    this.socket   = socket;
    this.rodada   = 0;
    this.monster  = null;
    this.nomeJogador = "";
    this.fase = "idle";
  }

  emit(ev, dados) { this.socket.emit(ev, dados); }

  // ── Iniciar run ────────────────────────────────────────────────────────────

  iniciar(nomeJogador) {
    this.nomeJogador = nomeJogador;
    this.rodada  = 0;
    this.monster = null;
    this.fase    = "draft";
    this._enviarDraft();
  }

  _enviarDraft() {
    const slots = ["cabeca", "corpo", "membros", "asas"];
    const opcoes = {};
    slots.forEach((slot) => {
      const pool = Object.values(PECAS).filter((p) => p.slot === slot && p.raridade === "comum");
      const embaralhado = [...pool].sort(() => Math.random() - 0.5);
      opcoes[slot] = embaralhado.slice(0, 3).map(({ id, nome, emoji, raridade, tipo, stats, descricao }) =>
        ({ id, nome, emoji, raridade, tipo, stats, descricao })
      );
    });
    this.emit("rl_draft", { opcoes });
  }

  // ── Draft confirmado ───────────────────────────────────────────────────────

  confirmarDraft({ nome, selecoes }) {
    if (this.fase !== "draft") return;
    if (!selecoes.cabeca || !selecoes.corpo || !selecoes.membros) {
      this.emit("rl_erro", "Selecione ao menos cabeça, corpo e membros.");
      return;
    }
    selecoes.asas = selecoes.asas || "asas_nenhuma";
    this._construirMonster(nome, selecoes);
    this.rodada = 1;
    this._iniciarCombate();
  }

  // ── Recompensa escolhida ───────────────────────────────────────────────────

  confirmarRecompensa(recompensa) {
    if (this.fase !== "recompensa") return;
    this._aplicarRecompensa(recompensa);
    this.rodada++;

    if (this.rodada > TOTAL_RODADAS) {
      this.fase = "vitoria";
      this.emit("rl_vitoria", { monster: this.monster, rodadas: TOTAL_RODADAS });
      return;
    }

    this._iniciarCombate();
  }

  // ── Construção do monster ──────────────────────────────────────────────────

  _construirMonster(nome, selecoes) {
    const pecaIds = Object.values(selecoes).filter(Boolean);
    const { stats, efeitos, tipos } = calcularStats(pecaIds);
    const combos = verificarCombos(pecaIds);
    for (const c of combos) {
      stats.hp  += c.bonus.hp;
      stats.atk += c.bonus.atk;
      stats.def += c.bonus.def;
      stats.spd += c.bonus.spd;
      c.efeitos.forEach((ef) => { if (!efeitos.includes(ef)) efeitos.push(ef); });
    }
    this.monster = {
      jogadorId: this.socketId,
      jogadorNome: this.nomeJogador,
      nome: nome.trim() || `Monstro de ${this.nomeJogador}`,
      pecas: { ...selecoes },
      stats,
      efeitos,
      tipos,
      combos: combos.map(({ id, nome, emoji }) => ({ id, nome, emoji })),
      reliquias: [],
    };
  }

  // ── Combate ────────────────────────────────────────────────────────────────

  _iniciarCombate() {
    this.fase = "combate";
    const isBoss   = this.rodada % 3 === 0;
    const zonaIdx  = Math.min(Math.floor((this.rodada - 1) / 3), ZONAS.length - 1);
    const zona     = ZONAS[zonaIdx];
    const inimigo  = this._gerarInimigo(isBoss, zonaIdx);

    this.emit("rl_pre_combate", {
      rodada: this.rodada,
      totalRodadas: TOTAL_RODADAS,
      zona,
      isBoss,
      meuMonster: this._serializar(this.monster),
      inimigo:    this._serializar(inimigo),
    });

    setTimeout(() => {
      const resultado = batalhar(this.monster, inimigo);
      const venceu    = resultado.vencedor === this.socketId;

      this.emit("rl_resultado_combate", {
        log: resultado.log,
        venceu,
        nomeA: this.monster.nome,
        nomeB: inimigo.nome,
        hpMaxA: this.monster.stats.hp,
        hpMaxB: inimigo.stats.hp,
      });

      if (venceu) {
        this.fase = "recompensa";
        setTimeout(() => {
          const recompensas = this._gerarRecompensas();
          this.emit("rl_recompensa", { recompensas, rodada: this.rodada });
        }, 2500);
      } else {
        this.fase = "gameover";
        setTimeout(() => {
          this.emit("rl_gameover", { rodada: this.rodada, monster: this._serializar(this.monster) });
        }, 2500);
      }
    }, 3000);
  }

  _gerarInimigo(isBoss, zonaIdx) {
    const mult = 1 + (this.rodada - 1) * 0.13;
    const bossIdx = Math.floor(this.rodada / 3) - 1;

    let nome, pecaIds;

    if (isBoss && bossIdx >= 0 && bossIdx < BOSSES.length) {
      const boss = BOSSES[bossIdx];
      nome    = boss.nome;
      pecaIds = boss.pecas;
    } else {
      const raridades = ZONAS[zonaIdx].raridades;
      nome = NOMES_INIMIGO[Math.floor(Math.random() * NOMES_INIMIGO.length)];
      pecaIds = ["cabeca", "corpo", "membros", "asas"].map((slot) => {
        const pool = Object.values(PECAS).filter((p) => p.slot === slot && raridades.includes(p.raridade));
        return pool[Math.floor(Math.random() * pool.length)].id;
      });
    }

    const { stats, efeitos, tipos } = calcularStats(pecaIds);
    const combos = verificarCombos(pecaIds);
    const bossMultExtra = isBoss ? 1.3 : 1;

    for (const c of combos) {
      stats.hp  += c.bonus.hp;
      stats.atk += c.bonus.atk;
      stats.def += c.bonus.def;
      stats.spd += c.bonus.spd;
      c.efeitos.forEach((ef) => { if (!efeitos.includes(ef)) efeitos.push(ef); });
    }

    stats.hp  = Math.max(10, Math.floor(stats.hp  * mult * bossMultExtra));
    stats.atk = Math.max(1,  Math.floor(stats.atk * mult * bossMultExtra));
    stats.def = Math.max(0,  Math.floor(stats.def * mult * bossMultExtra));
    stats.spd = Math.max(1,  Math.floor(stats.spd * mult));

    const slots = {};
    pecaIds.forEach((id) => { const p = PECAS[id]; if (p) slots[p.slot] = id; });

    return {
      jogadorId: "inimigo",
      jogadorNome: nome,
      nome,
      pecas: slots,
      stats,
      efeitos,
      tipos,
      combos: combos.map(({ id, nome, emoji }) => ({ id, nome, emoji })),
      isBoss,
    };
  }

  // ── Recompensas ────────────────────────────────────────────────────────────

  _gerarRecompensas() {
    const r = this.rodada;
    const pool = [
      { tipo: "stat_boost", stat: "hp",  valor: 15 + r * 3, emoji: "❤️",  label: `+${15 + r * 3} Vida Máxima` },
      { tipo: "stat_boost", stat: "atk", valor: 8  + r * 2, emoji: "⚔️",  label: `+${8  + r * 2} Ataque` },
      { tipo: "stat_boost", stat: "def", valor: 5  + r,     emoji: "🛡️",  label: `+${5  + r} Defesa` },
      { tipo: "stat_boost", stat: "spd", valor: 4  + r,     emoji: "⚡",  label: `+${4  + r} Velocidade` },
    ];

    if (r >= 2) {
      pool.push({ tipo: "full_heal", emoji: "💊", label: "+30 Vida (recuperação)" });
    }

    // Peça rara/lendária
    const slots = ["cabeca", "corpo", "membros", "asas"];
    const slot  = slots[Math.floor(Math.random() * slots.length)];
    const rarPool = Object.values(PECAS).filter((p) => p.slot === slot && (p.raridade === "rara" || p.raridade === "lendaria"));
    if (rarPool.length) {
      const peca = rarPool[Math.floor(Math.random() * rarPool.length)];
      pool.push({
        tipo: "peca_swap", slot, emoji: peca.emoji,
        label: `Nova ${slot}: ${peca.nome} (${peca.raridade})`,
        peca: { id: peca.id, nome: peca.nome, emoji: peca.emoji, raridade: peca.raridade, stats: peca.stats },
      });
    }

    // Relíquia (a partir da rodada 2)
    if (r >= 2) {
      const disponiveis = RELIQUIAS.filter((rel) => !this.monster.reliquias.includes(rel.id));
      if (disponiveis.length) {
        const rel = disponiveis[Math.floor(Math.random() * disponiveis.length)];
        pool.push({ tipo: "reliquia", emoji: rel.emoji, label: rel.nome, descricao: rel.descricao, reliquia: rel });
      }
    }

    return pool.sort(() => Math.random() - 0.5).slice(0, 3);
  }

  _aplicarRecompensa(recompensa) {
    if (!recompensa || !this.monster) return;
    const s = this.monster.stats;
    switch (recompensa.tipo) {
      case "stat_boost":
        s[recompensa.stat] += recompensa.valor;
        break;
      case "full_heal":
        s.hp += 30;
        break;
      case "peca_swap": {
        const { slot, peca } = recompensa;
        if (!slot || !peca) break;
        const velha = PECAS[this.monster.pecas[slot]];
        const nova  = PECAS[peca.id];
        if (velha) { s.hp -= velha.stats.hp; s.atk -= velha.stats.atk; s.def -= velha.stats.def; s.spd -= velha.stats.spd; }
        if (nova)  { s.hp += nova.stats.hp;  s.atk += nova.stats.atk;  s.def += nova.stats.def;  s.spd += nova.stats.spd; }
        s.hp  = Math.max(10, s.hp);
        s.atk = Math.max(1,  s.atk);
        s.def = Math.max(0,  s.def);
        s.spd = Math.max(1,  s.spd);
        this.monster.pecas[slot] = peca.id;
        break;
      }
      case "reliquia": {
        const rel = recompensa.reliquia;
        if (!rel) break;
        this.monster.reliquias.push(rel.id);
        if (rel.efeito && !this.monster.efeitos.includes(rel.efeito)) {
          this.monster.efeitos.push(rel.efeito);
        }
        break;
      }
    }
  }

  _serializar(m) {
    return {
      nome: m.nome, isBoss: m.isBoss || false,
      pecas: m.pecas, stats: { ...m.stats },
      combos: m.combos, reliquias: m.reliquias || [],
      efeitos: m.efeitos,
    };
  }
}

module.exports = { RoguelikeManager };
