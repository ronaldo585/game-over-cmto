import { supabase } from "../supabase.js";

const SALA_ID = "bosque-orbes-principal";
const TAM = 48;
const COLUNAS = 64;
const LINHAS = 44;
const MUNDO_LARGURA = COLUNAS * TAM;
const MUNDO_ALTURA = LINHAS * TAM;
const RAIO_JOGADOR = 16;
const VELOCIDADE = 3.4;
const ARENA = { x: 49 * TAM, y: 30 * TAM, raio: 188 };
const CRISTAIS = [
    { x: 8 * TAM + 20, y: 7 * TAM + 18 }, { x: 16 * TAM + 28, y: 22 * TAM + 20 },
    { x: 26 * TAM + 18, y: 7 * TAM + 15 }, { x: 38 * TAM + 21, y: 13 * TAM + 22 },
    { x: 46 * TAM + 26, y: 8 * TAM + 19 }, { x: 57 * TAM + 16, y: 18 * TAM + 20 },
    { x: 39 * TAM + 24, y: 37 * TAM + 17 }, { x: 58 * TAM + 18, y: 36 * TAM + 21 }
];
const acesso = JSON.parse(sessionStorage.getItem("gameOverCodigoAtivo") || "null");

if (!acesso || acesso.jogo !== "arena-tiro") {
    window.location.replace("../sala-codigos.html");
    throw new Error("Acesso da Sala de Códigos necessário.");
}

const canvas = document.getElementById("arena");
const ctx = canvas.getContext("2d");
const inicio = document.getElementById("inicio");
const iniciar = document.getElementById("iniciar");
const atirar = document.getElementById("atirar");
const pontosEl = document.getElementById("pontos");
const energiaEl = document.getElementById("energia");
const onlineEl = document.getElementById("online");
const recordeEl = document.getElementById("recorde");
const listaJogadores = document.getElementById("listaJogadores");

const teclas = new Set();
const outrosJogadores = new Map();
const tiros = [];
const cores = ["#287be8", "#a76bde", "#d76c5a", "#32a66d", "#d2a13b"];
const camera = { x: 0, y: 0 };
const alvoMira = { x: 18 * TAM, y: 15 * TAM };

let rodando = false;
let modoOnline = false;
let canalArena = null;
let ultimoEnvio = 0;
let proximoTiro = 0;
let ultimaLimpeza = 0;
let recorde = Number(localStorage.getItem("arenaTiroRecorde")) || 0;
let jogador = null;

recordeEl.textContent = recorde;

function limitar(valor, minimo, maximo) {
    return Math.max(minimo, Math.min(maximo, valor));
}

function textoSeguro(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = String(valor || "Aventureiro");
    return elemento.innerHTML;
}

function corDoJogador(id) {
    let valor = 0;
    for (const caractere of String(id)) valor = (valor + caractere.charCodeAt(0)) % cores.length;
    return cores[valor];
}

function alunoDaSessao() {
    try {
        const aluno = JSON.parse(localStorage.getItem("alunoLogado") || "null");
        return aluno?.id ? aluno : null;
    } catch {
        return null;
    }
}

async function obterNomeDaArena(aluno) {
    const nomePadrao = aluno.nome || "Aventureiro";
    const { data, error } = await supabase
        .from("rpg_perfis_jogador")
        .select("nickname")
        .eq("aluno_id", String(aluno.id))
        .maybeSingle();
    return error || !data?.nickname ? nomePadrao : data.nickname;
}

function atualizarHud() {
    pontosEl.textContent = jogador?.pontos || 0;
    energiaEl.textContent = jogador?.hp ?? 100;
    onlineEl.textContent = outrosJogadores.size + (jogador ? 1 : 0);
    const novoRecorde = Math.max(recorde, jogador?.pontos || 0);
    if (novoRecorde > recorde) {
        recorde = novoRecorde;
        localStorage.setItem("arenaTiroRecorde", String(recorde));
    }
    recordeEl.textContent = recorde;
}

function atualizarPlacar() {
    const todos = jogador ? [{ ...jogador, proprio: true }, ...outrosJogadores.values()] : [];
    const ranking = todos.sort((a, b) => Number(b.pontos) - Number(a.pontos)).slice(0, 5);
    listaJogadores.innerHTML = ranking.length
        ? ranking.map((item, indice) => `<li class="${item.proprio ? "eu" : ""}"><span>#${indice + 1} ${textoSeguro(item.jogador_nome || "Aventureiro")}</span><small>${Number(item.pontos || 0)} pts • ${Number(item.hp || 0)} HP</small></li>`).join("")
        : "<li>Esperando aventureiros entrarem...</li>";
}

function carregarOutros(registros) {
    outrosJogadores.clear();
    const limite = Date.now() - 60000;
    (registros || []).forEach(registro => {
        if (registro.jogador_id !== jogador?.jogador_id && new Date(registro.updated_at).getTime() > limite) {
            outrosJogadores.set(registro.jogador_id, registro);
        }
    });
    atualizarHud();
    atualizarPlacar();
}

function limparJogadoresInativos() {
    if (performance.now() - ultimaLimpeza < 5000) return;
    ultimaLimpeza = performance.now();
    const limite = Date.now() - 60000;
    let mudou = false;
    outrosJogadores.forEach((outro, id) => {
        if (new Date(outro.updated_at).getTime() <= limite) {
            outrosJogadores.delete(id);
            mudou = true;
        }
    });
    if (mudou) {
        atualizarHud();
        atualizarPlacar();
    }
}

async function enviarPresenca() {
    if (!modoOnline || !jogador) return;
    ultimoEnvio = performance.now();
    const { error } = await supabase.from("arena_tiro_online").upsert({
        sala_id: SALA_ID,
        jogador_id: jogador.jogador_id,
        jogador_nome: jogador.jogador_nome,
        cor: jogador.cor,
        x: Math.round(jogador.x),
        y: Math.round(jogador.y),
        hp: Math.round(jogador.hp),
        pontos: Math.round(jogador.pontos),
        updated_at: new Date().toISOString()
    }, { onConflict: "sala_id,jogador_id" });
    if (error) {
        console.error("ERRO NO BOSQUE ONLINE:", error);
        modoOnline = false;
    }
}

async function carregarArena() {
    const { data, error } = await supabase.from("arena_tiro_online").select("*").eq("sala_id", SALA_ID);
    if (error) throw error;
    carregarOutros(data);
}

async function conectarArena() {
    try {
        await carregarArena();
        modoOnline = true;
        await enviarPresenca();
        canalArena = supabase.channel("bosque-orbes-online")
            .on("postgres_changes", { event: "*", schema: "public", table: "arena_tiro_online" }, payload => {
                const registro = payload.new || payload.old;
                if (!registro || registro.sala_id !== SALA_ID) return;
                if (registro.jogador_id === jogador.jogador_id) {
                    if (payload.eventType !== "DELETE" && Number(registro.hp) !== Number(jogador.hp)) {
                        jogador.hp = Number(registro.hp);
                        jogador.x = Number(registro.x);
                        jogador.y = Number(registro.y);
                        atualizarHud();
                    }
                    return;
                }
                if (payload.eventType === "DELETE") outrosJogadores.delete(registro.jogador_id);
                else outrosJogadores.set(registro.jogador_id, registro);
                atualizarHud();
                atualizarPlacar();
            })
            .subscribe();
    } catch (error) {
        console.error("CONEXÃO DO BOSQUE:", error);
        modoOnline = false;
        listaJogadores.innerHTML = "<li>Modo local enquanto o bosque online conecta.</li>";
    }
}

function ehTrilha(coluna, linha) {
    return (coluna >= 19 && coluna <= 21)
        || (linha >= 14 && linha <= 15)
        || (coluna >= 47 && coluna <= 50 && linha >= 14 && linha <= 30)
        || (linha >= 29 && linha <= 31 && coluna >= 36 && coluna <= 50);
}

function ehAreaDaArena(coluna, linha) {
    const x = coluna * TAM + TAM / 2;
    const y = linha * TAM + TAM / 2;
    return Math.hypot(x - ARENA.x, y - ARENA.y) < ARENA.raio - 12;
}

function tipoTerreno(coluna, linha) {
    if (coluna < 1 || linha < 1 || coluna >= COLUNAS - 1 || linha >= LINHAS - 1) return "T";
    if (ehAreaDaArena(coluna, linha)) return "A";
    if (ehTrilha(coluna, linha)) return "P";
    if ((coluna * 11 + linha * 7) % 31 === 0 || (coluna > 54 && linha < 10)
        || (coluna < 9 && linha > 33) || (coluna > 51 && linha > 35) || (coluna < 11 && linha < 9)) return "T";
    if ((coluna * 7 + linha * 13) % 19 === 0) return "R";
    if ((coluna * 17 + linha * 5) % 5 === 0) return "M";
    if ((coluna * 3 + linha * 9) % 23 === 0) return "F";
    return "G";
}

function pontoBloqueado(x, y) {
    const coluna = Math.floor(x / TAM);
    const linha = Math.floor(y / TAM);
    return ["T", "R"].includes(tipoTerreno(coluna, linha));
}

function podeIr(x, y) {
    const margem = RAIO_JOGADOR - 4;
    return !pontoBloqueado(x - margem, y - margem) && !pontoBloqueado(x + margem, y - margem)
        && !pontoBloqueado(x - margem, y + margem) && !pontoBloqueado(x + margem, y + margem);
}

function encontrarPosicaoLivre(colunaInicial, colunaFinal, linhaInicial, linhaFinal) {
    for (let tentativa = 0; tentativa < 40; tentativa++) {
        const x = (colunaInicial + Math.random() * (colunaFinal - colunaInicial)) * TAM;
        const y = (linhaInicial + Math.random() * (linhaFinal - linhaInicial)) * TAM;
        if (podeIr(x, y)) return { x: Math.round(x), y: Math.round(y) };
    }
    return { x: 20 * TAM, y: 13 * TAM };
}

function moverJogador() {
    if (!jogador) return;
    let dx = 0;
    let dy = 0;
    if (teclas.has("arrowleft") || teclas.has("a")) dx--;
    if (teclas.has("arrowright") || teclas.has("d")) dx++;
    if (teclas.has("arrowup") || teclas.has("w")) dy--;
    if (teclas.has("arrowdown") || teclas.has("s")) dy++;
    const escala = dx && dy ? 0.71 : 1;
    const proximoX = limitar(jogador.x + dx * VELOCIDADE * escala, TAM + RAIO_JOGADOR, MUNDO_LARGURA - TAM - RAIO_JOGADOR);
    const proximoY = limitar(jogador.y + dy * VELOCIDADE * escala, TAM + RAIO_JOGADOR, MUNDO_ALTURA - TAM - RAIO_JOGADOR);
    if (dx && podeIr(proximoX, jogador.y)) jogador.x = proximoX;
    if (dy && podeIr(jogador.x, proximoY)) jogador.y = proximoY;
}

function disparar() {
    if (!rodando || !jogador || performance.now() < proximoTiro) return;
    proximoTiro = performance.now() + 260;
    const angulo = Math.atan2(alvoMira.y - jogador.y, alvoMira.x - jogador.x);
    tiros.push({ x: jogador.x, y: jogador.y - 4, dx: Math.cos(angulo) * 9, dy: Math.sin(angulo) * 9, dono: jogador.jogador_id });
}

async function acertarRival(rival) {
    if (!modoOnline || !rival) return;
    const hpAtual = Number(rival.hp || 100);
    const derrubado = hpAtual <= 25;
    const proximoHp = derrubado ? 100 : hpAtual - 25;
    const posicao = derrubado ? encontrarPosicaoLivre(14, 18, 8, 16) : {};
    const { data, error } = await supabase.from("arena_tiro_online")
        .update({ hp: proximoHp, ...posicao, updated_at: new Date().toISOString() })
        .eq("sala_id", SALA_ID)
        .eq("jogador_id", rival.jogador_id)
        .eq("hp", hpAtual)
        .select("jogador_id");
    if (error) console.error("ERRO AO REGISTRAR ACERTO:", error);
    if (derrubado && data?.length) {
        jogador.pontos += 100;
        atualizarHud();
        atualizarPlacar();
        void enviarPresenca();
    }
}

function atualizarTiros() {
    tiros.forEach(tiro => {
        tiro.x += tiro.dx;
        tiro.y += tiro.dy;
        if (tiro.dono !== jogador?.jogador_id) return;
        const rival = [...outrosJogadores.values()].find(item => Math.hypot(tiro.x - Number(item.x), tiro.y - Number(item.y)) < RAIO_JOGADOR + 6);
        if (rival) {
            tiro.acertou = true;
            void acertarRival(rival);
        }
    });
    for (let indice = tiros.length - 1; indice >= 0; indice--) {
        const tiro = tiros[indice];
        if (tiro.acertou || tiro.x < 0 || tiro.x > MUNDO_LARGURA || tiro.y < 0 || tiro.y > MUNDO_ALTURA) tiros.splice(indice, 1);
    }
}

function desenharArvore(x, y) {
    ctx.fillStyle = "#563c27";
    ctx.fillRect(x + 20, y + 26, 9, 20);
    ctx.fillStyle = "#174d38";
    ctx.beginPath(); ctx.arc(x + 24, y + 19, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2d8455";
    ctx.beginPath(); ctx.arc(x + 17, y + 14, 13, 0, Math.PI * 2); ctx.arc(x + 31, y + 15, 12, 0, Math.PI * 2); ctx.fill();
}

function desenharTerreno(coluna, linha) {
    const tipo = tipoTerreno(coluna, linha);
    const x = coluna * TAM;
    const y = linha * TAM;
    const cor = { G: "#337c59", M: "#337c59", P: "#cba46c", R: "#337c59", F: "#337c59", A: "#3c765d", T: "#2a6f4f" }[tipo];
    ctx.fillStyle = cor;
    ctx.fillRect(x, y, TAM, TAM);
    if (["G", "M", "F", "A"].includes(tipo)) {
        ctx.fillStyle = tipo === "M" ? "#74c96d" : "#56aa63";
        const quantidade = tipo === "M" ? 7 : 3;
        for (let i = 0; i < quantidade; i++) {
            const dx = ((coluna * 19 + linha * 7 + i * 11) % 38) + 5;
            const dy = ((coluna * 11 + linha * 23 + i * 9) % 34) + 7;
            ctx.fillRect(x + dx, y + dy, 2, tipo === "M" ? 11 : 6);
        }
    }
    if (tipo === "P") {
        ctx.fillStyle = "rgba(255,255,255,.16)";
        ctx.fillRect(x + 5, y + 9, 4, 3);
        ctx.fillRect(x + 29, y + 31, 3, 2);
    }
    if (tipo === "F") {
        ctx.fillStyle = "#ffbedb"; ctx.fillRect(x + 12, y + 18, 4, 4);
        ctx.fillStyle = "#ffe77c"; ctx.fillRect(x + 31, y + 28, 4, 4);
    }
    if (tipo === "R") {
        ctx.fillStyle = "#80778e"; ctx.fillRect(x + 8, y + 20, 30, 8);
        ctx.fillStyle = "#ada3bc"; ctx.fillRect(x + 13, y + 13, 8, 9); ctx.fillRect(x + 27, y + 16, 6, 6);
    }
    if (tipo === "T") desenharArvore(x, y);
}

function desenharArenaLunar() {
    ctx.fillStyle = "rgba(117, 69, 170, .28)";
    ctx.beginPath(); ctx.arc(ARENA.x, ARENA.y, ARENA.raio, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#ffe375"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(ARENA.x, ARENA.y, ARENA.raio, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(255, 227, 122, .48)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ARENA.x, ARENA.y, 116, 0, Math.PI * 2); ctx.stroke();
    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(angulo => {
        const x = ARENA.x + Math.cos(angulo) * 176;
        const y = ARENA.y + Math.sin(angulo) * 176;
        ctx.fillStyle = "#e8d18d"; ctx.fillRect(x - 7, y - 16, 14, 31);
        ctx.fillStyle = "#c26ee1"; ctx.fillRect(x - 10, y - 21, 20, 7);
    });
    ctx.fillStyle = "#fff0a4"; ctx.font = "bold 16px Trebuchet MS"; ctx.textAlign = "center";
    ctx.fillText("CLAREIRA DE BATALHA", ARENA.x, ARENA.y + 4);
    ctx.font = "bold 11px Trebuchet MS"; ctx.fillStyle = "#f1d9ff";
    ctx.fillText("ORBE VS ORBE", ARENA.x, ARENA.y + 22);
    ctx.textAlign = "left";
}

function desenharCristais() {
    CRISTAIS.forEach(cristal => {
        ctx.fillStyle = "#91f5ff";
        ctx.beginPath(); ctx.moveTo(cristal.x, cristal.y - 10); ctx.lineTo(cristal.x + 8, cristal.y); ctx.lineTo(cristal.x, cristal.y + 11); ctx.lineTo(cristal.x - 8, cristal.y); ctx.fill();
        ctx.strokeStyle = "#e1fdff"; ctx.stroke();
    });
}

function desenharAventureiro(item, proprio = false) {
    const x = Number(item.x);
    const y = Number(item.y);
    const cor = item.cor || "#287be8";
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.32)";
    ctx.beginPath(); ctx.ellipse(x, y + 18, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#263546"; ctx.fillRect(x - 10, y + 8, 7, 12); ctx.fillRect(x + 3, y + 8, 7, 12);
    ctx.fillStyle = cor; ctx.fillRect(x - 11, y - 5, 22, 16);
    ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.fillRect(x - 11, y - 3, 22, 3);
    ctx.fillStyle = "#f4d3ba"; ctx.beginPath(); ctx.arc(x, y - 10, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cor; ctx.fillRect(x - 12, y - 18, 24, 7); ctx.fillRect(x + 5, y - 13, 10, 3);
    ctx.strokeStyle = "#eedc91"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 8, y + 4); ctx.lineTo(x + 18, y - 2); ctx.stroke();
    ctx.fillStyle = "#dffcff"; ctx.beginPath(); ctx.arc(x + 19, y - 3, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#08121c"; ctx.fillRect(x - 5, y - 11, 3, 2); ctx.fillRect(x + 3, y - 11, 3, 2);
    ctx.fillStyle = proprio ? "#fff0a4" : "#efffff"; ctx.font = "bold 11px Trebuchet MS"; ctx.textAlign = "center";
    ctx.fillText(proprio ? "VOCÊ" : String(item.jogador_nome || "Rival").slice(0, 14), x, y - 31);
    ctx.fillStyle = "#12232d"; ctx.fillRect(x - 27, y + 27, 54, 6);
    ctx.fillStyle = "#5cedad"; ctx.fillRect(x - 27, y + 27, 54 * (Number(item.hp || 0) / 100), 6);
    ctx.restore();
}

function atualizarCamera() {
    if (!jogador) return;
    camera.x = limitar(jogador.x - canvas.width / 2, 0, MUNDO_LARGURA - canvas.width);
    camera.y = limitar(jogador.y - canvas.height / 2, 0, MUNDO_ALTURA - canvas.height);
}

function desenharMiniMapa() {
    const largura = 160;
    const altura = 105;
    const inicioX = canvas.width - largura - 11;
    const inicioY = 10;
    const celulaLargura = (largura - 12) / COLUNAS;
    const celulaAltura = (altura - 22) / LINHAS;
    ctx.fillStyle = "rgba(3, 14, 26, .8)"; ctx.fillRect(inicioX, inicioY, largura, altura);
    ctx.strokeStyle = "rgba(138, 229, 238, .7)"; ctx.strokeRect(inicioX, inicioY, largura, altura);
    for (let linha = 0; linha < LINHAS; linha++) {
        for (let coluna = 0; coluna < COLUNAS; coluna++) {
            const tipo = tipoTerreno(coluna, linha);
            ctx.fillStyle = { T: "#194a37", P: "#d8b177", M: "#52b76d", R: "#a59aaf", A: "#8a61ba", G: "#367f59", F: "#dc8cae" }[tipo] || "#367f59";
            ctx.fillRect(inicioX + 6 + coluna * celulaLargura, inicioY + 16 + linha * celulaAltura, Math.ceil(celulaLargura), Math.ceil(celulaAltura));
        }
    }
    outrosJogadores.forEach(outro => {
        ctx.fillStyle = outro.cor || "#ffffff";
        ctx.fillRect(inicioX + 6 + (Number(outro.x) / MUNDO_LARGURA) * (largura - 12), inicioY + 16 + (Number(outro.y) / MUNDO_ALTURA) * (altura - 22), 3, 3);
    });
    if (jogador) {
        ctx.fillStyle = "#fff3a5";
        ctx.beginPath(); ctx.arc(inicioX + 6 + (jogador.x / MUNDO_LARGURA) * (largura - 12), inicioY + 16 + (jogador.y / MUNDO_ALTURA) * (altura - 22), 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#e9feff"; ctx.font = "bold 9px Trebuchet MS"; ctx.fillText("MAPA DO BOSQUE", inicioX + 7, inicioY + 11);
}

function desenhar() {
    atualizarCamera();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#173a38"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    const inicioColuna = Math.max(0, Math.floor(camera.x / TAM) - 1);
    const fimColuna = Math.min(COLUNAS - 1, Math.ceil((camera.x + canvas.width) / TAM) + 1);
    const inicioLinha = Math.max(0, Math.floor(camera.y / TAM) - 1);
    const fimLinha = Math.min(LINHAS - 1, Math.ceil((camera.y + canvas.height) / TAM) + 1);
    for (let linha = inicioLinha; linha <= fimLinha; linha++) {
        for (let coluna = inicioColuna; coluna <= fimColuna; coluna++) desenharTerreno(coluna, linha);
    }
    desenharArenaLunar();
    desenharCristais();
    outrosJogadores.forEach(rival => desenharAventureiro(rival));
    if (jogador) desenharAventureiro(jogador, true);
    tiros.forEach(tiro => {
        ctx.fillStyle = "#fff5a2"; ctx.shadowBlur = 15; ctx.shadowColor = "#66ecff";
        ctx.beginPath(); ctx.arc(tiro.x, tiro.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    });
    ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(alvoMira.x, alvoMira.y, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(alvoMira.x - 18, alvoMira.y); ctx.lineTo(alvoMira.x + 18, alvoMira.y); ctx.moveTo(alvoMira.x, alvoMira.y - 18); ctx.lineTo(alvoMira.x, alvoMira.y + 18); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "rgba(4, 17, 27, .72)"; ctx.fillRect(10, 10, 198, 29);
    ctx.fillStyle = modoOnline ? "#8effcb" : "#ffd68b"; ctx.font = "bold 12px Trebuchet MS";
    ctx.fillText(modoOnline ? "● BOSQUE ONLINE" : "● MODO LOCAL", 18, 29);
    desenharMiniMapa();
}

function loop() {
    if (!rodando) return;
    moverJogador();
    atualizarTiros();
    limparJogadoresInativos();
    if (modoOnline && performance.now() - ultimoEnvio > 110) void enviarPresenca();
    atualizarHud();
    desenhar();
    requestAnimationFrame(loop);
}

async function iniciarArena() {
    const aluno = alunoDaSessao();
    if (!aluno) {
        inicio.querySelector("p:not(.kicker)").textContent = "Entre como aluno pela Central de Games antes de explorar o bosque online.";
        return;
    }
    const posicaoInicial = encontrarPosicaoLivre(14, 18, 8, 16);
    jogador = {
        jogador_id: String(aluno.id),
        jogador_nome: await obterNomeDaArena(aluno),
        cor: corDoJogador(aluno.id),
        ...posicaoInicial,
        hp: 100,
        pontos: 0
    };
    alvoMira.x = jogador.x + 80;
    alvoMira.y = jogador.y;
    inicio.classList.add("escondido");
    rodando = true;
    atualizarHud();
    atualizarPlacar();
    await conectarArena();
    requestAnimationFrame(loop);
}

function atualizarMira(event) {
    const area = canvas.getBoundingClientRect();
    alvoMira.x = (event.clientX - area.left) * canvas.width / area.width + camera.x;
    alvoMira.y = (event.clientY - area.top) * canvas.height / area.height + camera.y;
}

canvas.addEventListener("pointermove", atualizarMira);
canvas.addEventListener("pointerdown", event => { atualizarMira(event); disparar(); });
window.addEventListener("keydown", event => {
    const tecla = event.key.toLowerCase();
    if (["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d", " "].includes(tecla)) event.preventDefault();
    teclas.add(tecla);
    if (tecla === " ") disparar();
});
window.addEventListener("keyup", event => teclas.delete(event.key.toLowerCase()));

function configurarControlesDeToque() {
    document.querySelectorAll("[data-tecla-toque]").forEach(botao => {
        const tecla = botao.dataset.teclaToque;
        const soltar = () => teclas.delete(tecla);
        botao.addEventListener("pointerdown", evento => {
            evento.preventDefault();
            botao.setPointerCapture?.(evento.pointerId);
            teclas.add(tecla);
        });
        ["pointerup", "pointercancel", "pointerleave"].forEach(tipo => botao.addEventListener(tipo, soltar));
    });
    window.addEventListener("blur", () => teclas.clear());
}

configurarControlesDeToque();
atirar.addEventListener("click", disparar);
iniciar.addEventListener("click", () => void iniciarArena());
window.addEventListener("beforeunload", () => { if (canalArena) void supabase.removeChannel(canalArena); });
desenhar();
