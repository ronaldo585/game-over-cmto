import { supabase } from "../supabase.js";

const canvas = document.getElementById("mundo");
const ctx = canvas.getContext("2d");
const inicio = document.getElementById("inicio");
const iniciar = document.getElementById("iniciar");
const mensagem = document.getElementById("mensagem");
const batalhaEl = document.getElementById("batalha");
const acoes = [...document.querySelectorAll("[data-acao]")];

const hud = {
    pontos: document.getElementById("pontos"), cristais: document.getElementById("cristais"),
    nivel: document.getElementById("nivel"), capturados: document.getElementById("capturados"),
    recorde: document.getElementById("recorde"), nivelCriatura: document.getElementById("nivelCriatura"),
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
const COLUNAS = 34;
const LINHAS = 22;

function criarMapa() {
    const novoMapa = Array.from({ length: LINHAS }, (_, y) =>
        Array.from({ length: COLUNAS }, (_, x) =>
            x === 0 || y === 0 || x === COLUNAS - 1 || y === LINHAS - 1 ? "T" : "G"
        )
    );

    for (let y = 2; y < LINHAS - 2; y++) novoMapa[y][5] = "P";
    for (let x = 5; x < 28; x++) novoMapa[7][x] = "P";
    for (let y = 7; y < 17; y++) novoMapa[y][27] = "P";
    for (let x = 22; x < 32; x++) novoMapa[17][x] = "P";

    for (let y = 12; y <= 18; y++) {
        for (let x = 22; x <= 31; x++) novoMapa[y][x] = "A";
    }
    for (let x = 9; x <= 14; x++) novoMapa[4][x] = ".";
    for (let y = 3; y <= 6; y++) novoMapa[y][11] = ".";

    return novoMapa.map(linha => linha.join(""));
}

const mapa = criarMapa();

const teclas = new Set();
const jogador = { x: 3 * TAM + 12, y: 5 * TAM + 7, tamanho: 30, velocidade: 2.45 };
const guardia = { x: 11 * TAM + 15, y: 4 * TAM + 7 };
const fonte = { x: 4 * TAM + 12, y: 8 * TAM + 9 };
const arena = { x: 27 * TAM + 24, y: 15 * TAM + 24 };
let cristaisNoMapa = [
    { x: 7 * TAM + 20, y: 2 * TAM + 20 }, { x: 11 * TAM + 18, y: 7 * TAM + 20 },
    { x: 17 * TAM + 15, y: 5 * TAM + 20 }, { x: 8 * TAM + 20, y: 9 * TAM + 15 },
    { x: 20 * TAM + 15, y: 15 * TAM + 20 }, { x: 30 * TAM + 15, y: 9 * TAM + 20 },
    { x: 28 * TAM + 15, y: 19 * TAM + 20 }
];

const criaturasSelvagens = [
    { nome: "Muscante", tipo: "NATUREZA", icone: "🌿", cor: "#8be39b", hp: 52, ataque: 10, premio: 55 },
    { nome: "Brilux", tipo: "LUZ", icone: "✨", cor: "#ffe475", hp: 44, ataque: 13, premio: 65 },
    { nome: "Pedrino", tipo: "PEDRA", icone: "🪨", cor: "#c4a682", hp: 66, ataque: 9, premio: 75 }
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
let capturados = 0;
let recorde = Number(localStorage.getItem("lendasBosqueRecorde")) || 0;
let jogadorOnline = null;
let canalPresenca = null;
let canalDuelos = null;
let ultimoEnvioOnline = 0;
let dueloAtual = null;
const outrosJogadores = new Map();

hud.recorde.textContent = recorde;

function maxVida() { return 100 + (nivel - 1) * 12; }
function limitar(valor, min, max) { return Math.max(min, Math.min(max, valor)); }
function aleatorio(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function falar(texto) { mensagem.innerHTML = texto; }

function atualizarHud() {
    hud.pontos.textContent = pontos;
    hud.cristais.textContent = cristais;
    hud.nivel.textContent = nivel;
    hud.capturados.textContent = capturados;
    hud.recorde.textContent = Math.max(recorde, pontos);
    jogadoresOnlineEl.textContent = outrosJogadores.size + (jogadorOnline ? 1 : 0);
    hud.nivelCriatura.textContent = `Nv. ${nivel}`;
    hud.vidaJogador.style.width = `${(vida / maxVida()) * 100}%`;
    hud.vidaJogadorTexto.textContent = `${vida} / ${maxVida()}`;

    if (inimigo) {
        hud.nomeInimigo.textContent = inimigo.nome;
        hud.tipoInimigo.textContent = `${inimigo.tipo} SELVAGEM`;
        const classeDoSprite = inimigo.nome === "Muscante"
            ? "sprite-musgo"
            : inimigo.nome === "Brilux"
                ? "sprite-lunar"
                : "sprite-musgo";
        hud.iconeInimigo.classList.remove("sprite-musgo", "sprite-lunar", "sprite-fagulha");
        hud.iconeInimigo.classList.add(classeDoSprite);
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

function desenharMapa() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cameraX = limitar(jogador.x - canvas.width / 2 + 15, 0, COLUNAS * TAM - canvas.width);
    const cameraY = limitar(jogador.y - canvas.height / 2 + 15, 0, LINHAS * TAM - canvas.height);
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    for (let y = 0; y < mapa.length; y++) {
        for (let x = 0; x < mapa[y].length; x++) {
            const tipo = mapa[y][x];
            const px = x * TAM;
            const py = y * TAM;
            ctx.fillStyle = tipo === "A" ? "#3a285c" : tipo === "W" ? "#176490" : tipo === "P" ? "#c69b67" : "#317b58";
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

    ctx.fillStyle = "rgba(4, 17, 27, .68)";
    ctx.fillRect(10, 10, 200, 29);
    ctx.fillStyle = "#d7fcff";
    ctx.font = "bold 12px Trebuchet MS";
    ctx.fillText("🌿 BOSQUE PRINCIPAL", 18, 29);
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
    ctx.strokeStyle = "#ffe375";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(arena.x, arena.y, 104, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#fff0a4";
    ctx.font = "bold 14px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("ARENA LUNAR", arena.x, arena.y + 4);
    ctx.textAlign = "left";
}

function desenharCriaturasNoMato() {
    const criaturas = [
        { x: 16 * TAM + 16, y: 3 * TAM + 12, icone: "🌿" },
        { x: 21 * TAM + 17, y: 10 * TAM + 12, icone: "✨" },
        { x: 30 * TAM + 14, y: 7 * TAM + 14, icone: "🪨" },
        { x: 13 * TAM + 17, y: 17 * TAM + 11, icone: "🔥" }
    ];
    ctx.font = "22px sans-serif";
    criaturas.forEach(criatura => ctx.fillText(criatura.icone, criatura.x, criatura.y));
}

function desenharJogadoresOnline() {
    outrosJogadores.forEach(outro => {
        const x = Number(outro.x), y = Number(outro.y);
        ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(x + 15, y + 29, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#80d4ff"; ctx.fillRect(x + 6, y + 14, 18, 15);
        ctx.fillStyle = "#f4d3ba"; ctx.beginPath(); ctx.arc(x + 15, y + 10, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#173e75"; ctx.fillRect(x + 4, y + 2, 22, 7);
        ctx.fillStyle = "#efffff"; ctx.font = "bold 11px Trebuchet MS"; ctx.textAlign = "center";
        ctx.fillText(String(outro.jogador_nome || "Aventureiro").split(" ")[0], x + 15, y - 5);
        ctx.textAlign = "left";
    });
}

function desenharJogador() {
    const x = jogador.x, y = jogador.y;
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(x + 15, y + 29, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f68b4a"; ctx.fillRect(x + 6, y + 14, 18, 15);
    ctx.fillStyle = "#fbdbc2"; ctx.beginPath(); ctx.arc(x + 15, y + 10, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#193a5b"; ctx.fillRect(x + 4, y + 2, 22, 7); ctx.fillRect(x + 19, y + 7, 10, 3);
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

    const naArena = Math.hypot(jogador.x + 15 - arena.x, jogador.y + 15 - arena.y) < 130;
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
    if (andando && tipoAtual === "G" && cooldownEncontro === 0 && Math.random() < .0017) iniciarBatalha();
}

function textoSeguro(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = String(valor || "Aventureiro");
    return elemento.innerHTML;
}

function obterJogadorOnline() {
    try {
        const aluno = JSON.parse(localStorage.getItem("alunoLogado") || "null");
        if (!aluno?.id) return null;
        return { id: String(aluno.id), nome: String(aluno.nome || "Aventureiro").trim().split(/\s+/).slice(0, 2).join(" ") };
    } catch {
        return null;
    }
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
        x: Math.round(jogador.x), y: Math.round(jogador.y), nivel, hp: vida, pontos
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
        atualizarStatusOnline(false, "ENTRE COMO ALUNO");
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
    mostrarDesafiosPendentes(data);
    dueloAtual = (data || []).find(duelo => duelo.status === "ativo") || null;
    atualizarInterfaceDuelo();
}

async function desafiarJogadorProximo() {
    if (!jogadorOnline || dueloAtual) return;
    const naArena = Math.hypot(jogador.x + 15 - arena.x, jogador.y + 15 - arena.y) < 140;
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
        ? { status: "ativo", turno_jogador_id: null, ultimo_evento: "Duelo iniciado! O desafiante começa." }
        : { status: "recusado", ultimo_evento: "Desafio recusado." };
    const { error } = await supabase.from("rpg_duelos_online").update(dados).eq("id", id);
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
        vida = maxVida(); atualizarHud(); falar("💧 A Fonte Astral restaurou toda a energia de Fagulha!"); return;
    }
    if (perto(guardia)) {
        cristais++; pontos += 20; atualizarHud();
        falar("🧙‍♀️ Guardiã: cada criatura é uma lenda. Tome um cristal e use a sintonia quando ela estiver cansada! <b>+20 pontos</b>");
        jogador.x -= 5;
        return;
    }
    falar("Explore a <b>grama alta</b> para encontrar criaturas. A fonte recupera sua energia.");
}

function iniciarBatalha() {
    const base = criaturasSelvagens[aleatorio(0, criaturasSelvagens.length - 1)];
    const extra = (nivel - 1) * 7;
    inimigo = { ...base, hpMax: base.hp + extra, hp: base.hp + extra, ataque: base.ataque + Math.floor((nivel - 1) / 2) };
    emBatalha = true; turnoOcupado = false;
    batalhaEl.classList.remove("escondido"); habilitarAcoes(true); atualizarHud();
    falar(`⚠️ Uma criatura selvagem apareceu: <b>${inimigo.nome}</b>! Escolha sua ação.`);
}

function habilitarAcoes(ativo) { acoes.forEach(botao => { botao.disabled = !ativo; }); }

function causarDano(valor) { inimigo.hp = limitar(inimigo.hp - valor, 0, inimigo.hpMax); atualizarHud(); }

function receberAtaque() {
    if (!emBatalha || !inimigo) return;
    const dano = aleatorio(Math.max(5, inimigo.ataque - 3), inimigo.ataque + 3);
    vida = limitar(vida - dano, 0, maxVida()); atualizarHud();
    if (vida <= 0) {
        falar(`💫 Fagulha ficou sem energia. A Guardiã levou você de volta ao início. <b>Recorde salvo: ${pontos}</b>`);
        finalizarAventura(); return;
    }
    turnoOcupado = false; habilitarAcoes(true);
    falar(`💥 ${inimigo.nome} revidou com <b>${dano} de dano</b>. Sua vez!`);
}

function ganharBatalha(capturada) {
    const ganhoXp = capturada ? 52 : 38;
    pontos += inimigo.premio + (capturada ? 35 : 0);
    cristais += 1;
    experiencia += ganhoXp;
    if (capturada) capturados++;
    let subiu = false;
    while (experiencia >= nivel * 80) { experiencia -= nivel * 80; nivel++; vida = maxVida(); subiu = true; }
    const nome = inimigo.nome;
    emBatalha = false; turnoOcupado = false; batalhaEl.classList.add("escondido"); habilitarAcoes(false);
    cooldownEncontro = 360; atualizarHud();
    void salvarRecorde();
    falar(`${capturada ? "🔮 Sintonia concluída" : "🏅 Vitória"}! ${nome} concedeu energia. <b>+${inimigo.premio + (capturada ? 35 : 0)} pontos</b>${subiu ? ` • 🌟 Fagulha chegou ao nível ${nivel}!` : ""}`);
    inimigo = null;
}

function finalizarAventura() {
    emBatalha = false; iniciada = false; turnoOcupado = false; batalhaEl.classList.add("escondido"); habilitarAcoes(false);
    void salvarRecorde();
    inicio.innerHTML = `<span class="emblema-rpg" aria-hidden="true">↻</span><p class="rpg-kicker">AVENTURA ENCERRADA</p><h2>Seu placar foi salvo</h2><p>Você terminou com <b>${pontos} pontos</b> e encontrou ${capturados} criatura${capturados === 1 ? "" : "s"}.</p><button type="button" id="reiniciar">▶ NOVA AVENTURA</button>`;
    inicio.classList.remove("escondido");
    document.getElementById("reiniciar").addEventListener("click", resetarAventura);
}

function resetarAventura() {
    pontos = 0; cristais = 2; nivel = 1; experiencia = 0; vida = 100; capturados = 0; inimigo = null; cooldownEncontro = 120;
    jogador.x = 3 * TAM + 12; jogador.y = 5 * TAM + 7;
    cristaisNoMapa = [
        { x: 7 * TAM + 20, y: 2 * TAM + 20 }, { x: 11 * TAM + 18, y: 7 * TAM + 20 },
        { x: 17 * TAM + 15, y: 5 * TAM + 20 }, { x: 8 * TAM + 20, y: 9 * TAM + 15 },
        { x: 20 * TAM + 15, y: 15 * TAM + 20 }, { x: 30 * TAM + 15, y: 9 * TAM + 20 },
        { x: 28 * TAM + 15, y: 19 * TAM + 20 }
    ];
    iniciada = true; inicio.classList.add("escondido"); canvas.focus(); atualizarHud();
    falar("🌲 A aventura recomeçou. Procure a guardiã e siga pela grama alta!");
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
    if (acao === "ataque") {
        turnoOcupado = true; habilitarAcoes(false); const dano = aleatorio(14, 20); causarDano(dano); falar(`⚔️ Fagulha usou Investida e causou <b>${dano} de dano</b>!`);
    } else if (acao === "especial") {
        if (cristais < 1) { falar("🔷 Você precisa de 1 cristal para usar Centelha."); return; }
        turnoOcupado = true; habilitarAcoes(false); cristais--; const dano = aleatorio(24, 33); causarDano(dano); falar(`✨ Centelha brilhante! <b>${dano} de dano</b> causado.`);
    } else if (acao === "cura") {
        if (cristais < 2) { falar("🔷 Você precisa de 2 cristais para se curar."); return; }
        turnoOcupado = true; habilitarAcoes(false); cristais -= 2; const cura = aleatorio(26, 38); vida = limitar(vida + cura, 0, maxVida()); atualizarHud(); falar(`🧪 Fagulha recuperou <b>${cura} de energia</b>.`);
    } else {
        if (cristais < 1) { falar("🔷 Você precisa de 1 cristal para fazer sintonia."); return; }
        turnoOcupado = true; habilitarAcoes(false); cristais--; const chance = .22 + (1 - inimigo.hp / inimigo.hpMax) * .55;
        if (Math.random() < chance) { ganharBatalha(true); return; }
        falar("🔮 A sintonia quase aconteceu... mas a criatura resistiu!"); atualizarHud();
    }
    if (inimigo.hp <= 0) { ganharBatalha(false); return; }
    setTimeout(receberAtaque, 650);
}));

window.addEventListener("keydown", event => {
    const tecla = event.key.toLowerCase();
    if (["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d", "e", "b"].includes(tecla)) event.preventDefault();
    teclas.add(tecla);
    if (tecla === "e") interagir();
    if (tecla === "b") void desafiarJogadorProximo();
});
window.addEventListener("keyup", event => teclas.delete(event.key.toLowerCase()));
iniciar.addEventListener("click", resetarAventura);
botoesDuelo.forEach(botao => botao.addEventListener("click", () => void atacarNoDuelo(botao.dataset.dueloAcao)));
desafiosOnlineEl.addEventListener("click", event => {
    const botao = event.target.closest("[data-resposta]");
    if (botao) void responderDesafio(botao.dataset.dueloId, botao.dataset.resposta);
});

function loop() { mover(); desenharMapa(); requestAnimationFrame(loop); }
atualizarHud(); desenharMapa(); void iniciarModoOnline(); loop();
