const socket = io();

// ── Estado ──────────────────────────────────────────────────────────────────
let catalogo       = null;
let selecoes       = { cabeca: null, corpo: null, membros: null, asas: "asas_nenhuma" };
let rlSelecoes     = { cabeca: null, corpo: null, membros: null, asas: "asas_nenhuma" };
let rlCatalogo     = null;
let hpMaximos      = { a: 1, b: 1 };
let modoAtual      = null;   // "roguelike" | "solo" | "multi"
let dificuldadeSolo = null;
let nomeJogador    = "";

// ── Helpers ──────────────────────────────────────────────────────────────────
const el = (id) => document.getElementById(id);

function mostrarTela(id) {
  document.querySelectorAll(".tela").forEach((t) => t.classList.remove("ativa"));
  el(id).classList.add("ativa");
}
function mostrarErro(msg) {
  el("msg-erro").textContent = msg;
  el("msg-erro").classList.remove("hidden");
}

// ── Entrada ───────────────────────────────────────────────────────────────
el("btn-roguelike").addEventListener("click", () => {
  nomeJogador = el("input-nome").value.trim();
  if (!nomeJogador) { mostrarErro("Digite seu nome primeiro."); return; }
  modoAtual = "roguelike";
  socket.emit("rl_iniciar", { nome: nomeJogador });
});

el("btn-solo").addEventListener("click", () => {
  nomeJogador = el("input-nome").value.trim();
  if (!nomeJogador) { mostrarErro("Digite seu nome primeiro."); return; }
  modoAtual = "solo";
  mostrarTela("tela-dificuldade");
});

el("btn-multi").addEventListener("click", () => {
  nomeJogador = el("input-nome").value.trim();
  if (!nomeJogador) { mostrarErro("Digite seu nome primeiro."); return; }
  modoAtual = "multi";
  mostrarTela("tela-multi");
});

// ── Dificuldade (solo rápido) ─────────────────────────────────────────────
document.querySelectorAll(".btn-dif").forEach((btn) => {
  btn.addEventListener("click", () => {
    dificuldadeSolo = btn.dataset.dif;
    socket.emit("entrar_sala", { nome: nomeJogador, sala: "SOLO_" + Date.now() });
  });
});
el("btn-voltar-entrada").addEventListener("click", () => mostrarTela("tela-entrada"));

// ── Multijogador ──────────────────────────────────────────────────────────
el("btn-entrar-sala").addEventListener("click", () => {
  const sala = el("input-sala").value.trim();
  if (!sala) return;
  socket.emit("entrar_sala", { nome: nomeJogador, sala });
});
el("btn-voltar-modo").addEventListener("click", () => mostrarTela("tela-entrada"));

socket.on("entrou_sala", ({ sala }) => {
  if (modoAtual === "solo") {
    socket.emit("pedir_catalogo");
  } else {
    el("nome-sala").textContent = sala;
    mostrarTela("tela-lobby");
  }
});

// ── Lobby ─────────────────────────────────────────────────────────────────
socket.on("sala_atualizada", ({ jogadores, min }) => {
  const ul = el("lista-lobby");
  ul.innerHTML = "";
  jogadores.forEach((j) => {
    const li = document.createElement("li");
    li.textContent = j.nome;
    if (j.pronto) li.classList.add("pronto");
    ul.appendChild(li);
  });
  const faltam = min - jogadores.length;
  el("info-lobby").textContent = faltam > 0
    ? `Aguardando jogadores... (mínimo ${min})`
    : "Todos prontos? Clique em Estou Pronto!";
});

el("btn-pronto").addEventListener("click", () => {
  socket.emit("marcar_pronto");
  el("btn-pronto").disabled = true;
  el("btn-pronto").textContent = "Aguardando os outros...";
});

// ── Criação (solo rápido / multi) ─────────────────────────────────────────
socket.on("fase_criacao", ({ duracao, catalogo: cat }) => {
  catalogo = cat;
  selecoes = { cabeca: null, corpo: null, membros: null, asas: "asas_nenhuma" };
  renderizarCatalogo("slots-container", catalogo, selecoes, () => atualizarPreview());
  atualizarPreview();
  if (modoAtual === "solo") {
    el("timer-criacao-box").style.display = "none";
    el("btn-confirmar").textContent = "⚔️ Batalhar!";
  } else {
    el("timer-criacao-box").style.display = "";
    el("btn-confirmar").textContent = "✅ Confirmar Monstro";
    iniciarTimerCriacao(duracao);
  }
  mostrarTela("tela-criacao");
});

socket.on("timer_criacao", ({ restante }) => {
  el("timer-num").textContent = restante;
  if (restante <= 10) el("timer-criacao-box").classList.add("urgente");
});

function iniciarTimerCriacao(total) {
  let restante = total;
  el("timer-num").textContent = restante;
  const iv = setInterval(() => {
    restante--;
    el("timer-num").textContent = restante;
    if (restante <= 10) el("timer-criacao-box").classList.add("urgente");
    if (restante <= 0) clearInterval(iv);
  }, 1000);
}

el("input-nome-monster").addEventListener("input", atualizarPreview);

el("btn-confirmar").addEventListener("click", () => {
  const nome  = el("input-nome-monster").value.trim() || "Monstro";
  const pecas = Object.values(selecoes).filter(Boolean);
  if (modoAtual === "solo") {
    socket.emit("iniciar_solo", { dificuldade: dificuldadeSolo, nome, pecas });
    el("btn-confirmar").disabled = true;
    el("btn-confirmar").textContent = "⚔️ Entrando na Arena...";
  } else {
    socket.emit("submeter_monster", { nome, pecas });
    el("btn-confirmar").disabled = true;
    el("btn-confirmar").textContent = "✅ Aguardando os outros...";
  }
});

socket.on("monster_confirmado", ({ monster }) => {
  const div = el("preview-combos");
  div.innerHTML = "";
  monster.combos.forEach((c) => {
    const tag = document.createElement("div");
    tag.className = "combo-tag";
    tag.innerHTML = `<strong>${c.emoji} ${c.nome}</strong>`;
    div.appendChild(tag);
  });
});

// ── Roguelike: Draft ──────────────────────────────────────────────────────
socket.on("rl_draft", ({ opcoes }) => {
  rlCatalogo = opcoes;
  rlSelecoes = { cabeca: null, corpo: null, membros: null, asas: "asas_nenhuma" };
  renderizarCatalogo("rl-slots-container", rlCatalogo, rlSelecoes, () => rlAtualizarPreview());
  rlAtualizarPreview();
  mostrarTela("tela-rl-draft");
});

el("rl-input-nome").addEventListener("input", rlAtualizarPreview);

el("rl-btn-confirmar").addEventListener("click", () => {
  const nome    = el("rl-input-nome").value.trim() || "Monstro";
  const selecao = { ...rlSelecoes };
  socket.emit("rl_confirmar_draft", { nome, selecoes: selecao });
  el("rl-btn-confirmar").disabled = true;
  el("rl-btn-confirmar").textContent = "⚔️ Iniciando...";
});

// ── Roguelike: Pré-combate ────────────────────────────────────────────────
socket.on("rl_pre_combate", ({ rodada, totalRodadas, zona, isBoss, meuMonster, inimigo }) => {
  const header = el("rl-zona-header");
  header.textContent = `${zona.emoji} ${zona.nome}`;

  const info = el("rl-rodada-info");
  info.innerHTML = `Rodada ${rodada} de ${totalRodadas}` +
    (isBoss ? ` &nbsp; <span class="boss-aviso">👑 BOSS!</span>` : "");

  el("rl-pre-meu").innerHTML      = renderMonsterVsCard(meuMonster, false);
  el("rl-pre-inimigo").innerHTML  = renderMonsterVsCard(inimigo, true);
  if (inimigo.isBoss) el("rl-pre-inimigo").classList.add("boss");

  mostrarTela("tela-rl-pre-combate");
});

function renderMonsterVsCard(m, isEnemy) {
  const emojis = Object.values(m.pecas || {})
    .filter((id) => id && id !== "asas_nenhuma")
    .map((id) => {
      if (!rlCatalogo) return "👾";
      for (const slot of Object.keys(rlCatalogo)) {
        const p = rlCatalogo[slot]?.find((x) => x.id === id);
        if (p) return p.emoji;
      }
      return "👾";
    }).slice(0, 4).join(" ");

  const combosHtml = (m.combos || []).map((c) =>
    `<div class="combo-tag" style="font-size:0.7rem"><strong>${c.emoji} ${c.nome}</strong></div>`
  ).join("");

  const reliquiasHtml = (m.reliquias || []).length
    ? `<div class="reliquia-lista">${m.reliquias.map((r) => `<span class="reliquia-pip" title="${r}">💎</span>`).join("")}</div>`
    : "";

  return `
    <div class="mvc-emoji">${emojis || "👾"}</div>
    <div class="mvc-nome">${m.nome}${m.isBoss ? " 👑" : ""}</div>
    <div class="mvc-stats">
      <span class="stat-pill">❤️ ${m.stats.hp}</span>
      <span class="stat-pill">⚔️ ${m.stats.atk}</span>
      <span class="stat-pill">🛡️ ${m.stats.def}</span>
      <span class="stat-pill">⚡ ${m.stats.spd}</span>
    </div>
    ${combosHtml}
    ${reliquiasHtml}
  `;
}

// ── Roguelike: Resultado de combate ───────────────────────────────────────
socket.on("rl_resultado_combate", ({ log, venceu, nomeA, nomeB, hpMaxA, hpMaxB }) => {
  hpMaximos.a = hpMaxA;
  hpMaximos.b = hpMaxB;
  el("nome-fighter-a").textContent = nomeA;
  el("nome-fighter-b").textContent = nomeB;
  el("batalha-atual").textContent  = "—";
  el("batalha-total").textContent  = "—";
  el("hp-bar-a").style.width = "100%";
  el("hp-bar-b").style.width = "100%";
  el("hp-bar-a").classList.remove("baixo");
  el("hp-bar-b").classList.remove("baixo");
  el("log-combate").innerHTML = "";
  mostrarTela("tela-combate");

  let delay = 0;
  log.forEach((entrada) => {
    delay += velocidadeLog(entrada);
    setTimeout(() => renderizarLogEntrada(entrada, nomeA, nomeB), delay);
  });
});

// ── Roguelike: Recompensa ─────────────────────────────────────────────────
socket.on("rl_recompensa", ({ recompensas, rodada }) => {
  el("rl-recompensa-rodada").textContent = `Rodada ${rodada} de 9 concluída`;
  const grid = el("rl-recompensa-opcoes");
  grid.innerHTML = "";

  recompensas.forEach((r) => {
    const card = document.createElement("div");
    card.className = `recompensa-card ${r.tipo}`;
    card.innerHTML = `
      <span class="recompensa-emoji">${r.emoji}</span>
      <div class="recompensa-info">
        <div class="recompensa-label">${r.label}</div>
        ${r.descricao ? `<div class="recompensa-desc">${r.descricao}</div>` : ""}
      </div>
    `;
    card.addEventListener("click", () => {
      socket.emit("rl_escolher_recompensa", r);
      grid.querySelectorAll(".recompensa-card").forEach((c) => c.style.pointerEvents = "none");
      card.style.borderColor = "var(--accent)";
      card.style.background  = "rgba(34,197,94,0.1)";
    });
    grid.appendChild(card);
  });

  mostrarTela("tela-rl-recompensa");
});

// ── Roguelike: Game Over ──────────────────────────────────────────────────
socket.on("rl_gameover", ({ rodada, monster }) => {
  el("rl-gameover-rodada").textContent = `Você chegou até a rodada ${rodada} de 9`;
  const div = el("rl-gameover-monster");
  div.innerHTML = `
    <div class="monster-nome">${monster.nome}</div>
    <div class="monster-stats" style="margin-top:10px">
      <div class="stat"><span class="stat-label">❤️ Vida</span>      <span>${monster.stats.hp}</span></div>
      <div class="stat"><span class="stat-label">⚔️ Ataque</span>    <span>${monster.stats.atk}</span></div>
      <div class="stat"><span class="stat-label">🛡️ Defesa</span>    <span>${monster.stats.def}</span></div>
      <div class="stat"><span class="stat-label">⚡ Velocidade</span><span>${monster.stats.spd}</span></div>
    </div>
    ${(monster.reliquias || []).length ? `<div class="reliquia-lista" style="margin-top:10px">${monster.reliquias.map((r) => `<span class="reliquia-pip">💎 ${r}</span>`).join("")}</div>` : ""}
  `;
  mostrarTela("tela-rl-gameover");
});

// ── Roguelike: Vitória ────────────────────────────────────────────────────
socket.on("rl_vitoria", ({ monster, rodadas }) => {
  const div = el("rl-vitoria-monster");
  div.innerHTML = `
    <div class="monster-nome">${monster.nome}</div>
    <div class="monster-stats" style="margin-top:10px">
      <div class="stat"><span class="stat-label">❤️ Vida</span>      <span>${monster.stats.hp}</span></div>
      <div class="stat"><span class="stat-label">⚔️ Ataque</span>    <span>${monster.stats.atk}</span></div>
      <div class="stat"><span class="stat-label">🛡️ Defesa</span>    <span>${monster.stats.def}</span></div>
      <div class="stat"><span class="stat-label">⚡ Velocidade</span><span>${monster.stats.spd}</span></div>
    </div>
    ${(monster.reliquias || []).length ? `<div class="reliquia-lista" style="margin-top:10px">${monster.reliquias.map((r) => `<span class="reliquia-pip">💎 ${r}</span>`).join("")}</div>` : ""}
  `;
  mostrarTela("tela-rl-vitoria");
});

el("rl-btn-nova-run").addEventListener("click",   () => location.reload());
el("rl-btn-nova-run-v").addEventListener("click", () => location.reload());

// ── Revelação (solo rápido / multi) ──────────────────────────────────────
socket.on("fase_revelacao", ({ monstros }) => {
  const grid = el("grid-monstros");
  grid.innerHTML = "";
  monstros.forEach((m, i) => {
    const card = document.createElement("div");
    card.className = "monster-reveal-card" + (m.isBot ? " bot-card" : "");
    card.style.animationDelay = `${i * 0.15}s`;
    const emojis = Object.values(m.pecas).filter((id) => id && id !== "asas_nenhuma").join(" ");
    card.innerHTML = `
      <div class="big-emoji">${emojis || "👾"}</div>
      <div class="rev-nome">${m.nome}${m.isBot ? ' <span class="badge-bot">🤖</span>' : ""}</div>
      <div class="rev-jogador">por ${m.jogadorNome}</div>
      <div class="rev-stats">
        <span class="stat-pill">❤️ ${m.stats.hp}</span>
        <span class="stat-pill">⚔️ ${m.stats.atk}</span>
        <span class="stat-pill">🛡️ ${m.stats.def}</span>
        <span class="stat-pill">⚡ ${m.stats.spd}</span>
      </div>
      ${m.combos.map((c) => `<div class="combo-tag"><strong>${c.emoji} ${c.nome}</strong></div>`).join("")}
    `;
    grid.appendChild(card);
  });
  mostrarTela("tela-revelacao");
});

// ── Combate (solo rápido / multi) ─────────────────────────────────────────
socket.on("fase_combate", ({ totalConfrontos }) => {
  el("batalha-total").textContent = totalConfrontos;
  el("batalha-atual").textContent = 1;
  el("log-combate").innerHTML = "";
  mostrarTela("tela-combate");
});

socket.on("resultado_batalha", ({ confrontoAtual, total, nomeA, nomeB, log }) => {
  el("batalha-atual").textContent = confrontoAtual;
  el("batalha-total").textContent = total;
  el("nome-fighter-a").textContent = nomeA;
  el("nome-fighter-b").textContent = nomeB;
  const statsEvt = log.find((l) => l.tipo === "stats");
  hpMaximos.a = statsEvt?.a?.hp || 1;
  hpMaximos.b = statsEvt?.b?.hp || 1;
  el("hp-bar-a").style.width = "100%";
  el("hp-bar-b").style.width = "100%";
  el("hp-bar-a").classList.remove("baixo");
  el("hp-bar-b").classList.remove("baixo");
  el("log-combate").innerHTML = "";
  let delay = 0;
  log.forEach((e) => { delay += velocidadeLog(e); setTimeout(() => renderizarLogEntrada(e, nomeA, nomeB), delay); });
});

// ── Resultado final (solo rápido / multi) ─────────────────────────────────
socket.on("resultado_final", ({ ranking }) => {
  const div = el("ranking");
  div.innerHTML = "";
  const medalhas = ["🥇", "🥈", "🥉"];
  ranking.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = "rank-item" + (item.isBot ? " rank-bot" : "");
    row.innerHTML = `
      <div class="rank-pos">${medalhas[i] || `${i + 1}º`}</div>
      <div class="rank-info">
        <div class="rank-nome">${item.monster.nome}</div>
        <div class="rank-jogador">${item.isBot ? "🤖 Bot" : `👤 ${item.nome}`}</div>
      </div>
      <div class="rank-wins">${item.vitorias}W</div>
    `;
    div.appendChild(row);
  });
  mostrarTela("tela-resultado");
});

el("btn-jogar-novamente").addEventListener("click", () => location.reload());

// ── Combate: log engine ───────────────────────────────────────────────────
function velocidadeLog(e) {
  if (e.tipo === "turno")  return 180;
  if (e.tipo === "inicio" || e.tipo === "fim") return 350;
  return 100;
}

function renderizarLogEntrada(entrada, nomeA, nomeB) {
  const div  = el("log-combate");
  const linha = document.createElement("div");
  linha.className = "log-linha";
  switch (entrada.tipo) {
    case "inicio":      linha.className += " log-inicio";  linha.textContent = entrada.texto; break;
    case "turno":       linha.className += " log-turno";   linha.textContent = `— Turno ${entrada.turno} —`; break;
    case "ataque":
      linha.className += " log-ataque";
      linha.innerHTML = `<b>${entrada.atacante}</b> ataca → <span class="log-dano">-${entrada.dano} HP</span> (${entrada.defensor}: ${entrada.hpDefensor} HP)`;
      atualizarBarra(entrada.defensor, entrada.hpDefensor, nomeA, nomeB);
      break;
    case "cura":        linha.className += " log-cura";    linha.textContent = `🌿 ${entrada.nome} regenera +${entrada.valor} HP (${entrada.hpAtual} HP)`; break;
    case "envenenado":  linha.className += " log-efeito";  linha.textContent = `🐍 ${entrada.nome} foi envenenado!`; break;
    case "queimando":   linha.className += " log-efeito";  linha.textContent = `🔥 ${entrada.nome} está em chamas!`; break;
    case "dot":
      linha.className += " log-dano";
      linha.textContent = `${entrada.efeito === "veneno" ? "🐍" : "🔥"} ${entrada.nome} sofre ${entrada.dano} (${entrada.hpAtual} HP)`;
      atualizarBarra(entrada.nome, entrada.hpAtual, nomeA, nomeB);
      break;
    case "berserk":     linha.className += " log-berserk"; linha.textContent = `💢 ${entrada.nome} entra em BERSERK!`; break;
    case "ressurreicao":linha.className += " log-efeito";  linha.textContent = `🔥 ${entrada.nome} renasce! (${entrada.hp} HP)`; break;
    case "morte":       linha.className += " log-morte";   linha.textContent = `💀 ${entrada.nome} foi derrotado!`; break;
    case "fim":         linha.className += " log-fim";     linha.textContent = `🏆 ${entrada.vencedor} venceu!`; break;
    case "empate":      linha.className += " log-fim";     linha.textContent = entrada.texto; break;
    default: return;
  }
  div.appendChild(linha);
  div.scrollTop = div.scrollHeight;
}

function atualizarBarra(nome, hpAtual, nomeA, nomeB) {
  let fill, maxHp;
  if (nome === nomeA)      { fill = el("hp-bar-a"); maxHp = hpMaximos.a; }
  else if (nome === nomeB) { fill = el("hp-bar-b"); maxHp = hpMaximos.b; }
  else return;
  const pct = Math.max(0, Math.min(100, (hpAtual / maxHp) * 100));
  fill.style.width = pct + "%";
  if (pct < 30) fill.classList.add("baixo"); else fill.classList.remove("baixo");
}

// ── Catálogo compartilhado ────────────────────────────────────────────────
const SLOT_LABELS = { cabeca: "🐲 Cabeça", corpo: "💀 Corpo", membros: "🦴 Membros", asas: "🦋 Asas" };

function renderizarCatalogo(containerId, cat, sel, onChange) {
  const container = el(containerId);
  container.innerHTML = "";
  for (const [slot, pecas] of Object.entries(cat)) {
    const grupo   = document.createElement("div");
    grupo.className = "slot-grupo";
    const titulo  = document.createElement("div");
    titulo.className = "slot-titulo";
    titulo.textContent = SLOT_LABELS[slot] || slot;
    grupo.appendChild(titulo);
    const opcoes  = document.createElement("div");
    opcoes.className = "slot-opcoes";
    pecas.forEach((peca) => {
      const btn = document.createElement("button");
      btn.className = `peca-btn ${peca.raridade}`;
      btn.dataset.slot = slot;
      btn.dataset.id   = peca.id;
      btn.innerHTML = `
        <span class="peca-emoji">${peca.emoji}</span>
        <span class="peca-nome">${peca.nome}</span>
        <span class="badge-raridade ${peca.raridade}">${peca.raridade}</span>
      `;
      btn.title = `${peca.descricao}\n❤️+${peca.stats.hp} ⚔️+${peca.stats.atk} 🛡️+${peca.stats.def} ⚡+${peca.stats.spd}`;
      if (peca.id === "asas_nenhuma") { btn.classList.add("selecionada"); }
      btn.addEventListener("click", () => {
        container.querySelectorAll(`.peca-btn[data-slot="${slot}"]`).forEach((b) => b.classList.remove("selecionada"));
        btn.classList.add("selecionada");
        sel[slot] = peca.id;
        onChange();
      });
      opcoes.appendChild(btn);
    });
    grupo.appendChild(opcoes);
    container.appendChild(grupo);
  }
}

function calcularPreviewStats(sel, cat) {
  const stats = { hp: 50, atk: 0, def: 0, spd: 0 };
  Object.values(sel).filter(Boolean).forEach((id) => {
    for (const slot of Object.keys(cat)) {
      const peca = cat[slot]?.find((p) => p.id === id);
      if (peca) { stats.hp += peca.stats.hp; stats.atk += peca.stats.atk; stats.def += peca.stats.def; stats.spd += peca.stats.spd; break; }
    }
  });
  return stats;
}

function atualizarPreview() {
  if (!catalogo) return;
  const stats  = calcularPreviewStats(selecoes, catalogo);
  const emojis = ["cabeca","corpo","membros","asas"].map((s) => {
    const peca = catalogo[s]?.find((p) => p.id === selecoes[s]);
    return (peca && peca.id !== "asas_nenhuma") ? peca.emoji : "";
  }).filter(Boolean).join(" ");
  el("preview-emojis").textContent = emojis || "❓";
  el("preview-nome").textContent   = el("input-nome-monster").value.trim() || "Monstro Sem Nome";
  el("stat-hp").textContent  = Math.max(10, stats.hp);
  el("stat-atk").textContent = Math.max(1,  stats.atk);
  el("stat-def").textContent = Math.max(0,  stats.def);
  el("stat-spd").textContent = Math.max(1,  stats.spd);
  el("btn-confirmar").disabled = !(selecoes.cabeca && selecoes.corpo && selecoes.membros);
}

function rlAtualizarPreview() {
  if (!rlCatalogo) return;
  const stats  = calcularPreviewStats(rlSelecoes, rlCatalogo);
  const emojis = ["cabeca","corpo","membros","asas"].map((s) => {
    const peca = rlCatalogo[s]?.find((p) => p.id === rlSelecoes[s]);
    return (peca && peca.id !== "asas_nenhuma") ? peca.emoji : "";
  }).filter(Boolean).join(" ");
  el("rl-preview-emojis").textContent = emojis || "❓";
  el("rl-preview-nome").textContent   = el("rl-input-nome").value.trim() || "Monstro Sem Nome";
  el("rl-stat-hp").textContent  = Math.max(10, stats.hp);
  el("rl-stat-atk").textContent = Math.max(1,  stats.atk);
  el("rl-stat-def").textContent = Math.max(0,  stats.def);
  el("rl-stat-spd").textContent = Math.max(1,  stats.spd);
  el("rl-btn-confirmar").disabled = !(rlSelecoes.cabeca && rlSelecoes.corpo && rlSelecoes.membros);
}

// ── Erros ─────────────────────────────────────────────────────────────────
socket.on("erro",    (msg) => { mostrarErro(msg); mostrarTela("tela-entrada"); });
socket.on("rl_erro", (msg) => { alert(msg); });
