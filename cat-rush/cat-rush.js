import { supabase } from "../supabase.js";

// =====================================================
// ELEMENTOS DA TELA
// =====================================================

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const pontosEl = document.getElementById("pontos");
const moedasEl = document.getElementById("moedas");
const vidasEl = document.getElementById("vidas");
const recordeEl = document.getElementById("recorde");
const faseHudEl = document.getElementById("faseHud");
const especialTextoEl = document.getElementById("especialTexto");
const especialBarraEl = document.getElementById("especialBarra");
const especialBotao = document.getElementById("especial");
const especialTrilho = document.querySelector(".especial-trilho");

const mensagem = document.getElementById("mensagem");
const iniciar = document.getElementById("iniciar");
const pularBtn = document.getElementById("pular");


// =====================================================
// CONFIGURAÇÃO
// =====================================================

canvas.width = 900;
canvas.height = 450;

let rodando = false;

let pontos = 0;
let moedas = 0;
let vidas = 3;

let velocidade = 6;
let tempo = 0;
let proximoObstaculoEm = 125;

let fase = 1;

const FASES = [
    { numero: 1, inicio: 0, nome: "BECOS AZUIS", ceu: "#030817", ceuFim: "#12355a", predio: "#08101d", janela: "#168cff", detalhe: "#ffd43b", linha: "#168cff" },
    { numero: 2, inicio: 180, nome: "DISTRITO NEON", ceu: "#16051f", ceuFim: "#5a123d", predio: "#190b20", janela: "#ff3ca6", detalhe: "#20d9ff", linha: "#ff3ca6" },
    { numero: 3, inicio: 480, nome: "VIADUTO ELÉTRICO", ceu: "#09132a", ceuFim: "#26547c", predio: "#10223a", janela: "#20d9ff", detalhe: "#fff4a6", linha: "#20d9ff" },
    { numero: 4, inicio: 700, nome: "CIDADE SOMBRIA", ceu: "#210000", ceuFim: "#5a1010", predio: "#260707", janela: "#ff4444", detalhe: "#ffb000", linha: "#ff3030" },
    { numero: 5, inicio: 1080, nome: "LUA VERMELHA", ceu: "#25061b", ceuFim: "#7a1942", predio: "#2a0b24", janela: "#ff5b8e", detalhe: "#c976ff", linha: "#ff5b8e" },
    { numero: 6, inicio: 1450, nome: "FORTALEZA FINAL", ceu: "#190c02", ceuFim: "#63310a", predio: "#261300", janela: "#ffb000", detalhe: "#fff4a6", linha: "#ffb000" }
];

const CHEFES = [
    { nome: "RATO MECÂNICO", icone: "⚙", fase: 2, pontos: 320, vida: 28, largura: 104, altura: 104, velocidade: 1.8, ataqueIntervalo: 96, rajada: 1, recompensa: 260, cor: "#7183a8", brilho: "#aeeeff", tiro: "#7cf4ff" },
    { nome: "PANTERA ELÉTRICA", icone: "⚡", fase: 4, pontos: 900, vida: 43, largura: 122, altura: 112, velocidade: 2.55, ataqueIntervalo: 76, rajada: 2, recompensa: 380, cor: "#7431af", brilho: "#eab8ff", tiro: "#d86dff" },
    { nome: "REI GATO SOMBRIO", icone: "👑", fase: 6, pontos: 1800, vida: 64, largura: 136, altura: 126, velocidade: 3.15, ataqueIntervalo: 58, rajada: 3, recompensa: 650, cor: "#8f1635", brilho: "#ffd0d9", tiro: "#ff465f", final: true }
];

let obstaculos = [];
let moedasJogo = [];

let tiros = [];

let chefao = null;
let chefesDerrotados = 0;
let especial = 0;
let efeitoEspecialTempo = 0;
let proximoAtaqueGatoEm = 0;
let proximoAtaqueChefaoEm = 0;
let ultimoAvisoEspecialEm = 0;

let invencivel = false;
let tempoInvencivel = 0;

let alunoAtual = null;

let recorde =
    Number(localStorage.getItem("catRushRecorde")) || 0;

recordeEl.textContent = recorde;


// =====================================================
// GATO
// =====================================================

const gato = {

    x: 130,

    y: 340,

    largura: 48,

    altura: 55,

    velocidadeY: 0,

    pulando: false,

    chao: 340
};


// =====================================================
// ALUNO
// =====================================================

function carregarAluno() {

    const alunoSalvo =
        localStorage.getItem("alunoLogado");


    if (!alunoSalvo) {

        console.error(
            "❌ Nenhum aluno encontrado."
        );

        return;
    }


    try {

        alunoAtual =
            JSON.parse(alunoSalvo);


        console.log(
            "🐱 JOGANDO COMO:",
            alunoAtual.nome
        );


        console.log(
            "🆔 ID DO ALUNO:",
            alunoAtual.id
        );


    } catch (erro) {

        console.error(
            "❌ Erro ao ler aluno:",
            erro
        );
    }
}


// =====================================================
// COMEÇAR JOGO
// =====================================================

iniciar.addEventListener(
    "click",
    iniciarJogo
);


function iniciarJogo() {

    rodando = true;

    pontos = 0;

    moedas = 0;

    vidas = 3;

    velocidade = 6;

    tempo = 0;

    proximoObstaculoEm = 125;

    fase = 1;

    obstaculos = [];

    moedasJogo = [];

    tiros = [];

    chefao = null;

    chefesDerrotados = 0;

    especial = 0;

    efeitoEspecialTempo = 0;

    proximoAtaqueGatoEm = 0;

    proximoAtaqueChefaoEm = 0;

    ultimoAvisoEspecialEm = 0;

    invencivel = false;

    tempoInvencivel = 0;


    gato.y = gato.chao;

    gato.velocidadeY = 0;

    gato.pulando = false;


    mensagem.style.display = "none";


    atualizarHUD();


    requestAnimationFrame(loop);
}


// Permite que o botão "Jogar novamente"
// do HTML consiga chamar a função.

window.iniciarJogo = iniciarJogo;


// =====================================================
// PULO
// =====================================================

function pular() {

    if (!rodando) return;

    if (gato.pulando) return;


    gato.pulando = true;

    gato.velocidadeY = -15;
}


document.addEventListener(
    "keydown",
    function(event) {

        if (event.code === "Space") {

            event.preventDefault();

            pular();
        }


        if (event.code === "KeyX") {

            atacar();
        }

        if (event.code === "KeyZ") {

            event.preventDefault();

            usarEspecial();
        }
    }
);


pularBtn.addEventListener(
    "click",
    pular
);

especialBotao.addEventListener(
    "click",
    usarEspecial
);


// =====================================================
// LOOP
// =====================================================

function loop() {

    if (!rodando) return;


    atualizar();

    desenhar();


    requestAnimationFrame(loop);
}


// =====================================================
// ATUALIZAR
// =====================================================

function atualizar() {

    tempo++;


    // GRAVIDADE

    gato.velocidadeY += 0.7;

    gato.y += gato.velocidadeY;


    if (gato.y >= gato.chao) {

        gato.y = gato.chao;

        gato.velocidadeY = 0;

        gato.pulando = false;
    }


    // PONTOS

    if (tempo % 5 === 0) {

        pontos++;

        pontosEl.textContent = pontos;
    }


    // FASE

    verificarFase();


    // INVENCIBILIDADE

    if (invencivel) {

        tempoInvencivel--;


        if (tempoInvencivel <= 0) {

            invencivel = false;
        }
    }


    // JOGO NORMAL

    if (!chefao) {

        velocidade =
            6.25 +
            (fase - 1) * 1.25 +
            Math.floor(pontos / 140) * 0.42;


        // O intervalo antigo usava o resto da divisão do
        // tempo. Quando a fase ou a pontuação mudava, duas
        // caixas podiam aparecer quase juntas. Agora o próximo
        // obstáculo só nasce depois de uma distância segura.
        const intervaloMinimo =
            Math.max(
                76,
                136 - Math.floor(pontos / 12) - fase * 10
            );


        if (tempo >= proximoObstaculoEm) {

            criarObstaculo();

            const folgaExtra =
                11 + Math.floor(Math.random() * 21);

            proximoObstaculoEm =
                tempo + intervaloMinimo + folgaExtra;
        }


        if (tempo % 85 === 0) {

            criarMoeda();
        }
    }


    // MOVER OBSTÁCULOS

    obstaculos.forEach(
        obstaculo => {

            obstaculo.x -= velocidade;
        }
    );


    // MOVER MOEDAS

    moedasJogo.forEach(
        moeda => {

            moeda.x -= velocidade;
        }
    );


    // MOVER TIROS

    tiros.forEach(
        tiro => {

            if (tiro.inimigo) {

                tiro.x -= 8;

            } else {

                tiro.x += 10;
            }
        }
    );


    // CHEFÃO

    if (chefao) {

        atualizarChefao();

        if (efeitoEspecialTempo > 0) {

            efeitoEspecialTempo--;
        }
    }


    // COLISÕES

    verificarColisoes();


    // LIMPEZA

    obstaculos =
        obstaculos.filter(
            objeto =>
                objeto.x > -100
        );


    moedasJogo =
        moedasJogo.filter(
            moeda =>
                moeda.x > -50
        );


    tiros =
        tiros.filter(
            tiro =>
                tiro.x > -50 &&
                tiro.x < canvas.width + 50
        );
}


// =====================================================
// FASES
// =====================================================

function verificarFase() {

    if (chefao) return;

    const proximoChefao = CHEFES[chefesDerrotados];

    if (proximoChefao && pontos >= proximoChefao.pontos) {

        fase = proximoChefao.fase;

        atualizarHUD();

        iniciarChefao(proximoChefao);

        return;
    }

    const proximaFase = FASES.reduce(
        (faseMaisAlta, dados) => pontos >= dados.inicio ? dados.numero : faseMaisAlta,
        1
    );

    if (proximaFase > fase) {

        fase = proximaFase;

        const dadosDaFase = temaAtual();

        atualizarHUD();

        mostrarAviso(
            `⚡ FASE ${fase}`,
            `${dadosDaFase.nome}: a corrida ficou ainda mais rápida!`
        );
    }
}

function temaAtual() {

    return FASES.find(dados => dados.numero === fase) || FASES[0];
}


// =====================================================
// AVISO
// =====================================================

function mostrarAviso(
    titulo,
    texto
) {

    const aviso =
        document.createElement("div");


    aviso.style.position =
        "fixed";

    aviso.style.top =
        "30px";

    aviso.style.left =
        "50%";

    aviso.style.transform =
        "translateX(-50%)";

    aviso.style.padding =
        "18px 35px";

    aviso.style.background =
        "#08101d";

    aviso.style.border =
        "2px solid #168cff";

    aviso.style.borderRadius =
        "15px";

    aviso.style.color =
        "white";

    aviso.style.textAlign =
        "center";

    aviso.style.zIndex =
        "9999";


    aviso.innerHTML = `

        <strong style="
            color:#20a4ff;
            font-size:25px;
        ">
            ${titulo}
        </strong>

        <br>

        ${texto}

    `;


    document.body.appendChild(
        aviso
    );


    setTimeout(
        () => aviso.remove(),
        2500
    );
}


// =====================================================
// OBSTÁCULO
// =====================================================

function criarObstaculo() {

    const alto = fase >= 4 && Math.random() < 0.35;

    const largura = alto ? 34 : 42 + Math.floor(Math.random() * 14);

    const altura = alto ? 72 : 36 + Math.floor(Math.random() * 17);

    obstaculos.push({

        x: canvas.width + 50,

        y: 395 - altura,

        largura,

        altura,

        alto
    });
}


// =====================================================
// MOEDA
// =====================================================

function criarMoeda() {

    moedasJogo.push({

        x: canvas.width + 50,

        y:
            230 +
            Math.random() * 100,

        raio: 14
    });
}


// =====================================================
// COLISÕES
// =====================================================

function verificarColisoes() {

    const gatoBox = {

        x: gato.x + 8,

        y: gato.y + 8,

        largura:
            gato.largura - 16,

        altura:
            gato.altura - 10
    };


    // OBSTÁCULOS

    obstaculos.forEach(
        (obstaculo, index) => {

            if (
                colisao(
                    gatoBox,
                    obstaculo
                )
            ) {

                obstaculos.splice(
                    index,
                    1
                );

                perderVida();
            }
        }
    );


    // MOEDAS

    moedasJogo.forEach(
        (moeda, index) => {

            const distanciaX =
                gato.x + 25 -
                moeda.x;


            const distanciaY =
                gato.y + 25 -
                moeda.y;


            const distancia =
                Math.sqrt(
                    distanciaX ** 2 +
                    distanciaY ** 2
                );


            if (distancia < 40) {

                moedasJogo.splice(
                    index,
                    1
                );

                moedas++;

                pontos += 10;


                moedasEl.textContent =
                    moedas;

                pontosEl.textContent =
                    pontos;
            }
        }
    );


    // TIROS

    tiros.forEach(
        (tiro, index) => {

            // tiro do gato no chefão

            if (
                chefao &&
                !tiro.inimigo
            ) {

                if (
                    tiro.x >
                        chefao.x &&
                    tiro.x <
                        chefao.x +
                        chefao.largura &&
                    tiro.y >
                        chefao.y &&
                    tiro.y <
                        chefao.y +
                        chefao.altura
                ) {

                    tiros.splice(
                        index,
                        1
                    );

                    causarDanoNoChefao(1, false);
                }
            }


            // tiro do chefão no gato

            if (tiro.inimigo) {

                const tiroBox = {

                    x: tiro.x,

                    y: tiro.y,

                    largura: tiro.largura,

                    altura: tiro.altura
                };


                if (
                    colisao(
                        gatoBox,
                        tiroBox
                    )
                ) {

                    tiros.splice(
                        index,
                        1
                    );

                    perderVida();
                }
            }
        }
    );
}


// =====================================================
// COLISÃO RETANGULAR
// =====================================================

function colisao(a, b) {

    return (

        a.x <
            b.x + b.largura &&

        a.x + a.largura >
            b.x &&

        a.y <
            b.y + b.altura &&

        a.y + a.altura >
            b.y
    );
}


// =====================================================
// PERDER VIDA
// =====================================================

function perderVida() {

    if (invencivel) return;


    vidas--;

    vidasEl.textContent =
        vidas;


    invencivel = true;

    tempoInvencivel = 90;


    if (vidas <= 0) {

        fimDeJogo();
    }
}


// =====================================================
// CHEFÃO
// =====================================================

function iniciarChefao(dados) {

    chefao = {
        ...dados,
        x: 690,
        y: 155,
        vida: dados.vida,
        vidaMaxima: dados.vida,
        direcao: 1,
        velocidadeAtual: dados.velocidade
    };

    especial = 0;

    proximoAtaqueChefaoEm = tempo + 65;

    obstaculos = [];

    atualizarHUD();

    mostrarAviso(
        `${dados.icone} CHEFE DA FASE ${dados.fase}`,
        `${dados.nome} apareceu! X ataca • acerte golpes para carregar o especial • Z libera quando a barra ficar completa.`
    );
}


// =====================================================
// ATUALIZAR CHEFÃO
// =====================================================

function atualizarChefao() {

    chefao.y +=
        chefao.direcao *
        chefao.velocidadeAtual;


    if (
        chefao.y < 60 ||
        chefao.y > 250
    ) {

        chefao.direcao *= -1;
    }


    // Cada chefe tem uma cadência e uma rajada própria.

    if (tempo >= proximoAtaqueChefaoEm) {

        criarAtaqueChefao();

        proximoAtaqueChefaoEm = tempo + chefao.ataqueIntervalo;
    }


    // chefão fica mais rápido

    if (tempo % 180 === 0) {

        chefao.velocidadeAtual += 0.18;
    }


    // colisão física com o gato

    const gatoBox = {

        x: gato.x + 8,

        y: gato.y + 8,

        largura:
            gato.largura - 16,

        altura:
            gato.altura - 10
    };


    const chefeBox = {

        x: chefao.x,

        y: chefao.y,

        largura: chefao.largura,

        altura: chefao.altura
    };


    if (
        colisao(
            gatoBox,
            chefeBox
        )
    ) {

        perderVida();
    }
}


// =====================================================
// ATAQUE DO GATO
// =====================================================

function atacar() {

    if (!rodando) return;

    if (!chefao) return;

    if (tempo < proximoAtaqueGatoEm) return;

    proximoAtaqueGatoEm = tempo + 11;


    tiros.push({

        x: gato.x + 45,

        y: gato.y + 25,

        largura: 18,

        altura: 8,

        inimigo: false
    });
}


// =====================================================
// ESPECIAL DO GATO
// =====================================================

function usarEspecial() {

    if (!rodando || !chefao) return;

    if (especial < 100) {

        if (tempo - ultimoAvisoEspecialEm > 100) {

            ultimoAvisoEspecialEm = tempo;

            mostrarAviso(
                "⚡ ESPECIAL CARREGANDO",
                `Faltam ${Math.ceil(100 - especial)}% de energia. Acerte o chefe com X!`
            );
        }

        return;
    }

    const dano = Math.max(12, Math.ceil(chefao.vidaMaxima * 0.30));

    especial = 0;

    efeitoEspecialTempo = 28;

    tiros = tiros.filter(tiro => !tiro.inimigo);

    mostrarAviso(
        "⚡ GOLPE ESPECIAL!",
        `O Cat Rush soltou uma explosão astral e causou ${dano} de dano!`
    );

    causarDanoNoChefao(dano, true);
}

function carregarEspecial(valor) {

    if (!chefao) return;

    const estavaPronto = especial >= 100;

    especial = Math.min(100, especial + valor);

    atualizarHUD();

    if (!estavaPronto && especial === 100) {

        mostrarAviso(
            "⚡ ESPECIAL PRONTO!",
            "Aperte Z ou clique em ESPECIAL para usar a explosão astral."
        );
    }
}

function causarDanoNoChefao(dano, especialUsado) {

    if (!chefao) return;

    chefao.vida = Math.max(0, chefao.vida - dano);

    pontos += especialUsado ? dano * 9 : 5;

    if (!especialUsado) carregarEspecial(12);

    atualizarHUD();

    if (chefao.vida <= 0) derrotarChefao();
}


// =====================================================
// ATAQUE DO CHEFÃO
// =====================================================

function criarAtaqueChefao() {

    if (!chefao) return;

    for (let indice = 0; indice < chefao.rajada; indice++) {

        tiros.push({
            x: chefao.x,
            y: chefao.y + 34 + indice * 29,
            largura: 15 + indice * 2,
            altura: 15 + indice * 2,
            cor: chefao.tiro,
            inimigo: true
        });
    }
}


// =====================================================
// DERROTAR CHEFÃO
// =====================================================

function derrotarChefao() {

    const derrotado = chefao;

    chefao = null;

    chefesDerrotados++;

    especial = 0;

    pontos += derrotado.recompensa;

    atualizarHUD();


    mostrarAviso(
        "🏆 VITÓRIA!",
        `${derrotado.nome} foi derrotado! +${derrotado.recompensa} pontos.`
    );

    if (derrotado.final) {

        setTimeout(vencerJogo, 1200);

        return;
    }

    fase = Math.min(6, derrotado.fase + 1);

    setTimeout(() => {
        if (!rodando) return;
        const dadosDaFase = temaAtual();
        atualizarHUD();
        mostrarAviso(`🌆 FASE ${fase}`, `${dadosDaFase.nome}: prepare-se para a próxima corrida!`);
    }, 900);
}


// =====================================================
// VITÓRIA
// =====================================================

function vencerJogo() {

    rodando = false;


    salvarRecorde();

    atualizarRecorde();


    mensagem.innerHTML = `

        <h2>🏆 VOCÊ VENCEU!</h2>

        <p>

            O Gato Sombrio foi derrotado!<br><br>

            ⭐ Pontos:
            <strong>${pontos}</strong><br>

            🪙 Moedas:
            ${moedas}<br>

            🏆 Recorde:
            ${recorde}

        </p>

        <button onclick="iniciarJogo()">
            🔄 JOGAR NOVAMENTE
        </button>
    `;


    mensagem.style.display =
        "flex";
}


// =====================================================
// GAME OVER
// =====================================================

function fimDeJogo() {

    rodando = false;


    salvarRecorde();

    atualizarRecorde();


    mensagem.innerHTML = `

        <h2>💀 GAME OVER</h2>

        <p>

            Você fez
            <strong>${pontos}</strong>
            pontos!<br>

            🪙 Moedas:
            ${moedas}<br>

            🏆 Recorde:
            ${recorde}

        </p>

        <button onclick="iniciarJogo()">
            🔄 JOGAR NOVAMENTE
        </button>
    `;


    mensagem.style.display =
        "flex";
}


// =====================================================
// SALVAR RECORDE NO SUPABASE
// =====================================================

async function salvarRecorde() {

    console.log(
        "🏆 Tentando salvar recorde..."
    );


    const alunoSalvo =
        localStorage.getItem(
            "alunoLogado"
        );


    if (!alunoSalvo) {

        console.error(
            "❌ alunoLogado não encontrado."
        );

        return;
    }


    let aluno;


    try {

        aluno =
            JSON.parse(alunoSalvo);

    } catch (erro) {

        console.error(
            "❌ Erro ao ler aluno:",
            erro
        );

        return;
    }


    if (!aluno.id) {

        console.error(
            "❌ Aluno sem ID."
        );

        return;
    }


    console.log(
        "👤 Salvando para:",
        aluno.nome,
        "ID:",
        aluno.id
    );
// =====================================================
// SALVAR MOEDAS
// =====================================================

const {
    data: dadosAluno,
    error: erroMoedas
} = await supabase
    .from("alunos")
    .select("moedas")
    .eq("id", aluno.id)
    .single();

if (erroMoedas) {

    console.error(
        "❌ ERRO AO BUSCAR MOEDAS:",
        erroMoedas
    );

} else {

    const moedasAtuais =
        dadosAluno.moedas || 0;

    const novasMoedas =
        moedasAtuais + moedas;

    const {
        error: erroAtualizarMoedas
    } = await supabase
        .from("alunos")
        .update({
            moedas: novasMoedas
        })
        .eq("id", aluno.id);

    if (erroAtualizarMoedas) {

        console.error(
            "❌ ERRO AO SALVAR MOEDAS:",
            erroAtualizarMoedas
        );

    } else {

        console.log(
            `🪙 MOEDAS SALVAS! ${moedasAtuais} → ${novasMoedas}`
        );
    }
}

    const {
        data: existente,
        error: erroBusca
    } = await supabase

        .from("recordes_games")

        .select(
            "id, pontuacao"
        )

        .eq(
            "aluno_id",
            aluno.id
        )

        .eq(
            "jogo",
            "cat-rush"
        )

        .maybeSingle();


    if (erroBusca) {

        console.error(
            "❌ ERRO AO BUSCAR RECORDE:",
            erroBusca
        );

        return;
    }


    // Já existe recorde

    if (existente) {

        if (
            pontos <=
            existente.pontuacao
        ) {

            console.log(
                "ℹ️ Recorde anterior é maior."
            );

            return;
        }


        const {
            data,
            error
        } = await supabase

            .from("recordes_games")

            .update({

                pontuacao: pontos

            })

            .eq(
                "id",
                existente.id
            )

            .select();


        if (error) {

            console.error(
                "❌ ERRO AO ATUALIZAR:",
                error
            );

            return;
        }


        console.log(
            "🏆 RECORDE ATUALIZADO:",
            data
        );


        return;
    }


    // Primeiro recorde

    const {
        data,
        error
    } = await supabase

        .from("recordes_games")

        .insert({

            aluno_id: aluno.id,

            jogo: "cat-rush",

            pontuacao: pontos

        })

        .select();


    if (error) {

        console.error(
            "❌ ERRO AO INSERIR:",
            error
        );

        return;
    }


    console.log(
        "🎉 RECORDE SALVO NO SUPABASE:",
        data
    );
}


// =====================================================
// RECORDE LOCAL
// =====================================================

function atualizarRecorde() {

    if (pontos > recorde) {

        recorde = pontos;


        localStorage.setItem(
            "catRushRecorde",
            recorde
        );


        recordeEl.textContent =
            recorde;
    }
}


// =====================================================
// DESENHAR
// =====================================================

function desenhar() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    desenharCeu();

    desenharCidade();

    desenharChao();


    moedasJogo.forEach(
        desenharMoeda
    );


    obstaculos.forEach(
        desenharObstaculo
    );


    tiros.forEach(
        desenharTiro
    );


    if (chefao) {

        desenharChefao();

        desenharBarraChefao();

        desenharBarraEspecial();
    }


    desenharGato();

    desenharIndicadorFase();

    if (efeitoEspecialTempo > 0) desenharEfeitoEspecial();
}


// =====================================================
// CÉU
// =====================================================

function desenharCeu() {

    const tema = temaAtual();

    const gradiente =
        ctx.createLinearGradient(
            0,
            0,
            0,
            canvas.height
        );


    gradiente.addColorStop(0, tema.ceu);

    gradiente.addColorStop(1, tema.ceuFim);


    ctx.fillStyle =
        gradiente;


    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // LUA

    ctx.beginPath();


    ctx.arc(
        760,
        75,
        42,
        0,
        Math.PI * 2
    );


    ctx.fillStyle = fase >= 4 ? "#ff5b5b" : "#fff4c2";


    ctx.fill();


    // ESTRELAS

    for (
        let i = 0;
        i < 50;
        i++
    ) {

        const x =
            (i * 83) %
            canvas.width;


        const y =
            20 +
            (i * 37) %
            180;


        ctx.fillStyle =
            "#ffffff";


        ctx.fillRect(
            x,
            y,
            2,
            2
        );
    }
}


// =====================================================
// CIDADE
// =====================================================

function desenharCidade() {

    const tema = temaAtual();

    for (
        let x = 0;
        x < canvas.width;
        x += 90
    ) {

        const altura =
            80 + (x % 100);


        ctx.fillStyle = tema.predio;


        ctx.fillRect(
            x,
            350 - altura,
            70,
            altura
        );


        for (
            let y =
                350 - altura + 15;

            y < 340;

            y += 22
        ) {

            ctx.fillStyle = tema.janela;


            ctx.fillRect(
                x + 12,
                y,
                8,
                5
            );


            ctx.fillStyle = tema.detalhe;


            ctx.fillRect(
                x + 35,
                y,
                8,
                5
            );
        }
    }
}


// =====================================================
// CHÃO
// =====================================================

function desenharChao() {

    const tema = temaAtual();

    ctx.fillStyle =
        "#080808";


    ctx.fillRect(
        0,
        395,
        canvas.width,
        55
    );


    ctx.strokeStyle = tema.linha;


    ctx.lineWidth = 3;


    ctx.beginPath();


    ctx.moveTo(
        0,
        395
    );


    ctx.lineTo(
        canvas.width,
        395
    );


    ctx.stroke();


    ctx.strokeStyle =
        "#252525";


    ctx.lineWidth = 2;


    for (
        let x = -50;
        x < canvas.width;
        x += 80
    ) {

        ctx.beginPath();


        ctx.moveTo(
            x,
            425
        );


        ctx.lineTo(
            x + 40,
            425
        );


        ctx.stroke();
    }
}


// =====================================================
// GATO
// =====================================================

function desenharGato() {

    const x = gato.x;
    const y = gato.y;


    if (
        invencivel &&
        Math.floor(
            tempoInvencivel / 5
        ) % 2 === 0
    ) {

        ctx.globalAlpha =
            0.35;
    }


    // sombra

    ctx.fillStyle =
        "rgba(0,0,0,.4)";


    ctx.beginPath();


    ctx.ellipse(
        x + 25,
        397,
        28,
        7,
        0,
        0,
        Math.PI * 2
    );


    ctx.fill();


    // corpo

    ctx.fillStyle =
        "#168cff";


    ctx.fillRect(
        x + 8,
        y + 20,
        34,
        30
    );


    // cabeça

    ctx.beginPath();


    ctx.arc(
        x + 25,
        y + 18,
        23,
        0,
        Math.PI * 2
    );


    ctx.fill();


    // orelhas

    ctx.beginPath();


    ctx.moveTo(
        x + 5,
        y + 8
    );


    ctx.lineTo(
        x + 9,
        y - 15
    );


    ctx.lineTo(
        x + 20,
        y + 4
    );


    ctx.fill();


    ctx.beginPath();


    ctx.moveTo(
        x + 30,
        y + 4
    );


    ctx.lineTo(
        x + 43,
        y - 15
    );


    ctx.lineTo(
        x + 47,
        y + 10
    );


    ctx.fill();


    // olhos

    ctx.fillStyle =
        "#050505";


    ctx.beginPath();


    ctx.arc(
        x + 17,
        y + 18,
        6,
        0,
        Math.PI * 2
    );


    ctx.fill();


    ctx.beginPath();


    ctx.arc(
        x + 33,
        y + 18,
        6,
        0,
        Math.PI * 2
    );


    ctx.fill();


    // brilho

    ctx.fillStyle =
        "white";


    ctx.fillRect(
        x + 15,
        y + 16,
        3,
        3
    );


    ctx.fillRect(
        x + 31,
        y + 16,
        3,
        3
    );


    // cauda

    ctx.strokeStyle =
        "#168cff";


    ctx.lineWidth = 8;


    ctx.beginPath();


    ctx.arc(
        x + 5,
        y + 35,
        22,
        Math.PI,
        Math.PI * 1.5
    );


    ctx.stroke();


    ctx.globalAlpha = 1;
}


// =====================================================
// MOEDA
// =====================================================

function desenharMoeda(moeda) {

    ctx.beginPath();


    ctx.arc(
        moeda.x,
        moeda.y,
        moeda.raio,
        0,
        Math.PI * 2
    );


    ctx.fillStyle =
        "#ffd43b";


    ctx.fill();


    ctx.strokeStyle =
        "#fff0a0";


    ctx.lineWidth = 3;


    ctx.stroke();


    ctx.fillStyle =
        "#9b7000";


    ctx.font =
        "bold 17px Arial";


    ctx.textAlign =
        "center";


    ctx.fillText(
        "$",
        moeda.x,
        moeda.y + 6
    );
}


// =====================================================
// OBSTÁCULO
// =====================================================

function desenharObstaculo(
    obstaculo
) {

    const tema = temaAtual();

    ctx.fillStyle =
        obstaculo.alto ? tema.detalhe : "#e92d55";


    ctx.fillRect(
        obstaculo.x,
        obstaculo.y,
        obstaculo.largura,
        obstaculo.altura
    );


    ctx.fillStyle =
        obstaculo.alto ? tema.janela : "#ff6685";


    ctx.fillRect(
        obstaculo.x + 8,
        obstaculo.y + 8,
        10,
        10
    );


    ctx.fillRect(
        obstaculo.x + 25,
        obstaculo.y + 8,
        10,
        10
    );


    ctx.fillStyle =
        "#111";


    ctx.fillRect(
        obstaculo.x + 8,
        obstaculo.y + 28,
        27,
        5
    );
}


// =====================================================
// TIRO
// =====================================================

function desenharTiro(tiro) {

    ctx.fillStyle =
        tiro.inimigo
            ? (tiro.cor || "#ff3333")
            : "#20d9ff";


    ctx.shadowBlur = 15;


    ctx.shadowColor =
        tiro.inimigo
            ? (tiro.cor || "#ff0000")
            : "#00ccff";


    ctx.fillRect(
        tiro.x,
        tiro.y,
        tiro.largura,
        tiro.altura
    );


    ctx.shadowBlur = 0;
}


// =====================================================
// CHEFÃO
// =====================================================

function desenharChefao() {

    const x = chefao.x;
    const y = chefao.y;


    // sombra

    ctx.fillStyle =
        "rgba(0,0,0,.4)";


    ctx.beginPath();


    ctx.ellipse(
        x + 60,
        y + 120,
        60,
        10,
        0,
        0,
        Math.PI * 2
    );


    ctx.fill();


    // corpo

    ctx.fillStyle = chefao.cor;


    ctx.fillRect(
        x + 15,
        y + 35,
        90,
        75
    );


    // cabeça

    ctx.beginPath();


    ctx.arc(
        x + 60,
        y + 35,
        48,
        0,
        Math.PI * 2
    );


    ctx.fill();


    // orelhas

    ctx.beginPath();


    ctx.moveTo(
        x + 18,
        y + 15
    );


    ctx.lineTo(
        x + 20,
        y - 25
    );


    ctx.lineTo(
        x + 45,
        y + 5
    );


    ctx.fill();


    ctx.beginPath();


    ctx.moveTo(
        x + 75,
        y + 5
    );


    ctx.lineTo(
        x + 100,
        y - 25
    );


    ctx.lineTo(
        x + 102,
        y + 18
    );


    ctx.fill();


    // olhos

    ctx.fillStyle = chefao.brilho;


    ctx.beginPath();


    ctx.arc(
        x + 43,
        y + 35,
        9,
        0,
        Math.PI * 2
    );


    ctx.fill();


    ctx.beginPath();


    ctx.arc(
        x + 77,
        y + 35,
        9,
        0,
        Math.PI * 2
    );


    ctx.fill();


    // boca

    ctx.fillStyle =
        "#050505";


    ctx.fillRect(
        x + 38,
        y + 65,
        45,
        12
    );


    ctx.fillStyle =
        "#ffffff";


    ctx.fillRect(
        x + 45,
        y + 65,
        6,
        10
    );


    ctx.fillRect(
        x + 69,
        y + 65,
        6,
        10
    );

    ctx.fillStyle = chefao.brilho;

    ctx.font = "bold 34px Arial";

    ctx.textAlign = "center";

    ctx.fillText(chefao.icone, x + chefao.largura / 2, y + 100);
}


// =====================================================
// BARRA DO CHEFÃO
// =====================================================

function desenharBarraChefao() {

    const largura = 300;

    const altura = 22;

    const x =
        canvas.width / 2 -
        largura / 2;

    const y = 20;


    ctx.fillStyle =
        "#111";


    ctx.fillRect(
        x,
        y,
        largura,
        altura
    );


    const porcentagem =
        chefao.vida /
        chefao.vidaMaxima;


    ctx.fillStyle =
        chefao.cor;


    ctx.fillRect(
        x,
        y,
        largura * porcentagem,
        altura
    );


    ctx.strokeStyle =
        "#ffffff";


    ctx.lineWidth = 2;


    ctx.strokeRect(
        x,
        y,
        largura,
        altura
    );


    ctx.fillStyle =
        "white";


    ctx.font =
        "bold 14px Arial";


    ctx.textAlign =
        "center";


    ctx.fillText(
        `${chefao.icone} ${chefao.nome}`,
        canvas.width / 2,
        y + 16
    );
}


// =====================================================
// BARRA DE ESPECIAL
// =====================================================

function desenharBarraEspecial() {

    const largura = 250;
    const altura = 12;
    const x = canvas.width / 2 - largura / 2;
    const y = 52;

    ctx.fillStyle = "#06101d";
    ctx.fillRect(x, y, largura, altura);

    const gradiente = ctx.createLinearGradient(x, y, x + largura, y);
    gradiente.addColorStop(0, "#168cff");
    gradiente.addColorStop(.65, "#20e2ff");
    gradiente.addColorStop(1, "#fff4a6");
    ctx.fillStyle = gradiente;
    ctx.fillRect(x, y, largura * (especial / 100), altura);

    ctx.strokeStyle = especial === 100 ? "#fff4a6" : "#5c84a8";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, largura, altura);

    ctx.fillStyle = especial === 100 ? "#fff4a6" : "#d7e9ff";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(especial === 100 ? "⚡ ESPECIAL PRONTO — Z" : `ESPECIAL ${Math.round(especial)}%`, canvas.width / 2, y + 10);
}

function desenharEfeitoEspecial() {

    ctx.fillStyle = `rgba(186, 244, 255, ${efeitoEspecialTempo / 90})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#fff4a6";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(gato.x + 42, gato.y + 22);
    ctx.lineTo(canvas.width - 80, 80 + (28 - efeitoEspecialTempo) * 5);
    ctx.stroke();
}


// =====================================================
// INDICADOR DE FASE
// =====================================================

function desenharIndicadorFase() {

    const tema = temaAtual();

    ctx.fillStyle =
        "rgba(0,0,0,.55)";


    ctx.fillRect(
        15,
        15,
        265,
        35
    );


    ctx.fillStyle =
        "#ffffff";


    ctx.font =
        "bold 17px Arial";


    ctx.textAlign =
        "left";


    ctx.fillText(
        `FASE ${fase} • ${tema.nome}`,
        28,
        38
    );
}


// =====================================================
// HUD
// =====================================================

function atualizarHUD() {

    pontosEl.textContent =
        pontos;

    moedasEl.textContent =
        moedas;

    vidasEl.textContent =
        vidas;

    recordeEl.textContent =
        recorde;

    faseHudEl.textContent = `FASE ${fase}`;

    especialBarraEl.style.width = `${especial}%`;

    especialTrilho.setAttribute("aria-valuenow", String(Math.round(especial)));

    const especialPronto = Boolean(chefao && especial >= 100);

    especialTextoEl.textContent = chefao
        ? especialPronto ? "⚡ PRONTO! APERTE Z" : `${Math.round(especial)}% • ACERTE O CHEFE`
        : "AGUARDANDO CHEFE";

    especialTextoEl.classList.toggle("pronto", especialPronto);

    especialBotao.disabled = !especialPronto;
}


// =====================================================
// CARREGAR ALUNO
// =====================================================

carregarAluno();
