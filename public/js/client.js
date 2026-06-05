const socket = io();

// ── Estado ─────────────────────────────────────────────────────────────────
let catalogo = null;
let selecoes = { cabeca: null, corpo: null, membros: null, asas: "asas_nenhuma" };
let hpMaximos = { a: 1, b: 1 };

// ── Helpers ─────────────────────────────────────────────────────────────────
const el = (id) => document.getElementById(id);

function mostrarTela(id) {
  document.querySelectorAll(".tela").forEach((t) => t.classList.remove("ativa"));
  el(id).classList.add("ativa");
}

// ── Entrada ──────────────────────────────────────────────────────────────────
el("btn-entrar").addEventListener("click", () => {
  const nome = el("input-nome").value.trim();
  const sala = el("input-sala").value.trim();
  if (!nome || !sala) { mostrarErro("Preencha nome e código da sala."); return; }
  socket.emit("entrar_sala", { nome, sala });
});
el("input-sala").addEventListener("keydown", (e) => { if (e.key === "Enter") el("btn-entrar").click(); });

function mostrarErro(msg) {
  const p = el("msg-erro");
  p.textContent = msg;
  p.classList.remove("hidden");
}

// ── Lobby ─────────────────────────────────────────────────────────────────
socket.on("entrou_sala", ({ sala }) => {
  el("nome-sala").textContent = sala;
  mostrarTela("tela-lobby");
});

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

// ── Criação ───────────────────────────────────────────────────────────────
socket.on("fase_criacao", ({ duracao, catalogo: cat }) => {
  catalogo = cat;
  selecoes = { cabeca: null, corpo: null, membros: null, asas: "asas_nenhuma" };
  renderizarCatalogo();
  atualizarPreview();
  mostrarTela("tela-criacao");
  iniciarTimerCriacao(duracao);
});

function iniciarTimerCriacao(total) {
  let restante = total;
  el("timer-num").textContent = restante;
  const iv = setInterval(() => {
    restante--;
    el("timer-num").textContent = restante;
    if (restante <= 10) el("timer-criacao").classList.add("urgente");
    if (restante <= 0) clearInterval(iv);
  }, 1000);
}

socket.on("timer_criacao", ({ restante }) => {
  el("timer-num").textContent = restante;
  if (restante <= 10) el("timer-criacao").classList.add("urgente");
});

const SLOT_LABELS = {
  cabeca: "🐲 Cabeça",
  corpo: "💀 Corpo",
  membros: "🦴 Membros",
  asas: "🦋 Asas",
};

function renderizarCatalogo() {
  const container = el("slots-container");
  container.innerHTML = "";

  for (const [slot, pecas] of Object.entries(catalogo)) {
    const grupo = document.createElement("div");
    grupo.className = "slot-grupo";

    const titulo = document.createElement("div");
    titulo.className = "slot-titulo";
    titulo.textContent = SLOT_LABELS[slot] || slot;
    grupo.appendChild(titulo);

    const opcoes = document.createElement("div");
    opcoes.className = "slot-opcoes";

    pecas.forEach((peca) => {
      const btn = document.createElement("button");
      btn.className = `peca-btn ${peca.raridade}`;
      btn.dataset.slot = slot;
      btn.dataset.id = peca.id;
      btn.innerHTML = `
        <span class="peca-emoji">${peca.emoji}</span>
        <span class="peca-nome">${peca.nome}</span>
        <span class="badge-raridade ${peca.raridade}">${peca.raridade}</span>
      `;
      btn.title = `${peca.descricao}\n❤️+${peca.stats.hp} ⚔️+${peca.stats.atk} 🛡️+${peca.stats.def} ⚡+${peca.stats.spd}`;

      // Pré-seleciona "Sem Asas"
      if (peca.id === "asas_nenhuma") btn.classList.add("selecionada");

      btn.addEventListener("click", () => {
        // Desseleciona botões do mesmo slot
        container.querySelectorAll(`.peca-btn[data-slot="${slot}"]`).forEach((b) => b.classList.remove("selecionada"));
        btn.classList.add("selecionada");
        selecoes[slot] = peca.id;
        atualizarPreview();
      });

      opcoes.appendChild(btn);
    });

    grupo.appendChild(opcoes);
    container.appendChild(grupo);
  }
}

function atualizarPreview() {
  const pecaIds = Object.values(selecoes).filter(Boolean);

  // Emojis
  const emojis = ["cabeca", "corpo", "membros", "asas"].map((slot) => {
    if (!selecoes[slot] || selecoes[slot] === "asas_nenhuma") return "";
    const lista = catalogo[slot];
    const peca = lista?.find((p) => p.id === selecoes[slot]);
    return peca ? peca.emoji : "";
  }).filter(Boolean).join(" ");
  el("preview-emojis").textContent = emojis || "❓";

  // Nome
  const nomeInput = el("input-nome-monster").value.trim();
  el("preview-nome").textContent = nomeInput || "Monstro Sem Nome";

  // Stats (simulado no cliente com dados do catálogo)
  const stats = { hp: 50, atk: 0, def: 0, spd: 0 };
  const combosLocais = [];

  pecaIds.forEach((id) => {
    for (const slot of Object.keys(catalogo)) {
      const peca = catalogo[slot]?.find((p) => p.id === id);
      if (peca) {
        stats.hp  += peca.stats.hp;
        stats.atk += peca.stats.atk;
        stats.def += peca.stats.def;
        stats.spd += peca.stats.spd;
        break;
      }
    }
  });

  el("stat-hp").textContent  = Math.max(10, stats.hp);
  el("stat-atk").textContent = Math.max(1,  stats.atk);
  el("stat-def").textContent = Math.max(0,  stats.def);
  el("stat-spd").textContent = Math.max(1,  stats.spd);

  // Habilitar confirmar se slots obrigatórios preenchidos
  const ok = selecoes.cabeca && selecoes.corpo && selecoes.membros;
  el("btn-confirmar").disabled = !ok;
}

el("input-nome-monster").addEventListener("input", atualizarPreview);

el("btn-confirmar").addEventListener("click", () => {
  const nome = el("input-nome-monster").value.trim() || "Monstro";
  const pecas = Object.values(selecoes).filter(Boolean);
  socket.emit("submeter_monster", { nome, pecas });
  el("btn-confirmar").disabled = true;
  el("btn-confirmar").textContent = "✅ Confirmado! Aguardando os outros...";
});

socket.on("monster_confirmado", ({ monster }) => {
  // Exibe combos ativados no preview
  const div = el("preview-combos");
  div.innerHTML = "";
  monster.combos.forEach((c) => {
    const tag = document.createElement("div");
    tag.className = "combo-tag";
    tag.innerHTML = `<strong>${c.emoji} ${c.nome}</strong>${c.descricao}`;
    div.appendChild(tag);
  });
});

// ── Revelação ─────────────────────────────────────────────────────────────
socket.on("fase_revelacao", ({ monstros }) => {
  const grid = el("grid-monstros");
  grid.innerHTML = "";

  monstros.forEach((m, i) => {
    const card = document.createElement("div");
    card.className = "monster-reveal-card";
    card.style.animationDelay = `${i * 0.15}s`;

    const emojis = Object.values(m.pecas)
      .filter((id) => id && id !== "asas_nenhuma")
      .slice(0, 4).join(" ");

    const combosHtml = m.combos.map((c) =>
      `<div class="combo-tag"><strong>${c.emoji} ${c.nome}</strong></div>`
    ).join("");

    card.innerHTML = `
      <div class="big-emoji">${emojis || "👾"}</div>
      <div class="rev-nome">${m.nome}</div>
      <div class="rev-jogador">por ${m.jogadorNome}</div>
      <div class="rev-stats">
        <span class="stat-pill">❤️ ${m.stats.hp}</span>
        <span class="stat-pill">⚔️ ${m.stats.atk}</span>
        <span class="stat-pill">🛡️ ${m.stats.def}</span>
        <span class="stat-pill">⚡ ${m.stats.spd}</span>
      </div>
      ${combosHtml}
    `;
    grid.appendChild(card);
  });

  mostrarTela("tela-revelacao");
});

// ── Combate ───────────────────────────────────────────────────────────────
socket.on("fase_combate", ({ totalConfrontos }) => {
  el("batalha-total").textContent = totalConfrontos;
  el("batalha-atual").textContent = 1;
  el("log-combate").innerHTML = "";
  mostrarTela("tela-combate");
});

socket.on("resultado_batalha", ({ confrontoAtual, total, nomeA, nomeB, log, vencedor }) => {
  el("batalha-atual").textContent = confrontoAtual;
  el("batalha-total").textContent = total;
  el("nome-fighter-a").textContent = nomeA;
  el("nome-fighter-b").textContent = nomeB;

  const logDiv = el("log-combate");
  logDiv.innerHTML = "";

  // Pega HP máximos do evento de stats
  const statsEvt = log.find((l) => l.tipo === "stats");
  hpMaximos.a = statsEvt?.a?.hp || 1;
  hpMaximos.b = statsEvt?.b?.hp || 1;

  el("hp-bar-a").style.width = "100%";
  el("hp-bar-b").style.width = "100%";
  el("hp-bar-a").classList.remove("baixo");
  el("hp-bar-b").classList.remove("baixo");

  // Anima o log linha por linha
  let delay = 0;
  log.forEach((entrada) => {
    delay += velocidadeLog(entrada);
    setTimeout(() => renderizarLogEntrada(entrada, nomeA, nomeB), delay);
  });
});

function velocidadeLog(entrada) {
  if (entrada.tipo === "turno") return 200;
  if (entrada.tipo === "inicio" || entrada.tipo === "fim") return 400;
  return 120;
}

function renderizarLogEntrada(entrada, nomeA, nomeB) {
  const div = el("log-combate");
  const linha = document.createElement("div");
  linha.className = "log-linha";

  switch (entrada.tipo) {
    case "inicio":
      linha.className += " log-inicio";
      linha.textContent = entrada.texto;
      break;
    case "turno":
      linha.className += " log-turno";
      linha.textContent = `— Turno ${entrada.turno} —`;
      break;
    case "ataque":
      linha.className += " log-ataque";
      linha.innerHTML = `<b>${entrada.atacante}</b> ataca → <span class="log-dano">-${entrada.dano} HP</span> (${entrada.defensor}: ${entrada.hpDefensor} HP)`;
      atualizarBarra(entrada.defensor, entrada.hpDefensor, nomeA, nomeB);
      break;
    case "cura":
      linha.className += " log-cura";
      linha.textContent = `🌿 ${entrada.nome} regenera +${entrada.valor} HP (${entrada.hpAtual} HP)`;
      break;
    case "envenenado":
      linha.className += " log-efeito";
      linha.textContent = `🐍 ${entrada.nome} foi envenenado!`;
      break;
    case "queimando":
      linha.className += " log-efeito";
      linha.textContent = `🔥 ${entrada.nome} está em chamas!`;
      break;
    case "dot":
      linha.className += " log-dano";
      linha.textContent = `${entrada.efeito === "veneno" ? "🐍" : "🔥"} ${entrada.nome} sofre ${entrada.dano} de ${entrada.efeito} (${entrada.hpAtual} HP)`;
      atualizarBarra(entrada.nome, entrada.hpAtual, nomeA, nomeB);
      break;
    case "berserk":
      linha.className += " log-berserk";
      linha.textContent = `💢 ${entrada.nome} entra em BERSERK! (+50% ataque)`;
      break;
    case "ressurreicao":
      linha.className += " log-efeito";
      linha.textContent = `🔥 ${entrada.nome} renasce das chamas! (${entrada.hp} HP)`;
      break;
    case "morte":
      linha.className += " log-morte";
      linha.textContent = `💀 ${entrada.nome} foi derrotado!`;
      break;
    case "fim":
      linha.className += " log-fim";
      linha.textContent = `🏆 ${entrada.vencedor} venceu!`;
      break;
    case "empate":
      linha.className += " log-fim";
      linha.textContent = entrada.texto;
      break;
    default:
      linha.textContent = JSON.stringify(entrada);
  }

  div.appendChild(linha);
  div.scrollTop = div.scrollHeight;
}

function atualizarBarra(nome, hpAtual, nomeA, nomeB) {
  let fill, maxHp;
  if (nome === nomeA) { fill = el("hp-bar-a"); maxHp = hpMaximos.a; }
  else if (nome === nomeB) { fill = el("hp-bar-b"); maxHp = hpMaximos.b; }
  else return;

  const pct = Math.max(0, Math.min(100, (hpAtual / maxHp) * 100));
  fill.style.width = pct + "%";
  if (pct < 30) fill.classList.add("baixo");
  else fill.classList.remove("baixo");
}

// ── Resultado ─────────────────────────────────────────────────────────────
socket.on("resultado_final", ({ ranking }) => {
  const div = el("ranking");
  div.innerHTML = "";

  const medalhas = ["🥇", "🥈", "🥉"];

  ranking.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = "rank-item";
    row.innerHTML = `
      <div class="rank-pos">${medalhas[i] || `${i + 1}º`}</div>
      <div class="rank-info">
        <div class="rank-nome">${item.monster.nome}</div>
        <div class="rank-jogador">por ${item.nome}</div>
      </div>
      <div class="rank-wins">${item.vitorias}W</div>
    `;
    div.appendChild(row);
  });

  mostrarTela("tela-resultado");
});

el("btn-jogar-novamente").addEventListener("click", () => location.reload());

// ── Erros ─────────────────────────────────────────────────────────────────
socket.on("erro", (msg) => {
  mostrarErro(msg);
  mostrarTela("tela-entrada");
});
