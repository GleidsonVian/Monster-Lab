const { PECAS, calcularStats } = require("./pieces");
const { verificarCombos } = require("./combos");

const BOTS = {
  facil: [
    { nome: "Goblin Lerdo",    pecas: ["cabeca_lobo",    "corpo_ogro",      "membros_garras",       "asas_nenhuma"] },
    { nome: "Rato Gigante",    pecas: ["cabeca_aguia",   "corpo_aranha",    "membros_tentaculos",   "asas_nenhuma"] },
    { nome: "Troll Bêbado",    pecas: ["cabeca_lobo",    "corpo_troll",     "membros_bracos",       "asas_nenhuma"] },
  ],
  medio: [
    { nome: "Basilisco",       pecas: ["cabeca_cobra",   "corpo_aranha",    "membros_tentaculos",   "asas_morcego"] },
    { nome: "Cavaleiro Negro", pecas: ["cabeca_demonio", "corpo_cavaleiro", "membros_laminas",      "asas_nenhuma"] },
    { nome: "Grifo",           pecas: ["cabeca_aguia",   "corpo_ogro",      "membros_garras_dragao","asas_dragao"] },
  ],
  dificil: [
    // Ativa combo Rei das Sombras
    { nome: "Rei das Sombras", pecas: ["cabeca_cobra",   "corpo_aranha",    "membros_laminas",      "asas_morcego"] },
    // Ativa combo Berserker Sombrio
    { nome: "Lorde Sombrio",   pecas: ["cabeca_demonio", "corpo_demonio",   "membros_garras_dragao","asas_dragao"] },
    // Ativa combo Dragão Puro
    { nome: "Dragão Ancestral",pecas: ["cabeca_dragao",  "corpo_leviata",   "membros_garras_dragao","asas_dragao"] },
  ],
};

const NOMES_RANDOM = [
  "Chimera", "Manticora", "Wyvern", "Golem", "Kraken", "Fênix Negra",
  "Hidra", "Behemoth", "Djinn", "Banshee",
];

function gerarBot(dificuldade, index, botId) {
  let template;

  if (dificuldade === "aleatorio") {
    // Peças aleatórias de qualquer raridade
    const slots = ["cabeca", "corpo", "membros", "asas"];
    const pecaIds = slots.map((slot) => {
      const disponiveis = Object.values(PECAS).filter((p) => p.slot === slot);
      return disponiveis[Math.floor(Math.random() * disponiveis.length)].id;
    });
    const nome = NOMES_RANDOM[Math.floor(Math.random() * NOMES_RANDOM.length)];
    template = { nome, pecas: pecaIds };
  } else {
    const lista = BOTS[dificuldade] || BOTS.facil;
    template = lista[index % lista.length];
  }

  const { stats, efeitos, tipos } = calcularStats(template.pecas);
  const combos = verificarCombos(template.pecas);

  for (const combo of combos) {
    stats.hp  += combo.bonus.hp;
    stats.atk += combo.bonus.atk;
    stats.def += combo.bonus.def;
    stats.spd += combo.bonus.spd;
    for (const ef of combo.efeitos) {
      if (!efeitos.includes(ef)) efeitos.push(ef);
    }
  }

  const slots = {};
  template.pecas.forEach((id) => {
    const peca = PECAS[id];
    if (peca) slots[peca.slot] = id;
  });

  return {
    jogadorId: botId,
    jogadorNome: template.nome,
    nome: template.nome,
    pecas: slots,
    stats, efeitos, tipos,
    combos: combos.map((c) => ({ id: c.id, nome: c.nome, emoji: c.emoji, descricao: c.descricao })),
    isBot: true,
  };
}

// Retorna lista de bots para o modo solo
function gerarBots(dificuldade) {
  const qtd = dificuldade === "facil" ? 1 : dificuldade === "medio" ? 2 : 3;
  return Array.from({ length: qtd }, (_, i) =>
    gerarBot(dificuldade, i, `bot_${i}`)
  );
}

module.exports = { gerarBots };
