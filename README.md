# 🐉 Monster Lab

Jogo de criação de monstros com combate automático. Monte seu monstro escolhendo peças por slot, descubra combos secretos, ative traits de facção e domine a arena.

## Modos de jogo

### ⚔️ Roguelike
Abre `public/index.html` direto no navegador — sem servidor, sem instalação.

- Monte seu monstro no draft inicial
- 9 rodadas em 3 zonas com dificuldade crescente
- Boss nas rodadas 3, 6 e 9 — cada boss dá **2 recompensas**
- Após cada vitória: escolha boost de stat, peça rara/lendária ou relíquia
- Preview mostra antes/depois dos stats antes de confirmar a recompensa
- Perde? Fim de run. Começa do zero.

### 🤖 Partida Rápida
Você vs bots (requer servidor). Dificuldade: Fácil / Médio / Difícil / Aleatório.

### 👥 Multijogador
Todos entram pelo mesmo código de sala, montam monstros e o torneio roda automaticamente (round-robin).

## Como rodar

**Roguelike offline** — sem nada instalado:
```
Abrir: public/index.html
```
O jogo detecta automaticamente se há servidor. Se não houver, exibe só o Roguelike.

**Com servidor** (Partida Rápida + Multijogador):
```
Dar dois cliques em: iniciar.bat
Abrir no navegador:  http://localhost:3000
```
```
Encerrar: encerrar.bat
```

## Peças

Cada monstro tem 4 slots:

| Slot | Peças disponíveis |
|------|------------------|
| 🐲 Cabeça | Dragão, Lobo, Cobra, Águia, Demônio, Fênix |
| 💀 Corpo | Ogro, Cavaleiro, Aranha, Troll, Demônio, Leviatã |
| 🦴 Membros | Garras, Tentáculos, Braços Gigantes, Lâminas, Garras de Dragão |
| 🦋 Asas | Sem Asas, Morcego, Anjo, Dragão, Fênix |

Raridades: **Comum** / **Rara** / **Lendária**

## Traits (facções)

Bônus passivos por número de peças da mesma facção:

| Trait | 2 peças | 3 peças |
|-------|---------|---------|
| 🐲 Dracônico | +15% HP | +30% Ataque + Fogo persistente |
| 🌑 Sombras | +10 Velocidade | 20% Esquiva |
| ☠️ Venenoso | Veneno Potente (6 dmg/tick) | Veneno Permanente |
| 🛡️ Guardião | +15 Defesa | Regeneração |
| 💪 Bruto | +20 HP | Berserk |

## Combos secretos

Combinações específicas de peças ativam bônus extras:

| Combo | Peças | Efeito |
|-------|-------|--------|
| 🔥 Dragão Puro | Cabeça + Garras + Asas de Dragão | +50 HP, +20 ATK, Fogo |
| 🌑 Rei das Sombras | Cobra + Aranha + Morcego | +10/10/5/10, Veneno permanente |
| ✨ Cavaleiro Sagrado | Cavaleiro + Anjo | +30 HP, +15 DEF |
| 😈 Berserker Sombrio | Cabeça + Corpo de Demônio | +15 ATK, Berserk |
| 🧌 Tanque Ancestral | Corpo Troll + Braços Gigantes | +20 HP, Regeneração |
| 🔥 Força da Fênix | Cabeça + Asas de Fênix | +20 HP, Ressurreição, Fogo |
| ⚡ Assassino Veloz | Cobra + Lâminas + Morcego | +20 SPD, Veneno permanente |

## Relíquias (máx. 3 por run)

| Relíquia | Efeito |
|----------|--------|
| 🔥 Coração de Fênix | Ressuscita uma vez por batalha |
| 🐉 Sangue de Dragão | Ataques causam fogo persistente |
| 🐍 Veneno Ancestral | Todos os ataques envenenam |
| 💢 Fúria Berserker | Abaixo de 50% HP: +50% ataque |
| 🧌 Cura do Troll | Regenera 5 HP por turno |

## Progressão do Roguelike

| Zona | Rodadas | Inimigos | Boss |
|------|---------|----------|------|
| 🌲 Floresta Sombria | 1–3 | Peças comuns | Rei Lobo |
| 🌿 Pântano Venenoso | 4–6 | Comuns + Raras | Hidra Venenosa |
| 🌋 Vulcão Ancestral | 7–9 | Todas raridades | Dragão Ancião |

Escala de dificuldade: +8% de stats por rodada. Bosses recebem +20% adicional e concedem 2 recompensas.

## Stack

- **Frontend:** HTML / CSS / JavaScript (vanilla)
- **Servidor:** Node.js + Express + Socket.IO
- **Roguelike offline:** `index.html` autocontido, detecta servidor automaticamente
