const acesso = JSON.parse(sessionStorage.getItem("gameOverCodigoAtivo") || "null");

if (!acesso || acesso.jogo !== "mansao-eclipse") {
    window.location.replace("../sala-codigos.html");
    throw new Error("Acesso da Sala de Códigos necessário.");
}

const TAM = 48;
const COLUNAS = 60;
const LINHAS = 38;
const MUNDO_LARGURA = COLUNAS * TAM;
const MUNDO_ALTURA = LINHAS * TAM;
const VELOCIDADE = 3.2;
const TOTAL_FRAGMENTOS = 5;
const SAIDA = { x: 57.5 * TAM, y: 34.5 * TAM };
const FRAGMENTOS_INICIAIS = [
    { x: 7.5 * TAM, y: 8.5 * TAM }, { x: 17.5 * TAM, y: 5.5 * TAM },
    { x: 28.5 * TAM, y: 17.5 * TAM }, { x: 43.5 * TAM, y: 10.5 * TAM },
    { x: 54.5 * TAM, y: 29.5 * TAM }
];
const OLHOS_NO_ESCURO = [
    { x: 9.5 * TAM, y: 16.5 * TAM }, { x: 18.5 * TAM, y: 20.5 * TAM },
    { x: 30.5 * TAM, y: 6.5 * TAM }, { x: 34.5 * TAM, y: 27.5 * TAM },
    { x: 44.5 * TAM, y: 23.5 * TAM }, { x: 55.5 * TAM, y: 15.5 * TAM }
];

const canvas = document.getElementById("mansao");
const ctx = canvas.getContext("2d");
const inicioEl = document.getElementById("inicio");
const finalEl = document.getElementById("final");
const iniciarBotao = document.getElementById("iniciar");
const jogarNovamente = document.getElementById("jogarNovamente");
const fragmentosEl = document.getElementById("fragmentos");
const luzEl = document.getElementById("luz");
const tempoEl = document.getElementById("tempo");
const mensagemEl = document.getElementById("mensagem");
const textoFinal = document.getElementById("textoFinal");
const botaoSom = document.getElementById("botaoSom");

const teclas = new Set();
const camera = { x: 0, y: 0 };
const mira = { x: 7 * TAM, y: 4 * TAM };
let jogador;
let sombra;
let fragmentos;
let rodando = false;
let luz = 100;
let inicioPartida = 0;
let ultimoQuadro = 0;
let ultimaInterface = 0;
let ultimoSusto = 0;
let intensidadePerigo = 0;
let contextoAudio = null;
let ganhoTrilha = null;
let osciladoresDaTrilha = [];
let temporizadorSino = null;
let somAtivo = true;

function limitar(valor, minimo, maximo) {
    return Math.max(minimo, Math.min(maximo, valor));
}

function distancia(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function ehParede(coluna, linha) {
    if (coluna < 1 || linha < 1 || coluna >= COLUNAS - 1 || linha >= LINHAS - 1) return true;
    if (coluna === 12 && linha >= 2 && linha <= 18 && linha !== 8) return true;
    if (linha === 12 && coluna >= 2 && coluna <= 12 && coluna !== 6) return true;
    if (coluna === 24 && linha >= 2 && linha <= 22 && linha !== 6 && linha !== 17) return true;
    if (linha === 22 && coluna >= 12 && coluna <= 34 && coluna !== 19) return true;
    if (coluna === 37 && linha >= 8 && linha <= 34 && linha !== 14 && linha !== 28) return true;
    if (coluna === 51 && linha >= 2 && linha <= 30 && linha !== 18) return true;
    if (linha === 30 && coluna >= 37 && coluna <= 57 && coluna !== 48) return true;
    return false;
}

function bloqueado(x, y) {
    return ehParede(Math.floor(x / TAM), Math.floor(y / TAM));
}

function podeIr(x, y) {
    const margem = 13;
    return !bloqueado(x - margem, y - margem) && !bloqueado(x + margem, y - margem)
        && !bloqueado(x - margem, y + margem) && !bloqueado(x + margem, y + margem);
}

function atualizarCamera() {
    camera.x = limitar(jogador.x - canvas.width / 2, 0, MUNDO_LARGURA - canvas.width);
    camera.y = limitar(jogador.y - canvas.height / 2, 0, MUNDO_ALTURA - canvas.height);
}

function atualizarInterface(agora) {
    if (agora - ultimaInterface < 160) return;
    ultimaInterface = agora;
    const coletados = fragmentos.filter(fragmento => fragmento.coletado).length;
    const segundos = Math.floor((agora - inicioPartida) / 1000);
    fragmentosEl.textContent = `${coletados} / ${TOTAL_FRAGMENTOS}`;
    luzEl.textContent = `${Math.ceil(luz)}%`;
    tempoEl.textContent = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;
}

function falar(texto) {
    mensagemEl.textContent = texto;
}

function atualizarBotaoSom() {
    botaoSom.textContent = somAtivo ? "🔊 SOM: LIGADO" : "🔇 SOM: DESLIGADO";
    botaoSom.setAttribute("aria-pressed", String(somAtivo));
}

function criarDrone(frequencia, tipo, volume) {
    const oscilador = contextoAudio.createOscillator();
    const ganho = contextoAudio.createGain();
    oscilador.type = tipo;
    oscilador.frequency.value = frequencia;
    ganho.gain.setValueAtTime(.0001, contextoAudio.currentTime);
    ganho.gain.exponentialRampToValueAtTime(volume, contextoAudio.currentTime + 1.8);
    oscilador.connect(ganho);
    ganho.connect(ganhoTrilha);
    oscilador.start();
    osciladoresDaTrilha.push(oscilador);
}

function tocarSinoSombrio() {
    if (!contextoAudio || !somAtivo) return;
    const agora = contextoAudio.currentTime;
    const notas = [146.83, 174.61, 220, 233.08, 293.66];
    const oscilador = contextoAudio.createOscillator();
    const ganho = contextoAudio.createGain();
    oscilador.type = "sine";
    oscilador.frequency.setValueAtTime(notas[Math.floor(Math.random() * notas.length)], agora);
    oscilador.detune.setValueAtTime(-8 + Math.random() * 16, agora);
    ganho.gain.setValueAtTime(.0001, agora);
    ganho.gain.exponentialRampToValueAtTime(.07, agora + .08);
    ganho.gain.exponentialRampToValueAtTime(.0001, agora + 2.7);
    oscilador.connect(ganho);
    ganho.connect(ganhoTrilha);
    oscilador.start(agora);
    oscilador.stop(agora + 2.8);
}

function agendarSino() {
    if (!somAtivo || !contextoAudio) return;
    tocarSinoSombrio();
    temporizadorSino = window.setTimeout(agendarSino, 4800 + Math.random() * 7200);
}

async function iniciarTrilha() {
    const AudioContexto = window.AudioContext || window.webkitAudioContext;
    if (!AudioContexto) {
        botaoSom.disabled = true;
        botaoSom.textContent = "🔇 SOM NÃO SUPORTADO";
        return;
    }
    if (!contextoAudio) {
        contextoAudio = new AudioContexto();
        ganhoTrilha = contextoAudio.createGain();
        ganhoTrilha.gain.value = .16;
        ganhoTrilha.connect(contextoAudio.destination);
        criarDrone(55, "sine", .08);
        criarDrone(82.41, "triangle", .045);
        criarDrone(110, "sine", .025);
    }
    if (contextoAudio.state === "suspended") await contextoAudio.resume();
    if (!somAtivo) return;
    ganhoTrilha.gain.setTargetAtTime(.16, contextoAudio.currentTime, .18);
    if (!temporizadorSino) agendarSino();
}

function alternarSom() {
    somAtivo = !somAtivo;
    atualizarBotaoSom();
    if (somAtivo) {
        void iniciarTrilha();
    } else if (ganhoTrilha) {
        ganhoTrilha.gain.setTargetAtTime(.0001, contextoAudio.currentTime, .08);
        window.clearTimeout(temporizadorSino);
        temporizadorSino = null;
    }
}

function mover(delta) {
    let dx = 0;
    let dy = 0;
    if (teclas.has("arrowleft") || teclas.has("a")) dx--;
    if (teclas.has("arrowright") || teclas.has("d")) dx++;
    if (teclas.has("arrowup") || teclas.has("w")) dy--;
    if (teclas.has("arrowdown") || teclas.has("s")) dy++;
    const escala = dx && dy ? 0.71 : 1;
    const passo = VELOCIDADE * (delta / 16.67) * escala;
    const proximoX = limitar(jogador.x + dx * passo, TAM + 16, MUNDO_LARGURA - TAM - 16);
    const proximoY = limitar(jogador.y + dy * passo, TAM + 16, MUNDO_ALTURA - TAM - 16);
    if (dx && podeIr(proximoX, jogador.y)) jogador.x = proximoX;
    if (dy && podeIr(jogador.x, proximoY)) jogador.y = proximoY;
}

function atualizarSombra(agora, delta) {
    const distanciaDaSombra = distancia(jogador, sombra);
    intensidadePerigo = limitar((390 - distanciaDaSombra) / 390, 0, 1);
    if (somAtivo && ganhoTrilha) ganhoTrilha.gain.setTargetAtTime(.14 + intensidadePerigo * .06, contextoAudio.currentTime, .16);
    const velocidadeSombra = (distanciaDaSombra < 240 ? 1.52 : 0.88) * (delta / 16.67);
    const angulo = Math.atan2(jogador.y - sombra.y, jogador.x - sombra.x);
    sombra.x += Math.cos(angulo) * velocidadeSombra;
    sombra.y += Math.sin(angulo) * velocidadeSombra;

    if (distanciaDaSombra < 155) falar("👁️ A sombra está muito perto... corra para outro corredor!");
    else if (distanciaDaSombra < 280) falar("Você ouve passos atrás de você.");

    if (distanciaDaSombra < 28 && agora - ultimoSusto > 1500) {
        ultimoSusto = agora;
        luz = Math.max(0, luz - 34);
        jogador.x = 4.5 * TAM;
        jogador.y = 4.5 * TAM;
        sombra.x = 35.5 * TAM;
        sombra.y = 18.5 * TAM;
        falar("A sombra apagou sua lanterna! Você acordou perto da entrada.");
        if (luz <= 0) finalizar(false);
    }
}

function coletarFragmentos() {
    fragmentos.forEach(fragmento => {
        if (!fragmento.coletado && distancia(jogador, fragmento) < 28) {
            fragmento.coletado = true;
            luz = Math.min(100, luz + 18);
            const quantidade = fragmentos.filter(item => item.coletado).length;
            falar(`💎 Fragmento lunar ${quantidade}/${TOTAL_FRAGMENTOS} encontrado. A luz ficou mais forte!`);
        }
    });
}

function verificarSaida() {
    if (distancia(jogador, SAIDA) > 34) return;
    const coletados = fragmentos.filter(fragmento => fragmento.coletado).length;
    if (coletados === TOTAL_FRAGMENTOS) finalizar(true);
    else falar(`🔒 A porta dourada precisa de ${TOTAL_FRAGMENTOS - coletados} fragmento(s) lunar(es).`);
}

function desenharParede(x, y, coluna, linha) {
    ctx.fillStyle = "#251e30";
    ctx.fillRect(x, y, TAM, TAM);
    ctx.fillStyle = "#3d3048";
    ctx.fillRect(x + 3, y + 3, TAM - 6, 10);
    ctx.fillStyle = "#181420";
    ctx.fillRect(x + 3, y + 15, TAM - 6, 3);
    ctx.fillStyle = "rgba(223, 190, 255, .12)";
    if ((coluna + linha) % 2 === 0) ctx.fillRect(x + 9, y + 26, 4, 12);
}

function desenharPiso(x, y, coluna, linha) {
    ctx.fillStyle = (coluna + linha) % 2 === 0 ? "#342a36" : "#302632";
    ctx.fillRect(x, y, TAM, TAM);
    ctx.strokeStyle = "rgba(208, 173, 135, .12)";
    ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x + TAM, y + 8); ctx.moveTo(x, y + 31); ctx.lineTo(x + TAM, y + 31); ctx.stroke();
    if ((coluna * 9 + linha * 5) % 18 === 0) {
        ctx.fillStyle = "rgba(110, 77, 130, .25)";
        ctx.fillRect(x + 14, y + 12, 20, 24);
        ctx.fillStyle = "rgba(247, 218, 150, .25)";
        ctx.fillRect(x + 22, y + 17, 4, 13);
    }
}

function desenharPorta(x, y, aberta) {
    ctx.fillStyle = aberta ? "#a88742" : "#5a4734";
    ctx.fillRect(x - 16, y - 25, 32, 42);
    ctx.fillStyle = aberta ? "#fff0a6" : "#d5b772";
    ctx.fillRect(x - 13, y - 22, 26, 37);
    ctx.fillStyle = "#2b1d2b";
    ctx.fillRect(x - 9, y - 18, 18, 28);
    if (!aberta) { ctx.fillStyle = "#f7d878"; ctx.fillRect(x + 6, y - 3, 4, 4); }
}

function desenharFragmento(fragmento) {
    if (fragmento.coletado) return;
    ctx.save();
    ctx.shadowBlur = 16; ctx.shadowColor = "#9bcaff";
    ctx.fillStyle = "#a8e9ff";
    ctx.beginPath(); ctx.moveTo(fragmento.x, fragmento.y - 13); ctx.lineTo(fragmento.x + 9, fragmento.y); ctx.lineTo(fragmento.x, fragmento.y + 13); ctx.lineTo(fragmento.x - 9, fragmento.y); ctx.fill();
    ctx.fillStyle = "#f5fdff"; ctx.fillRect(fragmento.x - 2, fragmento.y - 7, 4, 12);
    ctx.restore();
}

function desenharJogador() {
    const x = jogador.x;
    const y = jogador.y;
    const angulo = Math.atan2(mira.y - y, mira.x - x);
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.beginPath(); ctx.ellipse(x, y + 17, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#29334a"; ctx.fillRect(x - 10, y + 7, 7, 13); ctx.fillRect(x + 3, y + 7, 7, 13);
    ctx.fillStyle = "#9c77c9"; ctx.fillRect(x - 11, y - 7, 22, 17);
    ctx.fillStyle = "#f1d1ba"; ctx.beginPath(); ctx.arc(x, y - 12, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#49355e"; ctx.fillRect(x - 12, y - 20, 24, 7);
    const luzX = x + Math.cos(angulo) * 19;
    const luzY = y + Math.sin(angulo) * 7;
    ctx.strokeStyle = "#f6d77f"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 7, y); ctx.lineTo(luzX, luzY); ctx.stroke();
    ctx.fillStyle = "#fff5b0"; ctx.beginPath(); ctx.arc(luzX, luzY, 5, 0, Math.PI * 2); ctx.fill();
}

function desenharSombra() {
    const x = sombra.x;
    const y = sombra.y;
    const pulsar = 1 + Math.sin(performance.now() / 130) * .09;
    ctx.save();
    ctx.translate(x, y); ctx.scale(pulsar, pulsar);
    ctx.shadowBlur = 30; ctx.shadowColor = "#af7aff";
    ctx.fillStyle = "rgba(25, 14, 46, .94)";
    ctx.beginPath(); ctx.ellipse(0, 0, 19, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(20, 8, 37, .92)";
    ctx.beginPath(); ctx.moveTo(-17, 8); ctx.lineTo(-31, 24); ctx.lineTo(-10, 17); ctx.fill();
    ctx.beginPath(); ctx.moveTo(17, 8); ctx.lineTo(31, 24); ctx.lineTo(10, 17); ctx.fill();
    ctx.fillStyle = "#f5d8ff"; ctx.fillRect(-10, -9, 5, 4); ctx.fillRect(5, -9, 5, 4);
    ctx.fillStyle = "#6f3d9b"; ctx.fillRect(-4, 5, 8, 3);
    ctx.restore();
}

function desenharLanterna() {
    const x = jogador.x - camera.x;
    const y = jogador.y - camera.y;
    const angulo = Math.atan2(mira.y - jogador.y, mira.x - jogador.x);
    const alcance = 185 + luz * 1.35;
    const fimX = x + Math.cos(angulo) * alcance;
    const fimY = y + Math.sin(angulo) * alcance;

    // A primeira camada remove a escuridão perto do jogador e o cone abre
    // uma área nítida na direção que a lanterna está apontando.
    ctx.save();
    ctx.fillStyle = "rgba(2, 1, 9, .9)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,.92)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, alcance, angulo - .46, angulo + .46);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // O brilho fica preso dentro do cone: o personagem não emite luz própria.
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const brilhoQuente = ctx.createLinearGradient(x, y, fimX, fimY);
    brilhoQuente.addColorStop(0, "rgba(255, 243, 180, .10)");
    brilhoQuente.addColorStop(.45, "rgba(255, 225, 147, .30)");
    brilhoQuente.addColorStop(1, "rgba(255, 210, 115, 0)");
    ctx.fillStyle = brilhoQuente;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, alcance, angulo - .46, angulo + .46);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function desenharOlhosNoEscuro() {
    const agora = performance.now();
    OLHOS_NO_ESCURO.forEach((olhos, indice) => {
        const distanciaDosOlhos = distancia(jogador, olhos);
        const x = olhos.x - camera.x;
        const y = olhos.y - camera.y;
        if (distanciaDosOlhos < 120 || distanciaDosOlhos > 430 || x < -20 || x > canvas.width + 20 || y < -20 || y > canvas.height + 20) return;
        const piscar = Math.sin(agora / (230 + indice * 17) + indice) > -.25 ? 1 : .12;
        ctx.save();
        ctx.globalAlpha = limitar((430 - distanciaDosOlhos) / 160, .18, .72) * piscar;
        ctx.shadowBlur = 12; ctx.shadowColor = "#d4a1ff";
        ctx.fillStyle = "#e9d1ff";
        ctx.fillRect(x - 9, y - 3, 5, 3); ctx.fillRect(x + 4, y - 3, 5, 3);
        ctx.restore();
    });
}

function desenharVinheta() {
    ctx.save();
    const vinheta = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * .12, canvas.width / 2, canvas.height / 2, canvas.width * .7);
    vinheta.addColorStop(0, "rgba(0,0,0,0)");
    vinheta.addColorStop(.58, "rgba(0,0,0,0)");
    vinheta.addColorStop(1, "rgba(3,1,12,.72)");
    ctx.fillStyle = vinheta; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (intensidadePerigo > .1) {
        ctx.fillStyle = `rgba(123, 24, 85, ${intensidadePerigo * .22})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
}

function desenhar() {
    atualizarCamera();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#15111d"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    const inicioColuna = Math.max(0, Math.floor(camera.x / TAM) - 1);
    const fimColuna = Math.min(COLUNAS - 1, Math.ceil((camera.x + canvas.width) / TAM) + 1);
    const inicioLinha = Math.max(0, Math.floor(camera.y / TAM) - 1);
    const fimLinha = Math.min(LINHAS - 1, Math.ceil((camera.y + canvas.height) / TAM) + 1);
    for (let linha = inicioLinha; linha <= fimLinha; linha++) {
        for (let coluna = inicioColuna; coluna <= fimColuna; coluna++) {
            const x = coluna * TAM;
            const y = linha * TAM;
            if (ehParede(coluna, linha)) desenharParede(x, y, coluna, linha);
            else desenharPiso(x, y, coluna, linha);
        }
    }
    desenharPorta(SAIDA.x, SAIDA.y, fragmentos.every(fragmento => fragmento.coletado));
    fragmentos.forEach(desenharFragmento);
    desenharSombra();
    desenharJogador();
    ctx.restore();
    desenharLanterna();
    desenharOlhosNoEscuro();
    desenharVinheta();
    ctx.fillStyle = "rgba(8, 5, 18, .73)"; ctx.fillRect(10, 10, 206, 30);
    ctx.fillStyle = "#f6d77f"; ctx.font = "bold 12px Trebuchet MS"; ctx.fillText("🕯️ CORREDORES DA MANSÃO", 18, 30);
}

function finalizar(venceu) {
    rodando = false;
    finalEl.classList.remove("escondido");
    if (venceu) {
        const segundos = Math.floor((performance.now() - inicioPartida) / 1000);
        textoFinal.textContent = `Você escapou em ${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")} com todos os fragmentos lunares.`;
    } else {
        textoFinal.textContent = "A lanterna se apagou por completo, mas você pode tentar escapar novamente.";
    }
}

function loop(agora) {
    if (!rodando) return;
    const delta = Math.min(35, agora - ultimoQuadro || 16.67);
    ultimoQuadro = agora;
    luz = Math.max(0, luz - delta * .0007);
    mover(delta);
    coletarFragmentos();
    verificarSaida();
    atualizarSombra(agora, delta);
    atualizarInterface(agora);
    desenhar();
    if (rodando) requestAnimationFrame(loop);
}

function iniciarJogo() {
    jogador = { x: 4.5 * TAM, y: 4.5 * TAM };
    sombra = { x: 35.5 * TAM, y: 18.5 * TAM };
    fragmentos = FRAGMENTOS_INICIAIS.map(fragmento => ({ ...fragmento, coletado: false }));
    luz = 100;
    ultimoSusto = 0;
    ultimoQuadro = 0;
    inicioPartida = performance.now();
    inicioEl.classList.add("escondido");
    finalEl.classList.add("escondido");
    rodando = true;
    falar("A lanterna revela uma marca dourada no chão. Procure os fragmentos.");
    if (somAtivo) void iniciarTrilha();
    requestAnimationFrame(loop);
}

function atualizarMira(evento) {
    const area = canvas.getBoundingClientRect();
    mira.x = (evento.clientX - area.left) * canvas.width / area.width + camera.x;
    mira.y = (evento.clientY - area.top) * canvas.height / area.height + camera.y;
}

canvas.addEventListener("pointermove", atualizarMira);
canvas.addEventListener("pointerdown", atualizarMira);
window.addEventListener("keydown", evento => {
    const tecla = evento.key.toLowerCase();
    if (["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d"].includes(tecla)) evento.preventDefault();
    teclas.add(tecla);
});
window.addEventListener("keyup", evento => teclas.delete(evento.key.toLowerCase()));
iniciarBotao.addEventListener("click", iniciarJogo);
jogarNovamente.addEventListener("click", iniciarJogo);
botaoSom.addEventListener("click", alternarSom);
window.addEventListener("pagehide", () => {
    window.clearTimeout(temporizadorSino);
    osciladoresDaTrilha.forEach(oscilador => oscilador.stop());
});

jogador = { x: 4.5 * TAM, y: 4.5 * TAM };
sombra = { x: 35.5 * TAM, y: 18.5 * TAM };
fragmentos = FRAGMENTOS_INICIAIS.map(fragmento => ({ ...fragmento, coletado: false }));
desenhar();
