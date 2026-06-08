const MAX_TURNOS = 40;

// Retorna { vencedor: 'a'|'b', log: [...] }
function batalhar(monsterA, monsterB) {
  const a = criarCombatente(monsterA);
  const b = criarCombatente(monsterB);
  const log = [];

  log.push({ tipo: "inicio", texto: `⚔️ ${a.nome} VS ${b.nome}` });
  log.push({ tipo: "stats", a: resumoStats(a), b: resumoStats(b) });

  // Ordem por velocidade
  let [primeiro, segundo] = a.spd >= b.spd ? [a, b] : [b, a];

  for (let turno = 1; turno <= MAX_TURNOS; turno++) {
    log.push({ tipo: "turno", turno });

    for (const [atacante, defensor] of [[primeiro, segundo], [segundo, primeiro]]) {
      if (atacante.hp <= 0 || defensor.hp <= 0) break;

      // Regeneração
      if (temEfeito(atacante, "regeneracao")) {
        const cura = 5;
        atacante.hp = Math.min(atacante.maxHp, atacante.hp + cura);
        log.push({ tipo: "cura", nome: atacante.nome, valor: cura, hpAtual: atacante.hp });
      }

      // Ataque
      let dano = calcularDano(atacante, defensor);

      // Berserk: se HP < 50%, +50% atk
      if (temEfeito(atacante, "berserk") && atacante.hp < atacante.maxHp * 0.5) {
        dano = Math.floor(dano * 1.5);
        log.push({ tipo: "berserk", nome: atacante.nome });
      }

      defensor.hp -= dano;
      log.push({
        tipo: "ataque",
        atacante: atacante.nome,
        defensor: defensor.nome,
        dano,
        hpDefensor: Math.max(0, defensor.hp),
      });

      // Veneno permanente
      if (temEfeito(atacante, "veneno_permanente") || temEfeito(atacante, "veneno")) {
        aplicarVeneno(defensor, log);
      }

      // Fogo persistente
      if (temEfeito(atacante, "fogo_persistente")) {
        aplicarFogo(defensor, log);
      }

      // DoT acumulado
      processarDoT(defensor, log);

      if (defensor.hp <= 0) {
        // Ressurreição (uma vez por batalha)
        if (temEfeito(defensor, "ressurreicao") && !defensor.ressuscitou) {
          defensor.ressuscitou = true;
          defensor.hp = Math.floor(defensor.maxHp * 0.3);
          log.push({ tipo: "ressurreicao", nome: defensor.nome, hp: defensor.hp });
        } else {
          log.push({ tipo: "morte", nome: defensor.nome });
          const vencedor = defensor === a ? "b" : "a";
          log.push({ tipo: "fim", vencedor: vencedor === "a" ? a.nome : b.nome });
          return { vencedor: vencedor === "a" ? monsterA.jogadorId : monsterB.jogadorId, log };
        }
      }
    }
  }

  // Empate: quem tem mais HP vence
  const vencedorEmpate = a.hp >= b.hp ? a : b;
  log.push({ tipo: "empate", texto: `Tempo esgotado! ${vencedorEmpate.nome} vence por HP.` });
  log.push({ tipo: "fim", vencedor: vencedorEmpate.nome });
  return {
    vencedor: vencedorEmpate === a ? monsterA.jogadorId : monsterB.jogadorId,
    log,
  };
}

function calcularDano(atacante, defensor) {
  const base = Math.max(1, atacante.atk - Math.floor(defensor.def * 0.75));
  const variacao = Math.floor(Math.random() * 5) - 2; // -2 a +2
  return Math.max(1, base + variacao);
}

function aplicarVeneno(alvo, log) {
  if (Math.random() < 0.5) {
    const dot = { tipo: "veneno", turnosRestantes: 3, dano: 4 };
    adicionarDoT(alvo, dot);
    log.push({ tipo: "envenenado", nome: alvo.nome });
  }
}

function aplicarFogo(alvo, log) {
  if (Math.random() < 0.4) {
    const dot = { tipo: "fogo", turnosRestantes: 2, dano: 6 };
    adicionarDoT(alvo, dot);
    log.push({ tipo: "queimando", nome: alvo.nome });
  }
}

function adicionarDoT(alvo, dot) {
  const existente = alvo.dots.find((d) => d.tipo === dot.tipo);
  if (existente) {
    existente.turnosRestantes = Math.max(existente.turnosRestantes, dot.turnosRestantes);
  } else {
    alvo.dots.push({ ...dot });
  }
}

function processarDoT(alvo, log) {
  for (const dot of alvo.dots) {
    if (dot.turnosRestantes <= 0) continue;
    const absorb = Math.floor(alvo.def * 0.2);
    const dReal  = Math.max(1, dot.dano - absorb);
    alvo.hp -= dReal;
    dot.turnosRestantes--;
    log.push({
      tipo: "dot",
      efeito: dot.tipo,
      nome: alvo.nome,
      dano: dReal,
      hpAtual: Math.max(0, alvo.hp),
    });
  }
  alvo.dots = alvo.dots.filter((d) => d.turnosRestantes > 0);
}

function criarCombatente(monster) {
  return {
    nome: monster.nome,
    jogadorId: monster.jogadorId,
    hp: monster.stats.hp,
    maxHp: monster.stats.hp,
    atk: monster.stats.atk,
    def: monster.stats.def,
    spd: monster.stats.spd,
    efeitos: [...(monster.efeitos || [])],
    dots: [],
    ressuscitou: false,
  };
}

function temEfeito(combatente, efeito) {
  return combatente.efeitos.includes(efeito);
}

function resumoStats(c) {
  return { nome: c.nome, hp: c.hp, atk: c.atk, def: c.def, spd: c.spd };
}

// Gera todos os confrontos de um torneio round-robin
function gerarConfrontos(jogadores) {
  const confrontos = [];
  for (let i = 0; i < jogadores.length; i++) {
    for (let j = i + 1; j < jogadores.length; j++) {
      confrontos.push([jogadores[i], jogadores[j]]);
    }
  }
  return confrontos;
}

module.exports = { batalhar, gerarConfrontos };
