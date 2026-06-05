const ROLES = {
  VAMPIRO: {
    id: "VAMPIRO",
    nome: "Vampiro",
    faccao: "vampiros",
    descricao: "À noite, escolha uma vítima para atacar ou converter.",
    emoji: "🧛",
    acaoNoite: true,
  },
  CACADOR_VAMPIROS: {
    id: "CACADOR_VAMPIROS",
    nome: "Caçador de Vampiros",
    faccao: "cidade",
    descricao: "À noite, investigue uma pessoa para descobrir se é vampiro.",
    emoji: "🕵️",
    acaoNoite: true,
  },
  MEDICO: {
    id: "MEDICO",
    nome: "Médico",
    faccao: "cidade",
    descricao: "À noite, proteja uma pessoa do ataque dos vampiros.",
    emoji: "🩺",
    acaoNoite: true,
  },
  CACADOR: {
    id: "CACADOR",
    nome: "Caçador",
    faccao: "cidade",
    descricao: "Ao ser morto ou executado, atira em alguém antes de morrer.",
    emoji: "🔫",
    acaoNoite: false,
    acaoMorte: true,
  },
  CIDADAO: {
    id: "CIDADAO",
    nome: "Cidadão",
    faccao: "cidade",
    descricao: "Sem habilidades especiais. Use sua intuição nas votações.",
    emoji: "👤",
    acaoNoite: false,
  },
};

// Tabela de distribuição por número de jogadores
// Formato: [VAMPIRO, CACADOR_VAMPIROS, MEDICO, CACADOR, CIDADAO]
const DISTRIBUICAO = {
  4:  [1, 1, 1, 0, 1],
  5:  [1, 1, 1, 0, 2],
  6:  [2, 1, 1, 1, 1],
  7:  [2, 1, 1, 1, 2],
  8:  [2, 1, 1, 1, 3],
  9:  [3, 1, 1, 1, 3],
  10: [3, 1, 1, 1, 4],
};

function distribuirPapeis(numJogadores) {
  const config = DISTRIBUICAO[numJogadores];
  if (!config) return null;

  const [nVamp, nCac, nMed, nCacador, nCid] = config;
  const papeis = [];

  for (let i = 0; i < nVamp; i++)    papeis.push("VAMPIRO");
  for (let i = 0; i < nCac; i++)     papeis.push("CACADOR_VAMPIROS");
  for (let i = 0; i < nMed; i++)     papeis.push("MEDICO");
  for (let i = 0; i < nCacador; i++) papeis.push("CACADOR");
  for (let i = 0; i < nCid; i++)     papeis.push("CIDADAO");

  // Embaralha
  for (let i = papeis.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [papeis[i], papeis[j]] = [papeis[j], papeis[i]];
  }

  return papeis;
}

module.exports = { ROLES, DISTRIBUICAO, distribuirPapeis };
