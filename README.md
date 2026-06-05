# 🧛 Caça Vampiros

Jogo multiplayer de dedução social com temática de vampiros.  
Jogadores se dividem entre **cidadãos** e **vampiros** infiltrados na cidade.

## Como jogar

- Durante a **noite**: vampiros atacam, médico protege, caçador investiga (todos mutados no Discord)
- Durante o **dia**: todos discutem e votam para executar um suspeito
- **Vampiros vencem** quando se igualam ou superam os cidadãos
- **Cidade vence** quando todos os vampiros são eliminados

## Classes

| Classe | Facção | Habilidade |
|--------|--------|-----------|
| Vampiro | Vampiros | Ataca ou converte uma vítima por noite |
| Cidadão | Cidade | Participa das discussões e votações |
| Caçador de Vampiros | Cidade | Investiga uma pessoa por noite |
| Médico | Cidade | Protege alguém do ataque noturno |
| Caçador | Cidade | Ao morrer, atira em alguém |

## Stack

- **Frontend:** HTML / CSS / JavaScript
- **Servidor:** Node.js + Socket.IO
- **Comunicação de voz:** Discord (externo ao jogo)

## Rodar localmente

```bash
npm install
npm start
```
