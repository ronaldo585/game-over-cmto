import { supabase } from "../supabase.js";

const canvas = document.getElementById("mundo");
const ctx = canvas.getContext("2d");
const inicio = document.getElementById("inicio");
const iniciar = document.getElementById("iniciar");
const mensagem = document.getElementById("mensagem");
const batalhaEl = document.getElementById("batalha");
const acoes = [...document.querySelectorAll("[data-acao]")];
const botaoTrocar = document.getElementById("trocarCriatura");
const painelTroca = document.getElementById("trocaCriatura");
const perfilRpgEl = document.getElementById("perfilRpg");
const nicknameRpgInput = document.getElementById("nicknameRpg");
const erroPerfilRpg = document.getElementById("erroPerfilRpg");
const salvarPerfilRpg = document.getElementById("salvarPerfilRpg");
const botoesRoupa = [...document.querySelectorAll("[data-roupa]")];

const hud = {
    pontos: document.getElementById("pontos"), cristais: document.getElementById("cristais"),
    nivel: document.getElementById("nivel"), capturados: document.getElementById("capturados"),
    recorde: document.getElementById("recorde"), nivelCriatura: document.getElementById("nivelCriatura"),
    nomeCriaturaJogador: document.getElementById("nomeCriaturaJogador"), tipoCriaturaJogador: document.getElementById("tipoCriaturaJogador"),
    iconeJogador: document.getElementById("iconeJogador"),
    vidaJogador: document.getElementById("vidaJogador"), vidaJogadorTexto: document.getElementById("vidaJogadorTexto"),
    nomeInimigo: document.getElementById("nomeInimigo"), tipoInimigo: document.getElementById("tipoInimigo"),
    iconeInimigo: document.getElementById("iconeInimigo"), vidaInimigo: document.getElementById("vidaInimigo"), vidaInimigoTexto: document.getElementById("vidaInimigoTexto")
};

const statusOnline = document.getElementById("statusOnline");
const jogadoresOnlineEl = document.getElementById("jogadoresOnline");
const arenaOnlineEl = document.getElementById("arenaOnline");
const textoDuelo = document.getElementById("textoDuelo");
const desafiosOnlineEl = document.getElementById("desafiosOnline");
const botoesDuelo = [...document.querySelectorAll("[data-duelo-acao]")];

const TAM = 48;
const COLUNAS = 52;
const LINHAS = 34;
const RAIO_ARENA = 220;
const CORES_TERRENO = Object.freeze({
    A: "#3a285c", W: "#176490", P: "#c69b67", M: "#276a47",
    R: "#565169", F: "#39775a", T: "#317b58", G: "#317b58"
});
const ROUPAS_AVENTUREIRO = Object.freeze({
    azul: { corpo: "#4ca7ed", chapeu: "#173e75", detalhe: "#bceeff" },
    verde: { corpo: "#45b77b", chapeu: "#185340", detalhe: "#d1ffd0" },
    violeta: { corpo: "#9565dc", chapeu: "#39235f", detalhe: "#f0d6ff" },
    dourado: { corpo: "#d9a94b", chapeu: "#70431b", detalhe: "#fff0ad" },
    rubi: { corpo: "#d75a6d", chapeu: "#711e3b", detalhe: "#ffd5d8" }
});

function criarMapa() {
    const novoMapa = Array.from({ length: LINHAS }, (_, y) =>
        Array.from({ length: COLUNAS }, (_, x) =>
            x === 0 || y === 0 || x === COLUNAS - 1 || y === LINHAS - 1 ? "T" : "G"
        )
    );

    const marcar = (tipo, x, y) => {
        if (x > 0 && x < COLUNAS - 1 && y > 0 && y < LINHAS - 1) novoMapa[y][x] = tipo;
    };
    const faixa = (tipo, x1, y1, x2, y2, apenasGrama = false) => {
        for (let y = y1; y <= y2; y++) {
            for (let x = x1; x <= x2; x++) {
                if (!apenasGrama || novoMapa[y]?.[x] === "G") marcar(tipo, x, y);
            }
        }
    };

    // Rio da Neblina: duas pontes conectam as duas metades do Bosque.
    faixa("W", 20, 1, 21, LINHAS - 2);

    // Caminhos principais, da clareira inicial até a Arena Lunar.
    faixa("P", 5, 2, 5, 15);
    faixa("P", 5, 7, 21, 7);
    faixa("P", 9, 7, 9, 23);
    faixa("P", 9, 23, 36, 23);
    faixa("P", 34, 20, 34, 27);
    faixa("P", 34, 26, 42, 26);

    // Segunda rota para quem explora a Mata do Sul.
    faixa("P", 5, 23, 9, 23);
    faixa("P", 5, 23, 5, 30);
    faixa("P", 5, 30, 18, 30);

    // Pontes visíveis sobre o rio.
    faixa("P", 20, 7, 21, 7);
    faixa("P", 20, 23, 21, 23);

    // Grande Arena Lunar, no extremo leste do mapa.
    faixa("A", 36, 20, 48, 30);
    faixa("P", 34, 26, 36, 26);

    // Áreas naturais e ruínas que dão personalidade ao mundo.
    faixa("M", 12, 10, 19, 19, true);
    faixa("M", 23, 9, 33, 18, true);
    faixa("M", 8, 25, 19, 32, true);
    faixa("M", 40, 4, 48, 15, true);
    faixa("R", 25, 2, 32, 6, true);
    faixa("F", 2, 16, 7, 21, true);
    faixa("F", 13, 2, 18, 5, true);

    // Bosques densos: árvores bloqueiam atalhos, sem fechar os caminhos.
    [
        [13, 8], [14, 8], [15, 8], [17, 8], [18, 8], [24, 8], [25, 8], [30, 8],
        [11, 20], [12, 20], [13, 20], [17, 21], [18, 21], [19, 21], [24, 20], [25, 20],
        [28, 19], [29, 19], [30, 19], [40, 16], [41, 16], [42, 16], [45, 17], [46, 17],
        [2, 25], [3, 25], [4, 25], [21, 28], [22, 28], [23, 28]
    ].forEach(([x, y]) => {
        if (novoMapa[y]?.[x] === "G") marcar("T", x, y);
    });

    return novoMapa.map(linha => linha.join(""));
}

const mapa = criarMapa();

const teclas = new Set();
const jogador = { x: 3 * TAM + 12, y: 5 * TAM + 7, tamanho: 30, velocidade: 2.45 };
const guardia = { x: 11 * TAM + 15, y: 4 * TAM + 7 };
const fonte = { x: 4 * TAM + 12, y: 8 * TAM + 9 };
const arena = { x: 42 * TAM + 24, y: 25 * TAM + 24 };
let cristaisNoMapa = [
    { x: 7 * TAM + 20, y: 2 * TAM + 20 }, { x: 11 * TAM + 18, y: 7 * TAM + 20 },
    { x: 17 * TAM + 15, y: 5 * TAM + 20 }, { x: 8 * TAM + 20, y: 12 * TAM + 15 },
    { x: 15 * TAM + 15, y: 15 * TAM + 20 }, { x: 18 * TAM + 15, y: 18 * TAM + 20 },
    { x: 24 * TAM + 15, y: 10 * TAM + 20 }, { x: 30 * TAM + 15, y: 15 * TAM + 20 },
    { x: 28 * TAM + 15, y: 4 * TAM + 20 }, { x: 38 * TAM + 15, y: 18 * TAM + 20 },
    { x: 45 * TAM + 15, y: 12 * TAM + 20 }, { x: 46 * TAM + 15, y: 28 * TAM + 20 },
    { x: 12 * TAM + 15, y: 27 * TAM + 20 }, { x: 17 * TAM + 15, y: 31 * TAM + 20 }
];

const criaturasSelvagens = [
    { chave: "muscante", nome: "Muscante", tipo: "NATUREZA", icone: "🌿", raridade: "COMUM", peso: 35, hp: 52, ataque: 10, premio: 55, sprite: "sprite-musgo", golpes: [{ nome: "Chicote de Musgo", min: 13, max: 19 }, { nome: "Sementes Luminares", min: 24, max: 32, custo: 1 }] },
    { chave: "folhito", nome: "Folhito", tipo: "FOLHA", icone: "🍃", raridade: "COMUM", peso: 30, hp: 49, ataque: 11, premio: 58, sprite: "sprite-folhito", golpes: [{ nome: "Rajada de Folhas", min: 12, max: 20 }, { nome: "Dança do Broto", min: 23, max: 31, custo: 1 }] },
    { chave: "pedrino", nome: "Pedrino", tipo: "PEDRA", icone: "🪨", raridade: "COMUM", peso: 20, hp: 66, ataque: 9, premio: 75, sprite: "sprite-musgo", golpes: [{ nome: "Cascalho Rápido", min: 11, max: 18 }, { nome: "Queda de Rocha", min: 25, max: 34, custo: 1 }] },
    { chave: "brilux", nome: "Brilux", tipo: "LUZ", icone: "✨", raridade: "RARA", peso: 16, hp: 44, ataque: 13, premio: 65, sprite: "sprite-lunar", golpes: [{ nome: "Faísca Solar", min: 15, max: 22 }, { nome: "Clarão Prismático", min: 27, max: 36, custo: 1 }] },
    { chave: "mareon", nome: "Maréon", tipo: "ÁGUA", icone: "💧", raridade: "RARA", peso: 14, hp: 61, ataque: 12, premio: 85, sprite: "sprite-mareon", golpes: [{ nome: "Jato Cintilante", min: 14, max: 21 }, { nome: "Onda Lunar", min: 26, max: 35, custo: 1 }] },
    { chave: "brasafim", nome: "Brasafim", tipo: "BRASA", icone: "🔥", raridade: "RARA", peso: 12, hp: 57, ataque: 15, premio: 92, sprite: "sprite-brasafim", golpes: [{ nome: "Garra Incandescente", min: 16, max: 23 }, { nome: "Cometa de Brasa", min: 29, max: 38, custo: 1 }] },
    { chave: "nimbara", nome: "Nimbara", tipo: "NÉVOA", icone: "🌙", raridade: "ÉPICA", peso: 6, hp: 68, ataque: 16, premio: 145, sprite: "sprite-nimbara", golpes: [{ nome: "Asas Nebulosas", min: 17, max: 25 }, { nome: "Eclipse Etéreo", min: 32, max: 42, custo: 1 }] },
    { chave: "cristalume", nome: "Cristalume", tipo: "CRISTAL", icone: "💎", raridade: "ÉPICA", peso: 5, hp: 82, ataque: 14, premio: 170, sprite: "sprite-cristalume", golpes: [{ nome: "Chifres de Quartzo", min: 17, max: 24 }, { nome: "Prisma Estelar", min: 31, max: 43, custo: 1 }] },
    { chave: "aurorafera", nome: "Aurorafera", tipo: "AURORA", icone: "🌟", raridade: "LENDÁRIA", peso: 2, hp: 100, ataque: 19, premio: 420, sprite: "sprite-aurorafera", golpes: [{ nome: "Luz da Aurora", min: 21, max: 30 }, { nome: "Julgamento Celeste", min: 38, max: 52, custo: 1 }] }
];

const criaturaInicial = {
    chave: "fagulha", nome: "Fagulha", tipo: "BRASA", icone: "🔥", raridade: "INICIAL", hp: 100,
    sprite: "sprite-fagulha", golpes: [{ nome: "Investida", min: 14, max: 20 }, { nome: "Centelha", min: 24, max: 33, custo: 1 }]
};
const criaturasPorChave = new Map(criaturasSelvagens.map(criatura => [criatura.chave, criatura]));
const classesSpritesCriatura = [
    "sprite-musgo", "sprite-lunar", "sprite-fagulha", "sprite-folhito", "sprite-mareon",
    "sprite-brasafim", "sprite-nimbara", "sprite-cristalume", "sprite-aurorafera"
];

let iniciada = false;
let emBatalha = false;
let turnoOcupado = false;
let cooldownEncontro = 0;
let ultimoInteragir = 0;
let inimigo = null;
let pontos = 0;
let cristais = 2;
let nivel = 1;
let experiencia = 0;
let vida = 100;
let timeBatalha = [];
let indiceCriaturaAtiva = 0;
let capturados = 0;
let recorde = Number(localStorage.getItem("lendasBosqueRecorde")) || 0;
let jogadorOnline = null;
let canalPresenca = null;
let canalDuelos = null;
let ultimoEnvioOnline = 0;
let dueloAtual = null;
let perfilJogador = null;
let roupaEscolhida = "azul";
let modoOnlineIniciado = false;
const outrosJogadores = new Map();

hud.recorde.textContent = recorde;

function criaturaAtiva() {
    return timeBatalha[indiceCriaturaAtiva] || null;
}

function maxVida(criatura = criaturaAtiva()) {
    if (!criatura) return 100 + (nivel - 1) * 12;
    const bonusInicial = criatura.chave === "fagulha" ? 0 : 25;
    return Number(criatura.hp || 70) + bonusInicial + (nivel - 1) * 10 + (Number(criatura.nivel || 1) - 1) * 4;
}

function criarCombatente(registro) {
    const base = criaturasPorChave.get(registro?.chave) || criaturaInicial;
    return {
        ...base,
        nivel: Math.max(1, Number(registro?.nivel || nivel || 1)),
        origemId: registro?.id || base.chave,
        vida: 0
    };
}

function sincronizarVidaAtiva() {
    const ativa = criaturaAtiva();
    if (ativa) ativa.vida = vida;
}

async function prepararTimeBatalha() {
    const jogadorDaConta = obterJogadorOnline();
    let registros = [];

    if (jogadorDaConta) {
        const { data, error } = await supabase
            .from("rpg_criaturas_aluno")
            .select("id,chave,nivel,posicao_time")
            .eq("aluno_id", jogadorDaConta.id)
            .not("posicao_time", "is", null)
            .order("posicao_time", { ascending: true });

        if (error) console.error("ERRO AO CARREGAR TIME DE BATALHA:", error);
        else registros = data || [];
    }

    timeBatalha = registros.map(criarCombatente);
    if (timeBatalha.length === 0) timeBatalha = [criarCombatente(criaturaInicial)];
    indiceCriaturaAtiva = 0;
    timeBatalha.forEach(criatura => { criatura.vida = maxVida(criatura); });
    vida = maxVida();
    atualizarHud();
    atualizarAcoesDaCriatura();
}

function aplicarSprite(elemento, sprite) {
    if (!elemento) return;
    elemento.classList.remove(...classesSpritesCriatura);
    elemento.classList.add(sprite || "sprite-fagulha");
}

function atualizarAcoesDaCriatura() {
    const ativa = criaturaAtiva() || criaturaInicial;
    const [golpeBasico, golpeEspecial] = ativa.golpes || criaturaInicial.golpes;
    const botaoBasico = document.getElementById("ataquePrimario");
    const botaoEspecial = document.getElementById("ataqueEspecial");
    if (botaoBasico) botaoBasico.innerHTML = `⚔️ ${golpeBasico.nome}<small>${golpeBasico.min}–${golpeBasico.max} dano</small>`;
    if (botaoEspecial) botaoEspecial.innerHTML = `✨ ${golpeEspecial.nome}<small>usa ${golpeEspecial.custo || 1} cristal</small>`;
}

function renderizarOpcoesTroca() {
    if (!painelTroca) return;
    painelTroca.innerHTML = `<p>🔁 Escolha quem entra. Trocar consome seu turno.</p><div class="opcoes-troca">${timeBatalha.map((criatura, indice) => `
        <button type="button" class="opcao-troca ${indice === indiceCriaturaAtiva ? "ativa" : ""}" data-indice-troca="${indice}" ${indice === indiceCriaturaAtiva || criatura.vida <= 0 ? "disabled" : ""}>
            <span>${criatura.icone} ${criatura.nome}</span><small>${Math.max(0, criatura.vida)} / ${maxVida(criatura)} HP</small>
        </button>`).join("")}</div>`;
}

function abrirTrocaCriatura() {
    const disponiveis = timeBatalha.filter(criatura => criatura.vida > 0).length;
    if (!emBatalha || turnoOcupado || disponiveis < 2) {
        falar("🔁 Você precisa de outra criatura com energia para trocar.");
        return;
    }
    renderizarOpcoesTroca();
    painelTroca.classList.remove("escondido");
}

function trocarCriatura(indice, automatica = false) {
    const proxima = timeBatalha[indice];
    const anterior = criaturaAtiva();
    if (!proxima || !anterior || indice === indiceCriaturaAtiva || proxima.vida <= 0) return false;

    sincronizarVidaAtiva();
    indiceCriaturaAtiva = indice;
    vida = Math.min(proxima.vida, maxVida(proxima));
    painelTroca.classList.add("escondido");
    atualizarHud();
    atualizarAcoesDaCriatura();
    if (!automatica) renderizarOpcoesTroca();
    return true;
}

function trocarCriaturaManual(indice) {
    if (!emBatalha || turnoOcupado) return;
    const anterior = criaturaAtiva();
    if (!trocarCriatura(indice)) return;
    const ativa = criaturaAtiva();
    turnoOcupado = true;
    habilitarAcoes(false);
    falar(`🔁 ${anterior.nome} recuou. <b>${ativa.nome}</b> entrou na batalha!`);
    setTimeout(receberAtaque, 650);
}

function limitar(valor, min, max) { return Math.max(min, Math.min(max, valor)); }
function aleatorio(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function falar(texto) { mensagem.innerHTML = texto; }

function atualizarHud() {
    const ativa = criaturaAtiva() || criaturaInicial;
    hud.pontos.textContent = pontos;
    hud.cristais.textContent = cristais;
    hud.nivel.textContent = nivel;
    hud.capturados.textContent = capturados;
    hud.recorde.textContent = Math.max(recorde, pontos);
    jogadoresOnlineEl.textContent = outrosJogadores.size + (jogadorOnline ? 1 : 0);
    hud.nomeCriaturaJogador.innerHTML = `${ativa.nome} <small id="nivelCriatura">Nv. ${ativa.nivel || nivel}</small>`;
    hud.nivelCriatura = document.getElementById("nivelCriatura");
    hud.tipoCriaturaJogador.textContent = `${ativa.raridade} • ${ativa.tipo}`;
    aplicarSprite(hud.iconeJogador, ativa.sprite);
    hud.vidaJogador.style.width = `${(vida / maxVida()) * 100}%`;
    hud.vidaJogadorTexto.textContent = `${vida} / ${maxVida()}`;

    if (inimigo) {
        hud.nomeInimigo.textContent = inimigo.nome;
        hud.tipoInimigo.textContent = `${inimigo.raridade} • ${inimigo.tipo}`;
        aplicarSprite(hud.iconeInimigo, inimigo.sprite || "sprite-musgo");
        hud.vidaInimigo.style.width = `${(inimigo.hp / inimigo.hpMax) * 100}%`;
        hud.vidaInimigoTexto.textContent = `${Math.max(0, inimigo.hp)} / ${inimigo.hpMax}`;
    }
}

function celula(coluna, linha) {
    if (linha < 0 || linha >= mapa.length || coluna < 0 || coluna >= mapa[0].length) return "T";
    return mapa[linha][coluna];
}

function bloqueado(x, y) {
    const margem = 5;
    const pontosTeste = [[x + margem, y + margem], [x + jogador.tamanho - margem, y + margem], [x + margem, y + jogador.tamanho - margem], [x + jogador.tamanho - margem, y + jogador.tamanho - margem]];
    return pontosTeste.some(([px, py]) => ["T", "W"].includes(celula(Math.floor(px / TAM), Math.floor(py / TAM))));
}

function perto(alvo) {
    return Math.hypot((jogador.x + 15) - alvo.x, (jogador.y + 15) - alvo.y) < 58;
}

function estaNaArena(raio = RAIO_ARENA) {
    return Math.hypot(jogador.x + 15 - arena.x, jogador.y + 15 - arena.y) < raio;
}

function obterRegiaoAtual() {
    const coluna = Math.floor((jogador.x + 15) / TAM);
    const linha = Math.floor((jogador.y + 15) / TAM);
    if (estaNaArena()) return "ARENA LUNAR";
    if (coluna >= 40 && linha <= 17) return "BOSQUE ESTELAR";
    if (linha >= 25 && coluna < 21) return "MATA DO SUL";
    if (coluna >= 23 && linha <= 8) return "RUÍNAS ANTIGAS";
    if (coluna >= 23) return "MATA DE CRISTAL";
    if (coluna >= 12 && linha >= 9) return "CORAÇÃO DO BOSQUE";
    return "CLAREIRA INICIAL";
}

function desenharMapa() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cameraX = limitar(jogador.x - canvas.width / 2 + 15, 0, COLUNAS * TAM - canvas.width);
    const cameraY = limitar(jogador.y - canvas.height / 2 + 15, 0, LINHAS * TAM - canvas.height);
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    const inicioY = Math.max(0, Math.floor(cameraY / TAM) - 1);
    const fimY = Math.min(LINHAS - 1, Math.ceil((cameraY + canvas.height) / TAM) + 1);
    const inicioX = Math.max(0, Math.floor(cameraX / TAM) - 1);
    const fimX = Math.min(COLUNAS - 1, Math.ceil((cameraX + canvas.width) / TAM) + 1);
    for (let y = inicioY; y <= fimY; y++) {
        for (let x = inicioX; x <= fimX; x++) {
            const tipo = mapa[y][x];
            const px = x * TAM;
            const py = y * TAM;
            ctx.fillStyle = CORES_TERRENO[tipo] || "#317b58";
            ctx.fillRect(px, py, TAM, TAM);

            if (tipo === "G") {
                ctx.fillStyle = "#56aa63";
                for (let i = 0; i < 4; i++) {
                    const dx = ((x * 19 + y * 7 + i * 11) % 38) + 5;
                    const dy = ((x * 11 + y * 23 + i * 9) % 37) + 6;
                    ctx.fillRect(px + dx, py + dy, 2, 7);
                }
            }
            if (tipo === "P") {
                ctx.fillStyle = "rgba(255,255,255,.15)";
                ctx.fillRect(px + 4, py + 8, 4, 3);
                ctx.fillRect(px + 28, py + 30, 3, 2);
            }
            if (tipo === "M") {
                ctx.fillStyle = "#74c96d";
                for (let i = 0; i < 7; i++) {
                    const dx = ((x * 11 + y * 17 + i * 7) % 39) + 3;
                    const altura = 10 + ((x + y + i) % 8);
                    ctx.fillRect(px + dx, py + 31 - altura, 2, altura);
                }
            }
            if (tipo === "F") {
                [9, 28, 18].forEach((dx, i) => {
                    ctx.fillStyle = i % 2 ? "#ffbedb" : "#ffe77c";
                    ctx.fillRect(px + dx, py + 12 + ((x + y + i) % 16), 4, 4);
                });
            }
            if (tipo === "R") {
                ctx.fillStyle = "#80778e";
                ctx.fillRect(px + 8, py + 19, 30, 8);
                ctx.fillStyle = "#ada3bc";
                ctx.fillRect(px + 13, py + 12, 8, 9);
                ctx.fillRect(px + 27, py + 15, 6, 6);
            }
            if (tipo === "W") {
                ctx.strokeStyle = "rgba(186, 249, 255, .38)";
                ctx.beginPath(); ctx.moveTo(px + 7, py + 13); ctx.lineTo(px + 20, py + 13); ctx.moveTo(px + 27, py + 31); ctx.lineTo(px + 41, py + 31); ctx.stroke();
            }
            if (tipo === "A") {
                ctx.strokeStyle = "rgba(255, 224, 124, .42)";
                ctx.strokeRect(px + 4, py + 4, TAM - 8, TAM - 8);
            }
            if (tipo === "T") desenharArvore(px, py);
        }
    }
    desenharFonte();
    desenharGuardia();
    desenharArena();
    desenharCriaturasNoMato();
    cristaisNoMapa.forEach(cristal => {
        ctx.fillStyle = "#91f5ff";
        ctx.beginPath(); ctx.moveTo(cristal.x, cristal.y - 8); ctx.lineTo(cristal.x + 7, cristal.y); ctx.lineTo(cristal.x, cristal.y + 10); ctx.lineTo(cristal.x - 7, cristal.y); ctx.fill();
        ctx.strokeStyle = "#e1fdff"; ctx.stroke();
    });
    desenharJogadoresOnline();
    desenharJogador();
    if (iniciada && !emBatalha && (perto(guardia) || perto(fonte))) desenharInteragir();
    ctx.restore();

    desenharMiniMapa();

    ctx.fillStyle = "rgba(4, 17, 27, .68)";
    ctx.fillRect(10, 10, 200, 29);
    ctx.fillStyle = "#d7fcff";
    ctx.font = "bold 12px Trebuchet MS";
    ctx.fillText(`🧭 ${obterRegiaoAtual()}`, 18, 29);
}

function desenharMiniMapa() {
    const largura = 160;
    const altura = 105;
    const inicioX = canvas.width - largura - 11;
    const inicioY = 10;
    const celulaLargura = (largura - 12) / COLUNAS;
    const celulaAltura = (altura - 22) / LINHAS;
    const cores = { ...CORES_TERRENO, A: "#8a61ba", W: "#49b7df", P: "#d8b177", M: "#52b76d", R: "#a59aaf", F: "#dc8cae", T: "#194a37", G: "#367f59" };

    ctx.fillStyle = "rgba(3, 14, 26, .8)";
    ctx.fillRect(inicioX, inicioY, largura, altura);
    ctx.strokeStyle = "rgba(138, 229, 238, .7)";
    ctx.strokeRect(inicioX, inicioY, largura, altura);

    mapa.forEach((linha, y) => {
        [...linha].forEach((tipo, x) => {
            ctx.fillStyle = cores[tipo] || cores.G;
            ctx.fillRect(inicioX + 6 + x * celulaLargura, inicioY + 16 + y * celulaAltura, Math.ceil(celulaLargura), Math.ceil(celulaAltura));
        });
    });

    ctx.fillStyle = "#fef3a5";
    ctx.beginPath();
    ctx.arc(inicioX + 6 + ((jogador.x + 15) / (COLUNAS * TAM)) * (largura - 12), inicioY + 16 + ((jogador.y + 15) / (LINHAS * TAM)) * (altura - 22), 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e9feff";
    ctx.font = "bold 9px Trebuchet MS";
    ctx.fillText("MAPA DO BOSQUE", inicioX + 7, inicioY + 11);
}

function desenharArvore(x, y) {
    ctx.fillStyle = "#563c27"; ctx.fillRect(x + 20, y + 26, 9, 20);
    ctx.fillStyle = "#174d38"; ctx.beginPath(); ctx.arc(x + 24, y + 19, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2d8455"; ctx.beginPath(); ctx.arc(x + 17, y + 14, 13, 0, Math.PI * 2); ctx.arc(x + 31, y + 15, 12, 0, Math.PI * 2); ctx.fill();
}

function desenharFonte() {
    ctx.fillStyle = "#677f93"; ctx.beginPath(); ctx.ellipse(fonte.x + 12, fonte.y + 19, 22, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#71eff4"; ctx.beginPath(); ctx.ellipse(fonte.x + 12, fonte.y + 17, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#d4feff"; ctx.fillRect(fonte.x + 10, fonte.y - 2, 4, 17);
}

function desenharGuardia() {
    ctx.fillStyle = "#8d6ad0"; ctx.beginPath(); ctx.arc(guardia.x + 10, guardia.y + 10, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f7d6bd"; ctx.beginPath(); ctx.arc(guardia.x + 10, guardia.y + 7, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffe67a"; ctx.fillRect(guardia.x + 17, guardia.y + 12, 4, 11);
}

function desenharArena() {
    ctx.fillStyle = "rgba(117, 69, 170, .24)";
    ctx.beginPath();
    ctx.arc(arena.x, arena.y, RAIO_ARENA, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffe375";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(arena.x, arena.y, RAIO_ARENA, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 227, 122, .48)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(arena.x, arena.y, 116, 0, Math.PI * 2);
    ctx.stroke();
    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(angulo => {
        const x = arena.x + Math.cos(angulo) * 176;
        const y = arena.y + Math.sin(angulo) * 176;
        ctx.fillStyle = "#e8d18d";
        ctx.fillRect(x - 7, y - 16, 14, 31);
        ctx.fillStyle = "#c26ee1";
        ctx.fillRect(x - 10, y - 21, 20, 7);
    });
    ctx.fillStyle = "#fff0a4";
    ctx.font = "bold 16px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("ARENA LUNAR", arena.x, arena.y + 4);
    ctx.font = "bold 11px Trebuchet MS";
    ctx.fillStyle = "#f1d9ff";
    ctx.fillText("DUELOS ONLINE", arena.x, arena.y + 22);
    ctx.textAlign = "left";
}

function desenharCriaturasNoMato() {
    const criaturas = [
        { x: 16 * TAM + 16, y: 3 * TAM + 12, icone: "🌿" },
        { x: 15 * TAM + 17, y: 15 * TAM + 12, icone: "🍃" },
        { x: 28 * TAM + 17, y: 12 * TAM + 12, icone: "💧" },
        { x: 42 * TAM + 14, y: 8 * TAM + 14, icone: "🌙" },
        { x: 30 * TAM + 14, y: 4 * TAM + 14, icone: "💎" },
        { x: 13 * TAM + 17, y: 28 * TAM + 11, icone: "🔥" },
        { x: 46 * TAM + 17, y: 15 * TAM + 11, icone: "🌟" }
    ];
    ctx.font = "22px sans-serif";
    criaturas.forEach(criatura => ctx.fillText(criatura.icone, criatura.x, criatura.y));
}

function desenharJogadoresOnline() {
    outrosJogadores.forEach(outro => {
        const x = Number(outro.x), y = Number(outro.y);
        desenharAventureiro(x, y, outro.roupa);
        ctx.fillStyle = "#efffff"; ctx.font = "bold 11px Trebuchet MS"; ctx.textAlign = "center";
        ctx.fillText(String(outro.jogador_nome || "Aventureiro").split(" ")[0], x + 15, y - 5);
        ctx.textAlign = "left";
    });
}

function desenharAventureiro(x, y, roupa) {
    const visual = ROUPAS_AVENTUREIRO[roupa] || ROUPAS_AVENTUREIRO.azul;
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(x + 15, y + 29, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = visual.corpo; ctx.fillRect(x + 6, y + 14, 18, 15);
    ctx.fillStyle = visual.detalhe; ctx.fillRect(x + 6, y + 16, 18, 3);
    ctx.fillStyle = "#f4d3ba"; ctx.beginPath(); ctx.arc(x + 15, y + 10, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = visual.chapeu; ctx.fillRect(x + 4, y + 2, 22, 7); ctx.fillRect(x + 19, y + 7, 10, 3);
}

function desenharJogador() {
    const x = jogador.x, y = jogador.y;
    if (localStorage.getItem("rastroAstral") === "true") {
        ctx.fillStyle = "rgba(116, 240, 255, .8)";
        [[-9, 23, 3], [-17, 29, 2], [-24, 18, 2]].forEach(([dx, dy, raio]) => {
            ctx.beginPath(); ctx.arc(x + dx, y + dy, raio, 0, Math.PI * 2); ctx.fill();
        });
    }
    desenharAventureiro(x, y, perfilJogador?.roupa);
}

function desenharInteragir() {
    const alvo = perto(guardia) ? guardia : fonte;
    ctx.fillStyle = "#fff2a0"; ctx.font = "bold 15px Trebuchet MS"; ctx.textAlign = "center";
    ctx.fillText("E", alvo.x + 12, alvo.y - 8);
    ctx.textAlign = "left";
}

function mover() {
    if (!iniciada || emBatalha) return;
    let dx = 0, dy = 0;
    if (teclas.has("arrowleft") || teclas.has("a")) dx -= jogador.velocidade;
    if (teclas.has("arrowright") || teclas.has("d")) dx += jogador.velocidade;
    if (teclas.has("arrowup") || teclas.has("w")) dy -= jogador.velocidade;
    if (teclas.has("arrowdown") || teclas.has("s")) dy += jogador.velocidade;
    const andando = dx !== 0 || dy !== 0;
    if (dx && !bloqueado(jogador.x + dx, jogador.y)) jogador.x += dx;
    if (dy && !bloqueado(jogador.x, jogador.y + dy)) jogador.y += dy;

    const naArena = estaNaArena();
    arenaOnlineEl.classList.toggle("escondido", !naArena && !dueloAtual);
    if (andando && jogadorOnline && Date.now() - ultimoEnvioOnline > 650) void atualizarPresencaOnline();

    cristaisNoMapa = cristaisNoMapa.filter(cristal => {
        if (Math.hypot(jogador.x + 15 - cristal.x, jogador.y + 15 - cristal.y) < 25) {
            cristais++; pontos += 12; falar("🔷 Você encontrou um cristal de energia! <b>+12 pontos</b>"); atualizarHud(); return false;
        }
        return true;
    });

    cooldownEncontro = Math.max(0, cooldownEncontro - 1);
    const tipoAtual = celula(Math.floor((jogador.x + 15) / TAM), Math.floor((jogador.y + 15) / TAM));
    if (andando && ["G", "M"].includes(tipoAtual) && cooldownEncontro === 0 && Math.random() < .0017) iniciarBatalha();
}

function textoSeguro(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = String(valor || "Aventureiro");
    return elemento.innerHTML;
}

function obterAlunoLogado() {
    try {
        const aluno = JSON.parse(localStorage.getItem("alunoLogado") || "null");
        return aluno?.id ? aluno : null;
    } catch {
        return null;
    }
}

async function carregarPerfilJogador() {
    const aluno = obterAlunoLogado();
    if (!aluno) return null;

    const { data, error } = await supabase
        .from("rpg_perfis_jogador")
        .select("aluno_id,nickname,roupa")
        .eq("aluno_id", String(aluno.id))
        .maybeSingle();

    if (error) {
        console.error("ERRO AO CARREGAR PERFIL RPG:", error);
        return null;
    }
    perfilJogador = data || null;
    return perfilJogador;
}

function selecionarRoupa(roupa) {
    roupaEscolhida = ROUPAS_AVENTUREIRO[roupa] ? roupa : "azul";
    botoesRoupa.forEach(botao => botao.classList.toggle("selecionada", botao.dataset.roupa === roupaEscolhida));
}

function mostrarCriacaoDePerfil() {
    erroPerfilRpg.textContent = "";
    selecionarRoupa("azul");
    perfilRpgEl.classList.remove("escondido");
    nicknameRpgInput.focus();
}

async function salvarPerfilDeAventureiro() {
    const aluno = obterAlunoLogado();
    const nickname = nicknameRpgInput.value.trim().replace(/\s+/g, " ");
    if (!aluno) {
        erroPerfilRpg.textContent = "Entre como aluno para criar seu personagem online.";
        return;
    }
    if (!/^[A-Za-zÀ-ÿ0-9 _-]{3,16}$/.test(nickname)) {
        erroPerfilRpg.textContent = "Use de 3 a 16 caracteres válidos no nickname.";
        return;
    }

    salvarPerfilRpg.disabled = true;
    salvarPerfilRpg.textContent = "SALVANDO...";
    const { data, error } = await supabase
        .from("rpg_perfis_jogador")
        .insert({ aluno_id: String(aluno.id), nickname, roupa: roupaEscolhida })
        .select("aluno_id,nickname,roupa")
        .single();

    salvarPerfilRpg.disabled = false;
    salvarPerfilRpg.textContent = "CONFIRMAR PERSONAGEM →";
    if (error) {
        console.error("ERRO AO SALVAR PERFIL RPG:", error);
        erroPerfilRpg.textContent = error.code === "23505"
            ? "Esse nickname já está em uso ou você já criou um perfil."
            : "Não foi possível salvar seu perfil agora.";
        return;
    }

    perfilJogador = data;
    perfilRpgEl.classList.add("escondido");
    await iniciarModoOnline();
    await resetarAventura();
}

async function iniciarAventura() {
    const aluno = obterAlunoLogado();
    if (!aluno) {
        await resetarAventura();
        return;
    }
    const perfil = await carregarPerfilJogador();
    if (!perfil) {
        mostrarCriacaoDePerfil();
        return;
    }
    await iniciarModoOnline();
    await resetarAventura();
}

function obterJogadorOnline() {
    const aluno = obterAlunoLogado();
    if (!aluno || !perfilJogador?.nickname) return null;
    return { id: String(aluno.id), nome: perfilJogador.nickname, roupa: perfilJogador.roupa || "azul" };
}

function atualizarStatusOnline(conectado, texto) {
    statusOnline.classList.toggle("conectado", conectado);
    statusOnline.classList.toggle("desligado", !conectado);
    statusOnline.textContent = `● ${texto}`;
}

function atualizarOutrosJogadores(registros) {
    outrosJogadores.clear();
    const limite = Date.now() - 90000;
    (registros || []).forEach(registro => {
        if (registro.jogador_id !== jogadorOnline?.id && new Date(registro.updated_at).getTime() > limite) {
            outrosJogadores.set(registro.jogador_id, registro);
        }
    });
    atualizarHud();
}

async function atualizarPresencaOnline() {
    if (!jogadorOnline) return;
    ultimoEnvioOnline = Date.now();
    const { error } = await supabase.from("rpg_presencas_online").upsert({
        sala_id: "bosque-principal", jogador_id: jogadorOnline.id, jogador_nome: jogadorOnline.nome,
        roupa: jogadorOnline.roupa, x: Math.round(jogador.x), y: Math.round(jogador.y), nivel, hp: vida, pontos
    }, { onConflict: "sala_id,jogador_id" });
    if (error) {
        console.error("PRESENÇA ONLINE RPG:", error);
        atualizarStatusOnline(false, "MODO LOCAL");
    }
}

async function carregarJogadoresOnline() {
    const { data, error } = await supabase.from("rpg_presencas_online").select("*").eq("sala_id", "bosque-principal");
    if (error) throw error;
    atualizarOutrosJogadores(data);
}

async function iniciarModoOnline() {
    jogadorOnline = obterJogadorOnline();
    if (!jogadorOnline) {
        atualizarStatusOnline(false, obterAlunoLogado() ? "DEFINA SEU NICK" : "ENTRE COMO ALUNO");
        return;
    }
    if (modoOnlineIniciado) {
        await atualizarPresencaOnline();
        return;
    }
    try {
        await carregarJogadoresOnline();
        await atualizarPresencaOnline();
        canalPresenca = supabase.channel("rpg-presencas-bosque")
            .on("postgres_changes", { event: "*", schema: "public", table: "rpg_presencas_online" }, payload => {
                const registro = payload.new || payload.old;
                if (!registro || registro.sala_id !== "bosque-principal" || registro.jogador_id === jogadorOnline.id) return;
                if (payload.eventType === "DELETE") outrosJogadores.delete(registro.jogador_id);
                else outrosJogadores.set(registro.jogador_id, registro);
                atualizarHud();
            })
            .subscribe();
        canalDuelos = supabase.channel("rpg-duelos-arena")
            .on("postgres_changes", { event: "*", schema: "public", table: "rpg_duelos_online" }, () => { void carregarDuelos(); })
            .subscribe();
        await carregarDuelos();
        modoOnlineIniciado = true;
        atualizarStatusOnline(true, "ONLINE");
    } catch (error) {
        console.error("MODO ONLINE RPG:", error);
        atualizarStatusOnline(false, "MODO LOCAL");
    }
}

function atualizarInterfaceDuelo() {
    const duelo = dueloAtual;
    const meuId = jogadorOnline?.id;
    if (!duelo || !meuId) {
        botoesDuelo.forEach(botao => { botao.disabled = true; });
        return;
    }
    const souDesafiante = duelo.desafiante_id === meuId;
    const meuNome = souDesafiante ? duelo.desafiante_nome : duelo.desafiado_nome;
    const outroNome = souDesafiante ? duelo.desafiado_nome : duelo.desafiante_nome;
    const minhaVida = souDesafiante ? duelo.vida_desafiante : duelo.vida_desafiado;
    const vidaOponente = souDesafiante ? duelo.vida_desafiado : duelo.vida_desafiante;
    const minhaVez = duelo.status === "ativo" && duelo.turno_jogador_id === meuId;
    arenaOnlineEl.classList.remove("escondido");
    textoDuelo.innerHTML = `<b>${textoSeguro(meuNome)}</b> ${minhaVida} HP <b>VS</b> ${textoSeguro(outroNome)} ${vidaOponente} HP<br><small>${textoSeguro(duelo.ultimo_evento)}${minhaVez ? " • É sua vez!" : ""}</small>`;
    botoesDuelo.forEach(botao => { botao.disabled = !minhaVez; });
}

function mostrarDesafiosPendentes(duelos) {
    const pendentes = (duelos || []).filter(duelo => duelo.status === "pendente" && duelo.desafiado_id === jogadorOnline?.id);
    desafiosOnlineEl.classList.toggle("escondido", pendentes.length === 0);
    desafiosOnlineEl.innerHTML = pendentes.map(duelo => `
        <p>⚔️ <b>${textoSeguro(duelo.desafiante_nome)}</b> desafiou você na Arena Lunar.</p>
        <button type="button" data-resposta="aceitar" data-duelo-id="${duelo.id}">ACEITAR</button>
        <button type="button" data-resposta="recusar" data-duelo-id="${duelo.id}">RECUSAR</button>
    `).join("");
}

async function carregarDuelos() {
    if (!jogadorOnline) return;
    const { data, error } = await supabase.from("rpg_duelos_online").select("*")
        .or(`desafiante_id.eq.${jogadorOnline.id},desafiado_id.eq.${jogadorOnline.id}`)
        .order("updated_at", { ascending: false }).limit(8);
    if (error) { console.error("DUELOS ONLINE RPG:", error); return; }
    let duelos = data || [];

    // Corrige desafios antigos que foram aceitos quando o turno inicial
    // era salvo vazio. O desafiante sempre começa a batalha.
    const dueloSemTurno = duelos.find(duelo => duelo.status === "ativo" && !duelo.turno_jogador_id);
    if (dueloSemTurno) {
        const { data: dueloCorrigido, error: erroCorrecao } = await supabase
            .from("rpg_duelos_online")
            .update({
                turno_jogador_id: dueloSemTurno.desafiante_id,
                ultimo_evento: "Duelo iniciado! O desafiante começa."
            })
            .eq("id", dueloSemTurno.id)
            .is("turno_jogador_id", null)
            .select()
            .maybeSingle();

        if (erroCorrecao) console.error("CORREÇÃO DO TURNO DO DUELO:", erroCorrecao);
        if (dueloCorrigido) duelos = duelos.map(duelo => duelo.id === dueloCorrigido.id ? dueloCorrigido : duelo);
    }

    mostrarDesafiosPendentes(duelos);
    dueloAtual = duelos.find(duelo => duelo.status === "ativo") || null;
    atualizarInterfaceDuelo();
}

async function desafiarJogadorProximo() {
    if (!jogadorOnline || dueloAtual) return;
    const naArena = estaNaArena();
    if (!naArena) { falar("⚔️ Vá até a <b>Arena Lunar</b> para desafiar alguém."); return; }
    const alvo = [...outrosJogadores.values()].find(outro => Math.hypot(jogador.x - Number(outro.x), jogador.y - Number(outro.y)) < 100);
    if (!alvo) { falar("👥 Nenhum aventureiro perto. Combine com um colega para encontrá-lo na arena!"); return; }
    const { error } = await supabase.from("rpg_duelos_online").insert({
        sala_id: "arena-lunar", desafiante_id: jogadorOnline.id, desafiante_nome: jogadorOnline.nome,
        desafiado_id: alvo.jogador_id, desafiado_nome: alvo.jogador_nome, turno_jogador_id: jogadorOnline.id
    });
    if (error) { console.error("CRIAR DUELO RPG:", error); falar("Não foi possível enviar o desafio agora."); return; }
    falar(`⚔️ Desafio enviado para <b>${textoSeguro(alvo.jogador_nome)}</b>!`);
}

async function responderDesafio(id, resposta) {
    const dados = resposta === "aceitar"
        ? { status: "ativo", ultimo_evento: "Duelo iniciado! O desafiante começa." }
        : { status: "recusado", ultimo_evento: "Desafio recusado." };
    const { error } = await supabase.from("rpg_duelos_online").update(dados).eq("id", id).eq("status", "pendente");
    if (error) console.error("RESPOSTA DUELO RPG:", error);
    else void carregarDuelos();
}

async function atacarNoDuelo(tipo) {
    if (!dueloAtual || dueloAtual.status !== "ativo" || dueloAtual.turno_jogador_id !== jogadorOnline?.id) return;
    const souDesafiante = dueloAtual.desafiante_id === jogadorOnline.id;
    const dano = tipo === "especial" ? aleatorio(20, 28) : aleatorio(12, 18);
    const campoOponente = souDesafiante ? "vida_desafiado" : "vida_desafiante";
    const proximaVida = Math.max(0, Number(dueloAtual[campoOponente]) - dano);
    const dados = { [campoOponente]: proximaVida, turno_jogador_id: souDesafiante ? dueloAtual.desafiado_id : dueloAtual.desafiante_id, ultimo_evento: `${jogadorOnline.nome} causou ${dano} de dano.` };
    if (proximaVida === 0) {
        dados.status = "encerrado";
        dados.ultimo_evento = `${jogadorOnline.nome} venceu o duelo!`;
        pontos += 100; experiencia += 30; atualizarHud(); void salvarRecorde();
    }
    const { error } = await supabase.from("rpg_duelos_online").update(dados).eq("id", dueloAtual.id).eq("turno_jogador_id", jogadorOnline.id);
    if (error) console.error("ATAQUE DUELO RPG:", error);
    else void carregarDuelos();
}

function interagir() {
    if (!iniciada || emBatalha || Date.now() - ultimoInteragir < 500) return;
    ultimoInteragir = Date.now();
    if (perto(fonte)) {
        vida = maxVida();
        sincronizarVidaAtiva();
        atualizarHud();
        falar(`💧 A Fonte Astral restaurou toda a energia de ${criaturaAtiva()?.nome || "Fagulha"}!`);
        return;
    }
    if (perto(guardia)) {
        cristais++; pontos += 20; atualizarHud();
        falar("🧙‍♀️ Guardiã: cada criatura é uma lenda. Tome um cristal e use a sintonia quando ela estiver cansada! <b>+20 pontos</b>");
        jogador.x -= 5;
        return;
    }
    falar("Explore a <b>grama alta</b> para encontrar criaturas. A fonte recupera sua energia.");
}

function sortearCriaturaSelvagem() {
    const pesoTotal = criaturasSelvagens.reduce((total, criatura) => total + criatura.peso, 0);
    let sorteio = Math.random() * pesoTotal;
    for (const criatura of criaturasSelvagens) {
        sorteio -= criatura.peso;
        if (sorteio <= 0) return criatura;
    }
    return criaturasSelvagens[0];
}

function iniciarBatalha() {
    const base = sortearCriaturaSelvagem();
    const extra = (nivel - 1) * 7;
    inimigo = { ...base, hpMax: base.hp + extra, hp: base.hp + extra, ataque: base.ataque + Math.floor((nivel - 1) / 2) };
    emBatalha = true; turnoOcupado = false;
    batalhaEl.classList.remove("escondido"); habilitarAcoes(true); atualizarHud();
    falar(`⚠️ Uma criatura <b>${inimigo.raridade.toLowerCase()}</b> apareceu: <b>${inimigo.nome}</b>! Escolha sua ação.`);
}

function habilitarAcoes(ativo) {
    acoes.forEach(botao => { botao.disabled = !ativo; });
    if (!ativo) painelTroca.classList.add("escondido");
    if (botaoTrocar) {
        const reservasVivas = timeBatalha.filter((criatura, indice) => indice !== indiceCriaturaAtiva && criatura.vida > 0).length;
        botaoTrocar.disabled = !ativo || reservasVivas === 0;
    }
}

function causarDano(valor) { inimigo.hp = limitar(inimigo.hp - valor, 0, inimigo.hpMax); atualizarHud(); }

function receberAtaque() {
    if (!emBatalha || !inimigo) return;
    const ativa = criaturaAtiva();
    const dano = aleatorio(Math.max(5, inimigo.ataque - 3), inimigo.ataque + 3);
    vida = limitar(vida - dano, 0, maxVida());
    sincronizarVidaAtiva();
    atualizarHud();
    if (vida <= 0) {
        const reserva = timeBatalha.findIndex((criatura, indice) => indice !== indiceCriaturaAtiva && criatura.vida > 0);
        if (reserva >= 0) {
            const nomeQueCaiu = ativa?.nome || "Sua criatura";
            trocarCriatura(reserva, true);
            turnoOcupado = false;
            habilitarAcoes(true);
            falar(`💫 ${nomeQueCaiu} ficou sem energia! <b>${criaturaAtiva().nome}</b> entrou automaticamente.`);
            return;
        }
        falar(`💫 ${ativa?.nome || "Seu time"} ficou sem energia. A Guardiã levou você de volta ao início. <b>Recorde salvo: ${pontos}</b>`);
        finalizarAventura(); return;
    }
    turnoOcupado = false; habilitarAcoes(true);
    falar(`💥 ${inimigo.nome} revidou com <b>${dano} de dano</b>. Sua vez!`);
}

async function registrarCriaturaCapturada(criatura) {
    const salvo = localStorage.getItem("alunoLogado");
    if (!salvo || !criatura?.chave) return;

    let aluno;
    try { aluno = JSON.parse(salvo); } catch { return; }
    if (!aluno?.id) return;

    const alunoId = String(aluno.id);
    const { data: existente, error: erroBusca } = await supabase
        .from("rpg_criaturas_aluno")
        .select("id,capturas,nivel")
        .eq("aluno_id", alunoId)
        .eq("chave", criatura.chave)
        .maybeSingle();

    if (erroBusca) {
        console.error("ERRO AO BUSCAR CRIATURA:", erroBusca);
        return;
    }

    const operacao = existente
        ? supabase.from("rpg_criaturas_aluno").update({
            capturas: Number(existente.capturas || 1) + 1,
            nivel: Math.max(Number(existente.nivel || 1), nivel)
        }).eq("id", existente.id)
        : supabase.from("rpg_criaturas_aluno").insert({
            aluno_id: alunoId,
            chave: criatura.chave,
            nome: criatura.nome,
            elemento: criatura.tipo,
            nivel,
            capturas: 1
        });

    const { error } = await operacao;
    if (error) console.error("ERRO AO SALVAR CRIATURA:", error);
}

function ganharBatalha(capturada) {
    const ganhoXp = capturada ? 52 : 38;
    pontos += inimigo.premio + (capturada ? 35 : 0);
    cristais += 1;
    experiencia += ganhoXp;
    if (capturada) {
        capturados++;
        void registrarCriaturaCapturada(inimigo);
    }
    let subiu = false;
    while (experiencia >= nivel * 80) { experiencia -= nivel * 80; nivel++; vida = maxVida(); sincronizarVidaAtiva(); subiu = true; }
    const nome = inimigo.nome;
    const raridade = inimigo.raridade || "COMUM";
    emBatalha = false; turnoOcupado = false; batalhaEl.classList.add("escondido"); painelTroca.classList.add("escondido"); habilitarAcoes(false);
    cooldownEncontro = 360; atualizarHud();
    void salvarRecorde();
    falar(`${capturada ? `🔮 ${nome} (${raridade}) entrou na sua coleção` : "🏅 Vitória"}! ${nome} concedeu energia. <b>+${inimigo.premio + (capturada ? 35 : 0)} pontos</b>${subiu ? ` • 🌟 ${criaturaAtiva()?.nome || "Seu time"} chegou ao nível ${nivel}!` : ""}`);
    inimigo = null;
}

function finalizarAventura() {
    emBatalha = false; iniciada = false; turnoOcupado = false; batalhaEl.classList.add("escondido"); painelTroca.classList.add("escondido"); habilitarAcoes(false);
    void salvarRecorde();
    inicio.innerHTML = `<span class="emblema-rpg" aria-hidden="true">↻</span><p class="rpg-kicker">AVENTURA ENCERRADA</p><h2>Seu placar foi salvo</h2><p>Você terminou com <b>${pontos} pontos</b> e encontrou ${capturados} criatura${capturados === 1 ? "" : "s"}.</p><button type="button" id="reiniciar">▶ NOVA AVENTURA</button>`;
    inicio.classList.remove("escondido");
    document.getElementById("reiniciar").addEventListener("click", resetarAventura);
}

async function resetarAventura() {
    pontos = 0; cristais = 2; nivel = 1; experiencia = 0; vida = 100; capturados = 0; inimigo = null; cooldownEncontro = 120;
    jogador.x = 3 * TAM + 12; jogador.y = 5 * TAM + 7;
    cristaisNoMapa = [
        { x: 7 * TAM + 20, y: 2 * TAM + 20 }, { x: 11 * TAM + 18, y: 7 * TAM + 20 },
        { x: 17 * TAM + 15, y: 5 * TAM + 20 }, { x: 8 * TAM + 20, y: 12 * TAM + 15 },
        { x: 15 * TAM + 15, y: 15 * TAM + 20 }, { x: 18 * TAM + 15, y: 18 * TAM + 20 },
        { x: 24 * TAM + 15, y: 10 * TAM + 20 }, { x: 30 * TAM + 15, y: 15 * TAM + 20 },
        { x: 28 * TAM + 15, y: 4 * TAM + 20 }, { x: 38 * TAM + 15, y: 18 * TAM + 20 },
        { x: 45 * TAM + 15, y: 12 * TAM + 20 }, { x: 46 * TAM + 15, y: 28 * TAM + 20 },
        { x: 12 * TAM + 15, y: 27 * TAM + 20 }, { x: 17 * TAM + 15, y: 31 * TAM + 20 }
    ];
    await prepararTimeBatalha();
    iniciada = true; inicio.classList.add("escondido"); canvas.focus(); atualizarHud();
    falar(`🌲 A aventura recomeçou com <b>${criaturaAtiva()?.nome || "Fagulha"}</b> na frente. Procure a guardiã e siga pela grama alta!`);
}

async function salvarRecorde() {
    if (pontos <= 0) return;
    if (pontos > recorde) { recorde = pontos; localStorage.setItem("lendasBosqueRecorde", String(recorde)); atualizarHud(); }
    const salvo = localStorage.getItem("alunoLogado");
    if (!salvo) return;
    let aluno;
    try { aluno = JSON.parse(salvo); } catch { return; }
    if (!aluno?.id) return;
    const { data: existente, error: erroBusca } = await supabase.from("recordes_games").select("id,pontuacao").eq("aluno_id", aluno.id).eq("jogo", "lendas-do-bosque").maybeSingle();
    if (erroBusca) { console.error("ERRO AO BUSCAR RECORDE RPG:", erroBusca); return; }
    if (existente && Number(existente.pontuacao) >= pontos) return;
    const operacao = existente
        ? supabase.from("recordes_games").update({ pontuacao: pontos }).eq("id", existente.id)
        : supabase.from("recordes_games").insert({ aluno_id: aluno.id, jogo: "lendas-do-bosque", pontuacao: pontos });
    const { error } = await operacao;
    if (error) console.error("ERRO AO SALVAR RECORDE RPG:", error);
}

acoes.forEach(botao => botao.addEventListener("click", () => {
    if (!emBatalha || turnoOcupado) return;
    const acao = botao.dataset.acao;
    const ativa = criaturaAtiva() || criaturaInicial;
    if (acao === "ataque") {
        const golpe = ativa.golpes[0];
        turnoOcupado = true; habilitarAcoes(false); const dano = aleatorio(golpe.min, golpe.max); causarDano(dano); falar(`⚔️ ${ativa.nome} usou <b>${golpe.nome}</b> e causou <b>${dano} de dano</b>!`);
    } else if (acao === "especial") {
        const golpe = ativa.golpes[1];
        const custo = golpe.custo || 1;
        if (cristais < custo) { falar(`🔷 Você precisa de ${custo} ${custo === 1 ? "cristal" : "cristais"} para usar ${golpe.nome}.`); return; }
        turnoOcupado = true; habilitarAcoes(false); cristais -= custo; const dano = aleatorio(golpe.min, golpe.max); causarDano(dano); falar(`✨ ${ativa.nome} usou <b>${golpe.nome}</b>! <b>${dano} de dano</b> causado.`);
    } else if (acao === "cura") {
        if (cristais < 2) { falar("🔷 Você precisa de 2 cristais para se curar."); return; }
        turnoOcupado = true; habilitarAcoes(false); cristais -= 2; const cura = aleatorio(26, 38); vida = limitar(vida + cura, 0, maxVida()); sincronizarVidaAtiva(); atualizarHud(); falar(`🧪 ${ativa.nome} recuperou <b>${cura} de energia</b>.`);
    } else {
        if (cristais < 1) { falar("🔷 Você precisa de 1 cristal para fazer sintonia."); return; }
        turnoOcupado = true; habilitarAcoes(false); cristais--;
        const multiplicadorRaridade = { COMUM: 1, RARA: .82, ÉPICA: .62, LENDÁRIA: .42 };
        const chance = (.22 + (1 - inimigo.hp / inimigo.hpMax) * .55) * (multiplicadorRaridade[inimigo.raridade] || 1);
        if (Math.random() < chance) { ganharBatalha(true); return; }
        falar("🔮 A sintonia quase aconteceu... mas a criatura resistiu!"); atualizarHud();
    }
    if (inimigo.hp <= 0) { ganharBatalha(false); return; }
    setTimeout(receberAtaque, 650);
}));

botaoTrocar.addEventListener("click", abrirTrocaCriatura);
painelTroca.addEventListener("click", event => {
    const botao = event.target.closest("[data-indice-troca]");
    if (botao) trocarCriaturaManual(Number(botao.dataset.indiceTroca));
});

function campoDeTextoAtivo(elemento) {
    return elemento instanceof HTMLInputElement || elemento instanceof HTMLTextAreaElement || elemento?.isContentEditable;
}

window.addEventListener("keydown", event => {
    if (campoDeTextoAtivo(event.target)) return;
    const tecla = event.key.toLowerCase();
    if (["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d", "e", "b"].includes(tecla)) event.preventDefault();
    teclas.add(tecla);
    if (tecla === "e") interagir();
    if (tecla === "b") void desafiarJogadorProximo();
});
window.addEventListener("keyup", event => {
    if (!campoDeTextoAtivo(event.target)) teclas.delete(event.key.toLowerCase());
});
botoesRoupa.forEach(botao => botao.addEventListener("click", () => selecionarRoupa(botao.dataset.roupa)));
salvarPerfilRpg.addEventListener("click", () => void salvarPerfilDeAventureiro());
iniciar.addEventListener("click", () => void iniciarAventura());
botoesDuelo.forEach(botao => botao.addEventListener("click", () => void atacarNoDuelo(botao.dataset.dueloAcao)));
desafiosOnlineEl.addEventListener("click", event => {
    const botao = event.target.closest("[data-resposta]");
    if (botao) void responderDesafio(botao.dataset.dueloId, botao.dataset.resposta);
});

function loop() { mover(); desenharMapa(); requestAnimationFrame(loop); }
atualizarHud(); desenharMapa(); void iniciarModoOnline(); loop();
