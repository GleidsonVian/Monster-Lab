# 🐉 Monster Lab

Jogo de criação de monstros com combate automático. Monte seu monstro escolhendo peças por slot, descubra combinações secretas e veja quem domina a arena.

## Modos de jogo

### ⚔️ Roguelike (solo, sem servidor)
Abra `public/solo.html` direto no navegador — sem instalar nada, sem servidor.

- 9 rodadas divididas em 3 zonas (Floresta → Pântano → Vulcão)
- Dificuldade escalonada: inimigos ficam mais fortes a cada rodada
- Boss nas rodadas 3, 6 e 9
- Após cada vitória escolha 1 de 3 recompensas: boost de stat, peça rara ou relíquia
- Perde? Fim de run. Começa do zero.

### 🤖 Partida Rápida (solo com servidor)
Você vs bots com dificuldade configurável (Fácil / Médio / Difícil / Aleatório).

### 👥 Multijogador
Todos entram pelo mesmo código de sala, montam seus monstros e o torneio roda automaticamente (round-robin).

## Como rodar

**Solo offline** — sem nada instalado:
```
Abrir: public/solo.html
```

**Com servidor** (Partida Rápida + Multijogador):
```
Dar dois cliques em: iniciar.bat
Abrir no navegador:  http://localhost:3000
```

Para encerrar o servidor:
```
Dar dois cliques em: encerrar.bat
```

## Peças

Cada monstro é montado com 4 slots:

| Slot | Exemplos |
|------|---------|
| 🐲 Cabeça | Dragão, Lobo, Cobra, Águia, Demônio, Fênix |
| 💀 Corpo | Ogro, Cavaleiro, Aranha, Troll, Demônio, Leviatã |
| 🦴 Membros | Garras, Tentáculos, Braços Gigantes, Lâminas, Garras de Dragão |
| 🦋 Asas | Sem Asas, Morcego, Anjo, Dragão, Fênix |

Raridades: **Comum** / **Rara** / **Lendária**

## Combos secretos

Certas combinações de peças ativam bônus especiais:

| Combo | Peças | Efeito |
|-------|-------|--------|
| 🔥 Dragão Puro | Cabeça + Garras + Asas de Dragão | +50 HP, +20 ATK, Fogo persistente |
| 🌑 Rei das Sombras | Cobra + Aranha + Morcego | Veneno permanente |
| ✨ Cavaleiro Sagrado | Cavaleiro + Anjo | +30 HP, +15 DEF |
| 😈 Berserker Sombrio | Cabeça + Corpo de Demônio | Berserk (<50% HP → +50% ATK) |
| 🧌 Tanque Ancestral | Corpo Troll + Braços Gigantes | Regeneração por turno |
| 🔥 Força da Fênix | Cabeça + Asas de Fênix | Ressurreição |
| ⚡ Assassino Veloz | Cobra + Lâminas + Morcego | +20 SPD, Veneno permanente |

## Relíquias (Roguelike)

Recompensas especiais que alteram o comportamento em combate:

| Relíquia | Efeito |
|----------|--------|
| 🔥 Coração de Fênix | Ressuscita uma vez por batalha |
| 🐉 Sangue de Dragão | Ataques causam fogo persistente |
| 🐍 Veneno Ancestral | Todos os ataques envenenam |
| 💢 Fúria Berserker | Abaixo de 50% HP: +50% ataque |
| 🧌 Cura do Troll | Regenera 5 HP por turno |

## Stack

- **Frontend:** HTML / CSS / JavaScript (vanilla)
- **Servidor:** Node.js + Express + Socket.IO
- **Solo offline:** arquivo HTML autocontido (sem dependências)
