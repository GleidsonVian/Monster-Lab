// Stats base de todo monstro antes das peças
const BASE_STATS = { hp: 50, atk: 0, def: 0, spd: 0 };

const PECAS = {
  // ── CABEÇAS ────────────────────────────────────────────────────────────────
  cabeca_dragao: {
    id: "cabeca_dragao", slot: "cabeca",
    nome: "Cabeça de Dragão", emoji: "🐉",
    raridade: "rara", tipo: "fogo",
    stats: { hp: 5, atk: 15, def: 0, spd: 5 },
    descricao: "Sopro de fogo devastador.",
  },
  cabeca_lobo: {
    id: "cabeca_lobo", slot: "cabeca",
    nome: "Cabeça de Lobo", emoji: "🐺",
    raridade: "comum", tipo: null,
    stats: { hp: 5, atk: 10, def: 0, spd: 10 },
    descricao: "Uivo que paralisa o inimigo.",
  },
  cabeca_cobra: {
    id: "cabeca_cobra", slot: "cabeca",
    nome: "Cabeça de Cobra", emoji: "🐍",
    raridade: "comum", tipo: "veneno",
    stats: { hp: 0, atk: 8, def: 0, spd: 12 },
    descricao: "Presas venenosas mortais.",
  },
  cabeca_aguia: {
    id: "cabeca_aguia", slot: "cabeca",
    nome: "Cabeça de Águia", emoji: "🦅",
    raridade: "comum", tipo: null,
    stats: { hp: 0, atk: 5, def: 5, spd: 15 },
    descricao: "Visão aguçada e bico perfurante.",
  },
  cabeca_demonio: {
    id: "cabeca_demonio", slot: "cabeca",
    nome: "Cabeça de Demônio", emoji: "😈",
    raridade: "rara", tipo: "sombra",
    stats: { hp: 0, atk: 20, def: 0, spd: 8 },
    descricao: "Terror absoluto nos inimigos.",
  },
  cabeca_fenix: {
    id: "cabeca_fenix", slot: "cabeca",
    nome: "Cabeça de Fênix", emoji: "🔥",
    raridade: "lendaria", tipo: "fogo",
    stats: { hp: 15, atk: 12, def: 5, spd: 8 },
    descricao: "Renascida das chamas eternas.",
  },

  // ── CORPOS ─────────────────────────────────────────────────────────────────
  corpo_ogro: {
    id: "corpo_ogro", slot: "corpo",
    nome: "Corpo de Ogro", emoji: "👹",
    raridade: "comum", tipo: null,
    stats: { hp: 20, atk: 0, def: 5, spd: 0 },
    descricao: "Massa muscular brutal.",
  },
  corpo_cavaleiro: {
    id: "corpo_cavaleiro", slot: "corpo",
    nome: "Corpo de Cavaleiro", emoji: "⚔️",
    raridade: "comum", tipo: "luz",
    stats: { hp: 10, atk: 5, def: 10, spd: 0 },
    descricao: "Armadura impenetrável.",
  },
  corpo_aranha: {
    id: "corpo_aranha", slot: "corpo",
    nome: "Corpo de Aranha", emoji: "🕷️",
    raridade: "comum", tipo: "veneno",
    stats: { hp: 5, atk: 5, def: 3, spd: 8 },
    descricao: "Ágil e mortal.",
  },
  corpo_troll: {
    id: "corpo_troll", slot: "corpo",
    nome: "Corpo de Troll", emoji: "🧌",
    raridade: "rara", tipo: null,
    stats: { hp: 35, atk: 0, def: 8, spd: -5 },
    descricao: "Regeneração sobrenatural.",
    efeito: "regeneracao",
  },
  corpo_demonio: {
    id: "corpo_demonio", slot: "corpo",
    nome: "Corpo de Demônio", emoji: "🔱",
    raridade: "rara", tipo: "sombra",
    stats: { hp: 15, atk: 10, def: 5, spd: 0 },
    descricao: "Poder das trevas encarnado.",
  },
  corpo_leviata: {
    id: "corpo_leviata", slot: "corpo",
    nome: "Corpo de Leviatã", emoji: "🌊",
    raridade: "lendaria", tipo: null,
    stats: { hp: 40, atk: 0, def: 10, spd: 0 },
    descricao: "Resistência colossal.",
  },

  // ── MEMBROS ────────────────────────────────────────────────────────────────
  membros_garras: {
    id: "membros_garras", slot: "membros",
    nome: "Garras", emoji: "🦴",
    raridade: "comum", tipo: null,
    stats: { hp: 0, atk: 12, def: 0, spd: 0 },
    descricao: "Laceram qualquer armadura.",
  },
  membros_tentaculos: {
    id: "membros_tentaculos", slot: "membros",
    nome: "Tentáculos", emoji: "🐙",
    raridade: "comum", tipo: "veneno",
    stats: { hp: 0, atk: 8, def: 3, spd: 0 },
    descricao: "Imobilizam e envenenam.",
  },
  membros_bracos: {
    id: "membros_bracos", slot: "membros",
    nome: "Braços Gigantes", emoji: "💪",
    raridade: "comum", tipo: null,
    stats: { hp: 5, atk: 10, def: 5, spd: 0 },
    descricao: "Smash irresistível.",
  },
  membros_laminas: {
    id: "membros_laminas", slot: "membros",
    nome: "Lâminas Afiadas", emoji: "🗡️",
    raridade: "rara", tipo: null,
    stats: { hp: -5, atk: 18, def: 0, spd: 5 },
    descricao: "Cortam o vento ao atacar.",
  },
  membros_garras_dragao: {
    id: "membros_garras_dragao", slot: "membros",
    nome: "Garras de Dragão", emoji: "🐲",
    raridade: "rara", tipo: "fogo",
    stats: { hp: 0, atk: 20, def: 0, spd: 0 },
    descricao: "Incineram o que tocam.",
  },

  // ── ASAS ───────────────────────────────────────────────────────────────────
  asas_nenhuma: {
    id: "asas_nenhuma", slot: "asas",
    nome: "Sem Asas", emoji: "—",
    raridade: "comum", tipo: null,
    stats: { hp: 0, atk: 0, def: 0, spd: 0 },
    descricao: "Fica no chão.",
  },
  asas_morcego: {
    id: "asas_morcego", slot: "asas",
    nome: "Asas de Morcego", emoji: "🦇",
    raridade: "comum", tipo: "sombra",
    stats: { hp: 0, atk: 0, def: 0, spd: 10 },
    descricao: "Rápido como a noite.",
  },
  asas_anjo: {
    id: "asas_anjo", slot: "asas",
    nome: "Asas de Anjo", emoji: "👼",
    raridade: "comum", tipo: "luz",
    stats: { hp: 15, atk: 0, def: 5, spd: 0 },
    descricao: "Proteção divina.",
  },
  asas_dragao: {
    id: "asas_dragao", slot: "asas",
    nome: "Asas de Dragão", emoji: "🐉",
    raridade: "rara", tipo: "fogo",
    stats: { hp: 0, atk: 5, def: 0, spd: 8 },
    descricao: "Voam e cospem fogo.",
  },
  asas_fenix: {
    id: "asas_fenix", slot: "asas",
    nome: "Asas de Fênix", emoji: "🔥",
    raridade: "lendaria", tipo: "fogo",
    stats: { hp: 20, atk: 0, def: 0, spd: 5 },
    descricao: "Uma vez por batalha ressuscita.",
    efeito: "ressurreicao",
  },
};

const SLOTS = ["cabeca", "corpo", "membros", "asas"];

function getPecasPorSlot(slot) {
  return Object.values(PECAS).filter((p) => p.slot === slot);
}

function calcularStats(pecaIds) {
  const stats = { ...BASE_STATS };
  const efeitos = [];
  const tipos = new Set();

  for (const id of pecaIds) {
    const peca = PECAS[id];
    if (!peca) continue;
    stats.hp  += peca.stats.hp;
    stats.atk += peca.stats.atk;
    stats.def += peca.stats.def;
    stats.spd += peca.stats.spd;
    if (peca.efeito) efeitos.push(peca.efeito);
    if (peca.tipo) tipos.add(peca.tipo);
  }

  // Garante mínimos
  stats.hp  = Math.max(10, stats.hp);
  stats.atk = Math.max(1,  stats.atk);
  stats.def = Math.max(0,  stats.def);
  stats.spd = Math.max(1,  stats.spd);

  return { stats, efeitos, tipos: [...tipos] };
}

module.exports = { PECAS, SLOTS, BASE_STATS, getPecasPorSlot, calcularStats };
