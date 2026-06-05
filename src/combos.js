// Combinações secretas — peças que juntas geram bônus extras
const COMBOS = [
  {
    id: "dragao_puro",
    nome: "Dragão Puro",
    emoji: "🔥🐉🔥",
    descricao: "O poder do dragão em sua forma mais pura.",
    // Requer essas peças (qualquer quantidade de match ativa)
    requer: ["cabeca_dragao", "membros_garras_dragao", "asas_dragao"],
    minMatch: 3,
    bonus: { hp: 50, atk: 20, def: 0, spd: 0 },
    efeitos: ["fogo_persistente"],
  },
  {
    id: "rei_sombras",
    nome: "Rei das Sombras",
    emoji: "🌑👑",
    descricao: "Veneno e escuridão se fundem em poder absoluto.",
    requer: ["cabeca_cobra", "corpo_aranha", "asas_morcego"],
    minMatch: 3,
    bonus: { hp: 10, atk: 10, def: 5, spd: 10 },
    efeitos: ["veneno_permanente"],
  },
  {
    id: "cavaleiro_sagrado",
    nome: "Cavaleiro Sagrado",
    emoji: "✨⚔️✨",
    descricao: "A luz divina fortalece a armadura.",
    requer: ["corpo_cavaleiro", "asas_anjo"],
    minMatch: 2,
    bonus: { hp: 30, atk: 0, def: 15, spd: 0 },
    efeitos: ["escudo_sagrado"],
  },
  {
    id: "berserker_sombrio",
    nome: "Berserker Sombrio",
    emoji: "😈💢",
    descricao: "Quanto mais ferido, mais perigoso.",
    requer: ["cabeca_demonio", "corpo_demonio"],
    minMatch: 2,
    bonus: { hp: 0, atk: 15, def: 0, spd: 5 },
    efeitos: ["berserk"],
  },
  {
    id: "tanque_ancestral",
    nome: "Tanque Ancestral",
    emoji: "🧌🛡️",
    descricao: "Regeneração + força bruta dos trolls.",
    requer: ["corpo_troll", "membros_bracos"],
    minMatch: 2,
    bonus: { hp: 20, atk: 5, def: 5, spd: 0 },
    efeitos: ["regeneracao"],
  },
  {
    id: "forca_fenix",
    nome: "Força da Fênix",
    emoji: "🔥🌅",
    descricao: "Fogo eterno queima a alma do inimigo.",
    requer: ["cabeca_fenix", "asas_fenix"],
    minMatch: 2,
    bonus: { hp: 20, atk: 10, def: 0, spd: 0 },
    efeitos: ["ressurreicao", "fogo_persistente"],
  },
  {
    id: "assassino_veloz",
    nome: "Assassino Veloz",
    emoji: "⚡🗡️",
    descricao: "Velocidade e lâminas — o inimigo nem vê chegar.",
    requer: ["cabeca_cobra", "membros_laminas", "asas_morcego"],
    minMatch: 3,
    bonus: { hp: 0, atk: 10, def: 0, spd: 20 },
    efeitos: ["veneno_permanente"],
  },
];

function verificarCombos(pecaIds) {
  const set = new Set(pecaIds);
  const combosAtivados = [];

  for (const combo of COMBOS) {
    const matches = combo.requer.filter((id) => set.has(id)).length;
    if (matches >= combo.minMatch) {
      combosAtivados.push(combo);
    }
  }

  return combosAtivados;
}

module.exports = { COMBOS, verificarCombos };
