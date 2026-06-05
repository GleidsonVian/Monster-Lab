const socket = io();

// ── Estado local ───────────────────────────────────────────────────────────
let meuPapel = null;
let timerInterval = null;

// ── Helpers de tela ────────────────────────────────────────────────────────
function mostrarTela(id) {
  document.querySelectorAll(".tela").forEach((t) => t.classList.remove("ativa"));
  document.getElementById(id).classList.add("ativa");
}

function el(id) {
  return document.getElementById(id);
}

function iniciarTimer(elementoId, segundos, aoTerminar) {
  clearInterval(timerInterval);
  let restante = segundos;
  el(elementoId).textContent = restante;
  timerInterval = setInterval(() => {
    restante--;
    el(elementoId).textContent = restante;
    if (restante <= 0) {
      clearInterval(timerInterval);
      if (aoTerminar) aoTerminar();
    }
  }, 1000);
}

// ── Entrada ────────────────────────────────────────────────────────────────
el("btn-entrar").addEventListener("click", () => {
  const nome = el("input-nome").value.trim();
  const sala = el("input-sala").value.trim();
  if (!nome || !sala) {
    mostrarErro("Preencha seu nome e o código da sala.");
    return;
  }
  socket.emit("entrar_sala", { nome, sala });
});

el("input-sala").addEventListener("keydown", (e) => {
  if (e.key === "Enter") el("btn-entrar").click();
});

function mostrarErro(msg) {
  const p = el("msg-erro");
  p.textContent = msg;
  p.classList.remove("hidden");
}

// ── Lobby ──────────────────────────────────────────────────────────────────
el("btn-pronto").addEventListener("click", () => {
  socket.emit("marcar_pronto");
  el("btn-pronto").disabled = true;
  el("btn-pronto").textContent = "Aguardando os outros...";
});

socket.on("entrou_sala", ({ sala }) => {
  el("nome-sala").textContent = sala;
  mostrarTela("tela-lobby");
});

socket.on("sala_atualizada", ({ jogadores, min }) => {
  const ul = el("lista-jogadores");
  ul.innerHTML = "";
  jogadores.forEach((j) => {
    const li = document.createElement("li");
    li.textContent = j.nome;
    if (j.pronto) li.classList.add("pronto");
    ul.appendChild(li);
  });

  const faltam = min - jogadores.length;
  const info = el("tela-lobby").querySelector(".info");
  if (faltam > 0) {
    info.textContent = `Aguardando jogadores... (faltam ${faltam})`;
  } else {
    info.textContent = "Todos prontos? Clique em Estou Pronto!";
  }
});

// ── Papel ──────────────────────────────────────────────────────────────────
socket.on("seu_papel", ({ papel, aliados }) => {
  meuPapel = papel;
  el("papel-emoji").textContent = papel.emoji;
  el("papel-nome").textContent = papel.nome;
  el("papel-descricao").textContent = papel.descricao;

  if (aliados && aliados.length > 0) {
    el("aliados-container").classList.remove("hidden");
    el("papel-aliados").textContent = aliados.join(", ");
  }

  mostrarTela("tela-papel");
});

// ── Noite ──────────────────────────────────────────────────────────────────
socket.on("fase_noite", ({ noite }) => {
  el("num-noite").textContent = noite;
  el("instrucao-noite").textContent = "";
  el("lista-alvos-noite").innerHTML = "";
  el("msg-aguardo").classList.add("hidden");
  mostrarTela("tela-noite");
});

socket.on("acao_noite", ({ alvos, instrucao }) => {
  el("instrucao-noite").textContent = instrucao;
  const ul = el("lista-alvos-noite");
  ul.innerHTML = "";
  alvos.forEach((alvo) => {
    const li = document.createElement("li");
    li.textContent = alvo.nome;
    li.addEventListener("click", () => {
      socket.emit("acao_noite", { alvoId: alvo.id });
      ul.querySelectorAll("li").forEach((x) => x.classList.remove("selecionado"));
      li.classList.add("selecionado");
      el("msg-aguardo").classList.remove("hidden");
    });
    ul.appendChild(li);
  });
});

socket.on("acao_confirmada", () => {
  el("lista-alvos-noite").querySelectorAll("li").forEach((li) => {
    li.style.pointerEvents = "none";
  });
  el("msg-aguardo").classList.remove("hidden");
});

// ── Amanhecer ──────────────────────────────────────────────────────────────
socket.on("amanhecer", ({ mensagens }) => {
  const div = el("mensagens-amanhecer");
  div.innerHTML = "";
  mensagens.forEach((msg) => {
    const p = document.createElement("p");
    p.textContent = msg;
    p.style.margin = "8px 0";
    p.style.fontSize = "1.1rem";
    div.appendChild(p);
  });
  mostrarTela("tela-amanhecer");
});

// ── Discussão ──────────────────────────────────────────────────────────────
socket.on("fase_discussao", ({ duracao, jogadores }) => {
  const ul = el("lista-votos");
  ul.innerHTML = "";
  el("msg-voto-ok").classList.add("hidden");

  jogadores.forEach((j) => {
    const li = document.createElement("li");
    li.textContent = j.nome;
    li.dataset.id = j.id;
    li.addEventListener("click", () => {
      socket.emit("votar", { alvoId: j.id });
      ul.querySelectorAll("li").forEach((x) => x.classList.remove("votado"));
      li.classList.add("votado");
      el("msg-voto-ok").classList.remove("hidden");
    });
    ul.appendChild(li);
  });

  iniciarTimer("timer-discussao", duracao);
  mostrarTela("tela-discussao");
});

socket.on("votos_atualizados", (contagem) => {
  // Mostra contagem ao lado dos nomes
  const ul = el("lista-votos");
  contagem.forEach(({ id, votos }) => {
    const li = ul.querySelector(`[data-id="${id}"]`);
    if (li) {
      const nome = li.textContent.replace(/ \(\d+\)$/, "");
      li.textContent = `${nome} (${votos})`;
    }
  });
});

// ── Julgamento ─────────────────────────────────────────────────────────────
socket.on("fase_julgamento", ({ acusado, duracao }) => {
  el("nome-acusado").textContent = acusado.nome;
  iniciarTimer("timer-defesa", duracao);
  mostrarTela("tela-julgamento");
});

socket.on("sem_execucao", () => {
  mostrarAviso("Ninguém foi executado.", "tela-amanhecer");
});

socket.on("empate_execucao", () => {
  mostrarAviso("Empate nos votos. Ninguém foi executado.", "tela-amanhecer");
});

socket.on("executado", ({ nome, papel }) => {
  const div = el("mensagens-amanhecer");
  div.innerHTML = `
    <p style="font-size:1.1rem">${nome} foi executado(a).</p>
    <p style="margin-top:8px;color:#9990aa">Era ${papel.emoji} ${papel.nome}</p>
  `;
  mostrarTela("tela-amanhecer");
});

socket.on("tiro_cacador", ({ nomeCacador, nomeAlvo, papel }) => {
  const div = el("mensagens-amanhecer");
  div.innerHTML += `
    <p style="margin-top:12px">💥 ${nomeCacador} atirou em ${nomeAlvo} antes de morrer!</p>
    <p style="color:#9990aa">${nomeAlvo} era ${papel.emoji} ${papel.nome}</p>
  `;
  mostrarTela("tela-amanhecer");
});

// ── Caçador ────────────────────────────────────────────────────────────────
socket.on("habilidade_cacador", ({ alvos }) => {
  const ul = el("lista-alvos-cacador");
  ul.innerHTML = "";
  alvos.forEach((alvo) => {
    const li = document.createElement("li");
    li.textContent = alvo.nome;
    li.addEventListener("click", () => {
      socket.emit("tiro_cacador", { alvoId: alvo.id });
      ul.querySelectorAll("li").forEach((x) => x.style.pointerEvents = "none");
      li.classList.add("selecionado");
    });
    ul.appendChild(li);
  });
  mostrarTela("tela-cacador");
});

// ── Resultado da investigação ──────────────────────────────────────────────
socket.on("resultado_investigacao", ({ nome, suspeito }) => {
  // Exibe como notificação flutuante sem trocar de tela
  const notif = document.createElement("div");
  notif.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 999;
    background: #1a1a2e; border: 1px solid #8b1a1a;
    border-radius: 10px; padding: 16px 20px;
    color: #e8e0d0; font-family: Georgia, serif;
    box-shadow: 0 4px 20px rgba(0,0,0,0.6);
    max-width: 260px;
  `;
  notif.innerHTML = `
    <strong>🔍 Investigação</strong><br>
    ${nome} é <strong style="color:${suspeito ? "#e05555" : "#80c09a"}">${suspeito ? "SUSPEITO 🧛" : "INOCENTE ✓"}</strong>
  `;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 8000);
});

// ── Fim de jogo ────────────────────────────────────────────────────────────
socket.on("fim_de_jogo", ({ vencedor, mensagem, resultado }) => {
  clearInterval(timerInterval);

  el("titulo-fim").textContent = vencedor === "vampiros" ? "🧛 Os Vampiros Venceram!" : "🌅 A Cidade Venceu!";
  el("titulo-fim").className = `vencedor-${vencedor}`;
  el("msg-fim").textContent = mensagem;

  const div = el("resultado-fim");
  div.innerHTML = "<strong>Resultado:</strong>";
  resultado.forEach((j) => {
    const row = document.createElement("div");
    row.className = "jogador-resultado" + (j.vivo ? "" : " morto");
    row.innerHTML = `
      <span>${j.papel.emoji} ${j.nome}</span>
      <span class="badge ${j.papel.faccao}">${j.papel.nome}</span>
    `;
    div.appendChild(row);
  });

  mostrarTela("tela-fim");
});

el("btn-jogar-novamente").addEventListener("click", () => {
  location.reload();
});

// ── Erros do servidor ──────────────────────────────────────────────────────
socket.on("erro", (msg) => {
  mostrarErro(msg);
  mostrarTela("tela-entrada");
});

// ── Helper aviso ───────────────────────────────────────────────────────────
function mostrarAviso(texto, tela) {
  const div = el("mensagens-amanhecer");
  div.innerHTML = `<p style="font-size:1.1rem">${texto}</p>`;
  mostrarTela(tela);
}
