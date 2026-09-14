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

let fase = 1;

let obstaculos = [];
let moedasJogo = [];

let tiros = [];

let chefao = null;

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

    fase = 1;

    obstaculos = [];

    moedasJogo = [];

    tiros = [];

    chefao = null;

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
    }
);


pularBtn.addEventListener(
    "click",
    pular
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
            6 +
            (fase - 1) * 1.2 +
            Math.floor(pontos / 150) * 0.4;


        const intervalo =
            Math.max(
                35,
                85 - pontos / 5 - fase * 5
            );


        if (
            tempo %
            Math.floor(intervalo) === 0
        ) {

            criarObstaculo();
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

    if (
        pontos >= 300 &&
        fase === 1
    ) {

        fase = 2;


        mostrarAviso(
            "⚡ FASE 2",
            "A cidade ficou mais perigosa!"
        );
    }


    if (
        pontos >= 600 &&
        fase === 2 &&
        !chefao
    ) {

        fase = 3;

        iniciarChefao();
    }
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

    obstaculos.push({

        x: canvas.width + 50,

        y: 355,

        largura: 42,

        altura: 40
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

                    chefao.vida--;

                    pontos += 5;

                    pontosEl.textContent =
                        pontos;


                    if (
                        chefao.vida <= 0
                    ) {

                        derrotarChefao();
                    }
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

function iniciarChefao() {

    chefao = {

        x: 680,

        y: 160,

        largura: 120,

        altura: 120,

        vida: 20,

        vidaMaxima: 20,

        direcao: 1,

        velocidade: 2
    };


    obstaculos = [];


    mostrarAviso(
        "👹 CHEFÃO!",
        "Aperte X para atacar o Gato Sombrio!"
    );
}


// =====================================================
// ATUALIZAR CHEFÃO
// =====================================================

function atualizarChefao() {

    chefao.y +=
        chefao.direcao *
        chefao.velocidade;


    if (
        chefao.y < 60 ||
        chefao.y > 250
    ) {

        chefao.direcao *= -1;
    }


    // ataque do chefão

    if (tempo % 100 === 0) {

        criarAtaqueChefao();
    }


    // chefão fica mais rápido

    if (tempo % 180 === 0) {

        chefao.velocidade += 0.3;
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


    tiros.push({

        x: gato.x + 45,

        y: gato.y + 25,

        largura: 18,

        altura: 8,

        inimigo: false
    });
}


// =====================================================
// ATAQUE DO CHEFÃO
// =====================================================

function criarAtaqueChefao() {

    if (!chefao) return;


    tiros.push({

        x: chefao.x,

        y: chefao.y + 55,

        largura: 15,

        altura: 15,

        inimigo: true
    });
}


// =====================================================
// DERROTAR CHEFÃO
// =====================================================

function derrotarChefao() {

    chefao = null;

    pontos += 500;

    pontosEl.textContent =
        pontos;


    mostrarAviso(
        "🏆 VITÓRIA!",
        "Você derrotou o Gato Sombrio!"
    );


    setTimeout(
        vencerJogo,
        1200
    );
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
    }


    desenharGato();

    desenharIndicadorFase();
}


// =====================================================
// CÉU
// =====================================================

function desenharCeu() {

    const gradiente =
        ctx.createLinearGradient(
            0,
            0,
            0,
            canvas.height
        );


    if (fase === 1) {

        gradiente.addColorStop(
            0,
            "#030817"
        );

        gradiente.addColorStop(
            1,
            "#12355a"
        );

    } else if (fase === 2) {

        gradiente.addColorStop(
            0,
            "#16051f"
        );

        gradiente.addColorStop(
            1,
            "#5a123d"
        );

    } else {

        gradiente.addColorStop(
            0,
            "#210000"
        );

        gradiente.addColorStop(
            1,
            "#5a1010"
        );
    }


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


    ctx.fillStyle =
        fase === 3
            ? "#ff5b5b"
            : "#fff4c2";


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

    for (
        let x = 0;
        x < canvas.width;
        x += 90
    ) {

        const altura =
            80 + (x % 100);


        ctx.fillStyle =
            fase === 2
                ? "#190b20"
                : fase === 3
                    ? "#260707"
                    : "#08101d";


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

            ctx.fillStyle =
                fase === 2
                    ? "#ff3ca6"
                    : "#168cff";


            ctx.fillRect(
                x + 12,
                y,
                8,
                5
            );


            ctx.fillStyle =
                fase === 3
                    ? "#ff4444"
                    : "#ffd43b";


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

    ctx.fillStyle =
        "#080808";


    ctx.fillRect(
        0,
        395,
        canvas.width,
        55
    );


    ctx.strokeStyle =
        fase === 3
            ? "#ff3030"
            : "#168cff";


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

    ctx.fillStyle =
        "#e92d55";


    ctx.fillRect(
        obstaculo.x,
        obstaculo.y,
        obstaculo.largura,
        obstaculo.altura
    );


    ctx.fillStyle =
        "#ff6685";


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
            ? "#ff3333"
            : "#20d9ff";


    ctx.shadowBlur = 15;


    ctx.shadowColor =
        tiro.inimigo
            ? "#ff0000"
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

    ctx.fillStyle =
        "#6f102d";


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

    ctx.fillStyle =
        "#ff2222";


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
        "#e92d55";


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
        "👹 GATO SOMBRIO",
        canvas.width / 2,
        y + 16
    );
}


// =====================================================
// INDICADOR DE FASE
// =====================================================

function desenharIndicadorFase() {

    ctx.fillStyle =
        "rgba(0,0,0,.55)";


    ctx.fillRect(
        15,
        15,
        120,
        35
    );


    ctx.fillStyle =
        "#ffffff";


    ctx.font =
        "bold 17px Arial";


    ctx.textAlign =
        "left";


    ctx.fillText(
        `FASE ${fase}`,
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
}


// =====================================================
// CARREGAR ALUNO
// =====================================================

carregarAluno();