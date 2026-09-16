import { supabase } from "./supabase.js";

// =====================================================
// LOGIN DO ALUNO
// =====================================================

const formularioLogin =
    document.getElementById("formLoginAluno");

if (formularioLogin) {

    formularioLogin.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email =
            document.getElementById("email")?.value.trim();

        const senha =
            document.getElementById("senha")?.value;

        if (!email || !senha) {

            alert("Preencha o e-mail e a senha.");

            return;
        }

        const { data, error } =
            await supabase.auth.signInWithPassword({
                email: email,
                password: senha
            });

        if (error) {

            console.error(
                "ERRO NO LOGIN:",
                error
            );

            alert(
                "E-mail ou senha incorretos."
            );

            return;
        }

        console.log(
            "LOGIN REALIZADO:",
            data
        );

        window.location.href =
            "area-aluno.html";
    });
}


// =====================================================
// SEMANA ATUAL
// Quarta-feira até terça-feira
// =====================================================

function obterSemanaAtual() {

    const agora = new Date();

    const dia = agora.getDay();

    let diferenca =
        dia - 3;

    if (diferenca < 0) {
        diferenca += 7;
    }

    const quarta =
        new Date(agora);

    quarta.setHours(
        0,
        0,
        0,
        0
    );

    quarta.setDate(
        agora.getDate() - diferenca
    );

    const ano = quarta.getFullYear();
    const mes = String(
        quarta.getMonth() + 1
    ).padStart(2, "0");
    const diaDoMes = String(
        quarta.getDate()
    ).padStart(2, "0");

    return `${ano}-${mes}-${diaDoMes}`;
}


// =====================================================
// PRESENÇA POR SEMANA
// A tabela progresso_semanal guarda a presença da semana.
// Assim, toda quarta-feira começa como AUSENTE de novo.
// =====================================================

async function registrarPresencaDaSemana(alunoId) {

    const semana =
        obterSemanaAtual();

    const {
        data: progresso,
        error: erroBusca
    } = await supabase
        .from("progresso_semanal")
        .select("aluno_id")
        .eq("aluno_id", alunoId)
        .eq("semana", semana)
        .maybeSingle();

    if (erroBusca) {

        console.error(
            "ERRO AO BUSCAR PRESENÇA SEMANAL:",
            erroBusca
        );

        return false;
    }

    const dadosPresenca = {
        xp_presenca: 10,
        missao1: true
    };

    const resultado = progresso
        ? await supabase
            .from("progresso_semanal")
            .update(dadosPresenca)
            .eq("aluno_id", alunoId)
            .eq("semana", semana)
        : await supabase
            .from("progresso_semanal")
            .insert({
                aluno_id: alunoId,
                semana: semana,
                missao1: true,
                missao2: false,
                missao3: false,
                xp_presenca: 10
            });

    if (resultado.error) {

        console.error(
            "ERRO AO SALVAR PRESENÇA SEMANAL:",
            resultado.error
        );

        return false;
    }

    return true;
}


async function sincronizarPresencaDaSemana(aluno) {

    if (aluno.presente !== true) {
        return aluno;
    }

    const {
        data: progresso,
        error
    } = await supabase
        .from("progresso_semanal")
        .select("xp_presenca")
        .eq("aluno_id", aluno.id)
        .eq("semana", obterSemanaAtual())
        .maybeSingle();

    if (error) {

        console.error(
            "ERRO AO SINCRONIZAR A PRESENÇA:",
            error
        );

        return aluno;
    }

    const marcouNestaSemana =
        Number(progresso?.xp_presenca || 0) > 0;

    if (marcouNestaSemana) {
        return aluno;
    }

    const { error: erroAtualizacao } =
        await supabase
            .from("alunos")
            .update({ presente: false })
            .eq("id", aluno.id);

    if (erroAtualizacao) {

        console.error(
            "ERRO AO REINICIAR PRESENÇA SEMANAL:",
            erroAtualizacao
        );

        return aluno;
    }

    aluno.presente = false;

    return aluno;
}


// =====================================================
// CALCULAR NÍVEL
// =====================================================

function calcularNivel(xp) {

    if (xp >= 1000) return 10;
    if (xp >= 800) return 9;
    if (xp >= 650) return 8;
    if (xp >= 500) return 7;
    if (xp >= 400) return 6;
    if (xp >= 300) return 5;
    if (xp >= 220) return 4;
    if (xp >= 150) return 3;
    if (xp >= 100) return 2;

    return 1;
}


// =====================================================
// ATUALIZAR XP
// =====================================================

function atualizarXP(xp) {

    const elementoXP =
        document.getElementById("xpAtual");

    const elementoNivel =
        document.getElementById("nivelAluno");

    const barraXP =
        document.getElementById("barraXP");

    const elementoProximo =
        document.getElementById("xpProximo");


    if (elementoXP) {

        elementoXP.textContent =
            xp;
    }


    const nivel =
        calcularNivel(xp);


    if (elementoNivel) {

        elementoNivel.textContent =
            nivel;
    }


    const marcosDeNivel = [
        0, 100, 150, 220, 300,
        400, 500, 650, 800, 1000
    ];

    const inicioDoNivel =
        marcosDeNivel[nivel - 1] || 0;

    const proximoMarco =
        marcosDeNivel[nivel];

    if (elementoProximo) {

        elementoProximo.textContent =
            proximoMarco || "MAX";
    }


    if (barraXP) {

        const porcentagem = proximoMarco
            ? Math.min(
                ((xp - inicioDoNivel) /
                    (proximoMarco - inicioDoNivel)) * 100,
                100
            )
            : 100;

        barraXP.style.width =
            Math.max(porcentagem, 0) + "%";
    }
}


// =====================================================
// ATUALIZAR PRESENÇA
// =====================================================

function atualizarPresencaNaTela(presente) {

    const texto =
        document.getElementById(
            "presencaAluno"
        );

    const botao =
        document.getElementById(
            "botaoPresencaAluno"
        );


    if (presente) {

        if (texto) {

            texto.textContent =
                "PRESENTE";
        }


        if (botao) {

            botao.disabled =
                true;

            botao.textContent =
                "✅ PRESENÇA REGISTRADA";
        }

    } else {

        if (texto) {

            texto.textContent =
                "AUSENTE";
        }


        if (botao) {

            botao.disabled =
                false;

            botao.textContent =
                "📋 MARCAR MINHA PRESENÇA";
        }
    }

    const resumo =
        document.getElementById(
            "presencaResumo"
        );

    if (resumo) {

        resumo.textContent = presente
            ? "Registrada ✓"
            : "Pendente";
    }
}


// =====================================================
// ATUALIZAR MOEDAS
// =====================================================

function atualizarMoedas(moedas) {

    const moedasAluno =
        document.getElementById(
            "moedasAluno"
        );

    const moedasLoja =
        document.getElementById(
            "moedasLoja"
        );

    const moedasResumo =
        document.getElementById(
            "moedasResumo"
        );


    if (moedasAluno) {

        moedasAluno.textContent =
            Number(moedas || 0);
    }


    if (moedasLoja) {

        moedasLoja.textContent =
            Number(moedas || 0);
    }

    if (moedasResumo) {

        moedasResumo.textContent =
            Number(moedas || 0) + " moedas";
    }
}


// =====================================================
// CONQUISTAS
// =====================================================

function atualizarVisualConquista(
    identificador,
    desbloqueada,
    status
) {

    const conquista =
        document.querySelector(
            `[data-conquista="${identificador}"]`
        );

    if (!conquista) {
        return;
    }

    const icone = conquista.querySelector(
        ".conquista-icone"
    );

    const textoStatus = conquista.querySelector(
        ".conquista-status"
    );

    conquista.classList.toggle(
        "bloqueada",
        !desbloqueada
    );

    conquista.classList.toggle(
        "desbloqueada",
        desbloqueada
    );

    if (icone) {
        icone.textContent = desbloqueada
            ? "🏆"
            : "🔒";
    }

    if (textoStatus) {
        textoStatus.textContent = status;
    }
}


async function atualizarConquistas(aluno) {

    const {
        data: registros,
        error
    } = await supabase
        .from("progresso_semanal")
        .select("xp_presenca")
        .eq("aluno_id", aluno.id);

    if (error) {

        console.error(
            "ERRO AO CARREGAR CONQUISTAS:",
            error
        );

        return;
    }

    const totalDeAulas =
        (registros || []).filter(
            registro =>
                Number(registro.xp_presenca || 0) > 0
        ).length;

    atualizarVisualConquista(
        "primeira-presenca",
        totalDeAulas >= 1,
        totalDeAulas >= 1
            ? "Conquistada!"
            : "Registre uma presença"
    );

    atualizarVisualConquista(
        "dez-aulas",
        totalDeAulas >= 10,
        totalDeAulas >= 10
            ? "Conquistada!"
            : `${totalDeAulas} de 10 aulas`
    );

    atualizarVisualConquista(
        "cinquenta-aulas",
        totalDeAulas >= 50,
        totalDeAulas >= 50
            ? "Conquistada!"
            : `${totalDeAulas} de 50 aulas`
    );
}


// =====================================================
// ATUALIZAR RECOMPENSAS
// =====================================================

function atualizarRecompensas() {

    // -------------------------------------------------
    // AVATAR
    // -------------------------------------------------

    const avatar =
        document.getElementById(
            "avatarAluno"
        );


    const avatarSalvo =
        localStorage.getItem(
            "avatarAluno"
        );


    if (avatar) {

        if (
            avatarSalvo === "gato"
        ) {

            avatar.textContent =
                "🐱";

        } else {

            avatar.textContent =
                "👤";
        }
    }


    // -------------------------------------------------
    // TEMA NEON
    // -------------------------------------------------

    const temaNeon =
        localStorage.getItem(
            "temaNeon"
        );


    if (
        temaNeon === "true"
    ) {

        document.body.classList.add(
            "tema-neon"
        );

    } else {

        document.body.classList.remove(
            "tema-neon"
        );
    }


    // -------------------------------------------------
    // COSMÉTICOS DA LOJA RPG
    // -------------------------------------------------

    document.body.classList.toggle(
        "moldura-lunar",
        localStorage.getItem("molduraLunar") === "true"
    );
    document.body.classList.toggle(
        "rastro-astral",
        localStorage.getItem("rastroAstral") === "true"
    );

    // -------------------------------------------------
    // TÍTULO
    // -------------------------------------------------

    const titulo =
        document.getElementById(
            "tituloAluno"
        );


    const mestreGames =
        localStorage.getItem(
            "mestreDosGames"
        );


    const insigniaArena = localStorage.getItem("insigniaArena");

    if (titulo) {

        if (
            mestreGames === "true"
        ) {

            titulo.textContent =
                "👑 Mestre dos Games";

        } else if (insigniaArena === "true") {

            titulo.textContent =
                "🛡️ Desafiante da Arena";

        } else {

            titulo.textContent =
                "Bem-vindo!";
        }
    }
}


// =====================================================
// APLICAR UMA RECOMPENSA
// =====================================================

function aplicarRecompensa(item) {

    console.log(
        "APLICANDO RECOMPENSA:",
        item
    );


    // -------------------------------------------------
    // AVATAR GATO
    // -------------------------------------------------

    if (
        item === "Avatar Gato"
    ) {

        localStorage.setItem(
            "avatarAluno",
            "gato"
        );
    }


    // -------------------------------------------------
    // TEMA NEON
    // -------------------------------------------------

    if (
        item === "Tema Neon"
    ) {

        localStorage.setItem(
            "temaNeon",
            "true"
        );
    }


    // -------------------------------------------------
    // MESTRE DOS GAMES
    // -------------------------------------------------

    if (
        item === "Mestre dos Games"
    ) {

        localStorage.setItem(
            "mestreDosGames",
            "true"
        );
    }


    atualizarRecompensas();
}


// =====================================================
// MARCAR PRESENÇA
// =====================================================

async function marcarPresencaAluno(aluno) {

    if (
        aluno.presente === true
    ) {

        alert(
            "Você já está presente."
        );

        return;
    }


    const xpAtual =
        Number(aluno.xp || 0);

    const novoXP =
        xpAtual + 10;

    const novoNivel =
        calcularNivel(novoXP);


    const {
        data,
        error
    } = await supabase
        .from("alunos")
        .update({
            presente: true,
            xp: novoXP,
            nivel: novoNivel
        })
        .eq("id", aluno.id)
        .select()
        .single();


    console.log(
        "DADOS PRESENÇA:",
        data
    );

    console.log(
        "ERRO PRESENÇA:",
        error
    );


    if (error) {

        console.error(
            "ERRO AO MARCAR PRESENÇA:",
            error
        );

        alert(
            "Não foi possível registrar a presença."
        );

        return;
    }


    aluno.presente =
        true;

    aluno.xp =
        novoXP;

    aluno.nivel =
        novoNivel;


    localStorage.setItem(
        "alunoLogado",
        JSON.stringify(aluno)
    );


    atualizarXP(
        novoXP
    );

    atualizarPresencaNaTela(
        true
    );

    const presencaSemanalSalva =
        await registrarPresencaDaSemana(
            aluno.id
        );

    if (presencaSemanalSalva) {

        await carregarMissoes(
            aluno
        );

        await atualizarConquistas(
            aluno
        );
    }

    if (item === "Moldura Lunar") {
        localStorage.setItem("molduraLunar", "true");
    }

    if (item === "Rastro Astral") {
        localStorage.setItem("rastroAstral", "true");
    }

    if (item === "Insígnia da Arena") {
        localStorage.setItem("insigniaArena", "true");
    }


    alert(
        "Presença registrada! 🎉\n\n" +
        "Você ganhou +10 XP!"
    );
}


// =====================================================
// CARREGAR MISSÕES
// =====================================================

async function carregarMissoes(aluno) {

    const semana =
        obterSemanaAtual();


    const {
        data,
        error
    } = await supabase
        .from("progresso_semanal")
        .select("*")
        .eq("aluno_id", aluno.id)
        .eq("semana", semana)
        .maybeSingle();


    if (error) {

        console.error(
            "ERRO AO BUSCAR MISSÕES:",
            error
        );

        return;
    }


    if (!data) {

        atualizarVisualMissao(
            "missao1",
            false
        );

        atualizarVisualMissao(
            "missao2",
            false
        );

        atualizarVisualMissao(
            "missao3",
            false
        );

        return;
    }


    atualizarVisualMissao(
        "missao1",
        data.missao1 === true
    );

    atualizarVisualMissao(
        "missao2",
        data.missao2 === true
    );

    atualizarVisualMissao(
        "missao3",
        data.missao3 === true
    );
}


// =====================================================
// VISUAL DAS MISSÕES
// =====================================================

function atualizarVisualMissao(
    numero,
    concluida
) {

    const missoes =
        document.querySelectorAll(
            ".missao"
        );


    missoes.forEach(
        (elemento) => {

            if (
                elemento.dataset.missao !== numero
            ) {

                return;
            }


            const texto =
                elemento.querySelector(
                    "span"
                );


            if (concluida) {

                elemento.classList.add(
                    "concluida"
                );


                if (texto) {

                    texto.textContent =
                        "☑ " +
                        texto.textContent
                            .replace(
                                "☐ ",
                                ""
                            )
                            .replace(
                                "☑ ",
                                ""
                            );
                }

            } else {

                elemento.classList.remove(
                    "concluida"
                );


                if (texto) {

                    texto.textContent =
                        "☐ " +
                        texto.textContent
                            .replace(
                                "☐ ",
                                ""
                            )
                            .replace(
                                "☑ ",
                                ""
                            );
                }
            }
        }
    );
}

// =====================================================
// CARREGAR DESBLOQUEIOS DOS JOGOS
// =====================================================

async function carregarDesbloqueiosJogos(aluno) {

    const {
        data,
        error
    } = await supabase
        .from("desbloqueios_jogos")
        .select("*")
        .eq("aluno_id", aluno.id);

    if (error) {

        console.error(
            "ERRO AO CARREGAR DESBLOQUEIOS:",
            error
        );

        return [];
    }

    console.log(
        "DESBLOQUEIOS DO ALUNO:",
        data
    );

    return data || [];
}

// =====================================================
// CONFIGURAR CLICK RUSH
// =====================================================

function configurarClickRush(aluno, desbloqueios) {

    console.log("CONFIGURANDO CLICK RUSH...");
    console.log("ALUNO:", aluno);
    console.log("DESBLOQUEIOS:", desbloqueios);

    const area = document.getElementById("areaClickRush");

    if (!area) {
        console.error("ERRO: areaClickRush não encontrada!");
        return;
    }

    const desbloqueado = desbloqueios.some(
        (jogo) => jogo.jogo === "Click Rush"
    );

    console.log("CLICK RUSH DESBLOQUEADO:", desbloqueado);

    // =================================================
    // JÁ DESBLOQUEADO
    // =================================================

    if (desbloqueado) {

        area.innerHTML = `
            <a
                href="click-rush/click-rush.html"
                class="botao-game"
            >
                ▶ JOGAR
            </a>
        `;

        return;
    }

    // =================================================
    // BLOQUEADO
    // =================================================

    area.innerHTML = `
        <button
            type="button"
            id="btnClickRush"
            class="botao-game"
        >
            🔒 DESBLOQUEAR — 🪙 1000
        </button>
    `;

    const botao = document.getElementById("btnClickRush");

    if (!botao) {
        console.error("ERRO: botão Click Rush não encontrado!");
        return;
    }

    console.log("BOTÃO CLICK RUSH ENCONTRADO!");

    // =================================================
    // CLIQUE
    // =================================================

    botao.onclick = async function () {

        console.log("CLIQUE NO CLICK RUSH!");

        const moedas = Number(aluno.moedas || 0);

        console.log("MOEDAS ATUAIS:", moedas);

        // ---------------------------------------------
        // VERIFICAR MOEDAS
        // ---------------------------------------------

        if (moedas < 1000) {

            alert(
                "🪙 MOEDAS INSUFICIENTES!\n\n" +
                "Você precisa de 1000 moedas para desbloquear o Click Rush.\n\n" +
                "Seu saldo atual: " +
                moedas +
                " moedas."
            );

            return;
        }

        // ---------------------------------------------
        // CONFIRMAR
        // ---------------------------------------------

        const confirmar = confirm(
            "🔒 DESBLOQUEAR CLICK RUSH?\n\n" +
            "🪙 Preço: 1000 moedas\n\n" +
            "Seu saldo: " + moedas + " moedas"
        );

        if (!confirmar) {
            console.log("Usuário cancelou.");
            return;
        }

        // ---------------------------------------------
        // DESABILITAR BOTÃO
        // ---------------------------------------------

        botao.disabled = true;
        botao.textContent = "⏳ DESBLOQUEANDO...";

        console.log("CHAMANDO RPC desbloquear_jogo...");

        // ---------------------------------------------
        // SUPABASE
        // ---------------------------------------------

        const { data, error } = await supabase.rpc(
            "desbloquear_jogo",
            {
                p_aluno_id: aluno.id,
                p_jogo: "Click Rush"
            }
        );

        console.log("RPC DATA:", data);
        console.log("RPC ERROR:", error);

        // ---------------------------------------------
        // ERRO
        // ---------------------------------------------

        if (error) {

            console.error(
                "ERRO AO DESBLOQUEAR:",
                error
            );

            alert(
                "❌ ERRO AO DESBLOQUEAR!\n\n" +
                error.message
            );

            botao.disabled = false;
            botao.textContent =
                "🔒 DESBLOQUEAR — 🪙 1000";

            return;
        }

        // ---------------------------------------------
        // NOVO SALDO
        // ---------------------------------------------

        let novoSaldo = moedas - 1000;

        if (data) {

            if (Array.isArray(data)) {

                if (
                    data[0] &&
                    data[0].moedas_restantes !== undefined
                ) {

                    novoSaldo = Number(
                        data[0].moedas_restantes
                    );
                }

            } else if (
                data.moedas_restantes !== undefined
            ) {

                novoSaldo = Number(
                    data.moedas_restantes
                );
            }
        }

        console.log("NOVO SALDO:", novoSaldo);

        // ---------------------------------------------
        // ATUALIZAR ALUNO
        // ---------------------------------------------

        aluno.moedas = novoSaldo;

        localStorage.setItem(
            "alunoLogado",
            JSON.stringify(aluno)
        );

        atualizarMoedas(novoSaldo);

        // ---------------------------------------------
        // LIBERAR JOGO
        // ---------------------------------------------

        area.innerHTML = `
            <a
                href="click-rush/click-rush.html"
                class="botao-game"
            >
                ▶ JOGAR
            </a>
        `;

        alert(
            "🎉 CLICK RUSH DESBLOQUEADO!\n\n" +
            "🪙 Você gastou 1000 moedas.\n\n" +
            "💰 Saldo restante: " +
            novoSaldo +
            " moedas."
        );
    };
}
// =====================================================
// CARREGAR COMPRAS DO ALUNO
// =====================================================

async function carregarComprasAluno(aluno) {

    const {
        data,
        error
    } = await supabase
        .from("compras_loja")
        .select("*")
        .eq("aluno_id", aluno.id);


    if (error) {

        console.error(
            "ERRO AO CARREGAR COMPRAS:",
            error
        );

        return [];
    }


    console.log(
        "COMPRAS DO ALUNO:",
        data
    );


    return data || [];
}


// =====================================================
// COLEÇÃO DE CRIATURAS DO RPG
// =====================================================

const catalogoCriaturas = {
    muscante: { nome: "Muscante", elemento: "NATUREZA", icone: "🌿", raridade: "COMUM" },
    folhito: { nome: "Folhito", elemento: "FOLHA", icone: "🍃", raridade: "COMUM" },
    pedrino: { nome: "Pedrino", elemento: "PEDRA", icone: "🪨", raridade: "COMUM" },
    brilux: { nome: "Brilux", elemento: "LUZ", icone: "✨", raridade: "RARA" },
    mareon: { nome: "Maréon", elemento: "ÁGUA", icone: "💧", raridade: "RARA" },
    brasafim: { nome: "Brasafim", elemento: "BRASA", icone: "🔥", raridade: "RARA" },
    nimbara: { nome: "Nimbara", elemento: "NÉVOA", icone: "🌙", raridade: "ÉPICA" },
    cristalume: { nome: "Cristalume", elemento: "CRISTAL", icone: "💎", raridade: "ÉPICA" },
    aurorafera: { nome: "Aurorafera", elemento: "AURORA", icone: "🌟", raridade: "LENDÁRIA" }
};

function dadosDaCriatura(criatura) {
    return catalogoCriaturas[criatura.chave] || {
        nome: criatura.nome || "Criatura misteriosa",
        elemento: criatura.elemento || "MISTÉRIO",
        icone: "✦",
        raridade: "DESCONHECIDA"
    };
}

async function carregarColecaoCriaturas(aluno) {

    const { data, error } = await supabase
        .from("rpg_criaturas_aluno")
        .select("id,chave,nome,elemento,nivel,capturas,posicao_time")
        .eq("aluno_id", String(aluno.id))
        .order("posicao_time", { ascending: true, nullsFirst: false })
        .order("nome", { ascending: true });

    if (error) {
        console.error("ERRO AO CARREGAR COLEÇÃO:", error);
        return null;
    }

    return data || [];
}

function mostrarColecaoCriaturas(aluno, criaturas) {

    const time = document.getElementById("timeCriaturas");
    const lista = document.getElementById("listaCriaturas");
    const status = document.getElementById("statusColecao");

    if (!time || !lista || !status) return;

    const criaturasAtivas = criaturas.filter(criatura => criatura.posicao_time);

    time.innerHTML = [1, 2, 3].map(posicao => {
        const criatura = criaturas.find(item => Number(item.posicao_time) === posicao);
        if (!criatura) {
            return `<div class="slot-time"><span class="slot-icone">＋</span><span><b>Slot ${posicao}</b><small>Capture uma criatura</small></span></div>`;
        }
        const dados = dadosDaCriatura(criatura);
        return `<div class="slot-time ativo"><span class="slot-icone">${dados.icone}</span><span><b>${dados.nome}</b><small>Nível ${criatura.nivel || 1} • ${dados.elemento}</small></span></div>`;
    }).join("");

    if (criaturas.length === 0) {
        status.textContent = "Sua coleção está vazia. Capture criaturas no Bosque para formar seu time.";
        lista.innerHTML = "";
        return;
    }

    status.textContent = `${criaturas.length} criatura${criaturas.length === 1 ? "" : "s"} na coleção • ${criaturasAtivas.length}/3 no time ativo`;

    lista.innerHTML = criaturas.map(criatura => {
        const dados = dadosDaCriatura(criatura);
        const estaNoTime = Boolean(criatura.posicao_time);
        const classeRaridade = {
            COMUM: "comum",
            RARA: "rara",
            "ÉPICA": "epica",
            "LENDÁRIA": "lendaria"
        }[dados.raridade] || "comum";
        return `
            <article class="criatura-colecao ${estaNoTime ? "ativa" : "no-time"}">
                <span class="criatura-icone" aria-hidden="true">${dados.icone}</span>
                <h3>${dados.nome}</h3>
                <p>${dados.elemento} <span class="raridade-criatura raridade-${classeRaridade}">${dados.raridade}</span></p>
                <div class="criatura-dados"><span>🌟 Nv. ${criatura.nivel || 1}</span><span>🔮 ${criatura.capturas || 1} captura${Number(criatura.capturas || 1) === 1 ? "" : "s"}</span></div>
                <button type="button" class="btn-time" data-criatura-id="${criatura.id}" data-posicao="${criatura.posicao_time || ""}">
                    ${estaNoTime ? "REMOVER DO TIME" : "ADICIONAR AO TIME"}
                </button>
            </article>
        `;
    }).join("");

    lista.onclick = async event => {
        const botao = event.target.closest("[data-criatura-id]");
        if (!botao) return;

        const id = botao.dataset.criaturaId;
        const posicaoAtual = Number(botao.dataset.posicao || 0);
        const proximaPosicao = posicaoAtual || [1, 2, 3].find(posicao =>
            !criaturas.some(criatura => Number(criatura.posicao_time) === posicao)
        );

        botao.disabled = true;
        const { error } = await supabase
            .from("rpg_criaturas_aluno")
            .update({ posicao_time: posicaoAtual ? null : proximaPosicao })
            .eq("id", id)
            .eq("aluno_id", String(aluno.id));

        if (error) {
            console.error("ERRO AO ATUALIZAR TIME:", error);
            alert("Não foi possível atualizar seu time agora.");
            botao.disabled = false;
            return;
        }

        const colecaoAtualizada = await carregarColecaoCriaturas(aluno);
        if (colecaoAtualizada) mostrarColecaoCriaturas(aluno, colecaoAtualizada);
    };
}


// =====================================================
// CONFIGURAR LOJA
// =====================================================

async function configurarLoja(compras = []) {

    const btnLoja =
        document.getElementById(
            "btnLoja"
        );

    const painelLoja =
        document.getElementById(
            "painelLoja"
        );

    const moedasLoja =
        document.getElementById(
            "moedasLoja"
        );


    // -------------------------------------------------
    // ATUALIZAR LOJA
    // -------------------------------------------------

    function atualizarLoja() {

        const elementoMoedas =
            document.getElementById(
                "moedasAluno"
            );


        const moedas =
            Number(
                elementoMoedas?.textContent
            ) || 0;


        if (moedasLoja) {

            moedasLoja.textContent =
                moedas;
        }


        document
            .querySelectorAll(
                ".btn-comprar"
            )
            .forEach(
                (botao) => {

                    const item =
                        botao.dataset.item;

                    const preco =
                        Number(
                            botao.dataset.preco
                        ) || 0;


                    const jaComprou =
                        compras.some(
                            (compra) =>
                                compra.item === item
                        );


                    if (jaComprou) {

                        botao.textContent =
                            "COMPRADO ✓";

                        botao.disabled =
                            true;

                    } else {

                        botao.textContent =
                            "COMPRAR";

                        botao.disabled =
                            moedas < preco;
                    }
                }
            );
    }


    // -------------------------------------------------
    // ABRIR / FECHAR LOJA
    // -------------------------------------------------

    if (
        btnLoja &&
        painelLoja
    ) {

        btnLoja.addEventListener(
            "click",
            () => {

                painelLoja.classList.toggle(
                    "aberta"
                );


                if (
                    painelLoja.classList.contains(
                        "aberta"
                    )
                ) {

                    atualizarLoja();
                }
            }
        );
    }


    // -------------------------------------------------
    // BOTÕES DE COMPRA
    // -------------------------------------------------

    document
        .querySelectorAll(
            ".btn-comprar"
        )
        .forEach(
            (botao) => {

                botao.addEventListener(
                    "click",
                    async () => {

                        const preco =
                            Number(
                                botao.dataset.preco
                            ) || 0;


                        const item =
                            botao.dataset.item ||
                            "Recompensa";


                        // ---------------------------------
                        // VERIFICAR COMPRA DUPLICADA
                        // ---------------------------------

                        const jaComprou =
                            compras.some(
                                (compra) =>
                                    compra.item === item
                            );


                        if (jaComprou) {

                            alert(
                                "Você já possui esta recompensa! 🎉"
                            );

                            return;
                        }


                        // ---------------------------------
                        // PEGAR ALUNO
                        // ---------------------------------

                        const alunoSalvo =
                            localStorage.getItem(
                                "alunoLogado"
                            );


                        if (!alunoSalvo) {

                            alert(
                                "Aluno não identificado."
                            );

                            return;
                        }


                        let aluno;


                        try {

                            aluno =
                                JSON.parse(
                                    alunoSalvo
                                );

                        } catch (erro) {

                            console.error(
                                "ERRO AO LER ALUNO:",
                                erro
                            );

                            alert(
                                "Erro ao identificar o aluno."
                            );

                            return;
                        }


                        // ---------------------------------
                        // PEGAR MOEDAS
                        // ---------------------------------

                        const moedas =
                            Number(
                                aluno.moedas || 0
                            );


                        if (
                            moedas < preco
                        ) {

                            alert(
                                "🪙 Você não tem moedas suficientes!"
                            );

                            return;
                        }


                        // ---------------------------------
                        // BLOQUEAR BOTÃO
                        // ---------------------------------

                        botao.disabled =
                            true;

                        botao.textContent =
                            "COMPRANDO...";


                        // ---------------------------------
                        // FAZER COMPRA
                        // ---------------------------------

                        const {
                            data,
                            error
                        } = await supabase.rpc(
                            "comprar_item",
                            {
                                p_aluno_id:
                                    aluno.id,

                                p_item:
                                    item,

                                p_preco:
                                    preco
                            }
                        );


                        console.log(
                            "RESULTADO DA COMPRA:",
                            data
                        );

                        console.log(
                            "ERRO DA COMPRA:",
                            error
                        );


                        // ---------------------------------
                        // ERRO
                        // ---------------------------------

                        if (error) {

                            console.error(
                                "ERRO AO COMPRAR:",
                                error
                            );

                            alert(
                                "❌ Não foi possível realizar a compra."
                            );

                            botao.disabled =
                                false;

                            botao.textContent =
                                "COMPRAR";

                            return;
                        }


                        // ---------------------------------
                        // NOVO SALDO
                        // ---------------------------------

                        let novoSaldo;


                        if (
                            data &&
                            typeof data === "object"
                        ) {

                            if (
                                Array.isArray(data)
                            ) {

                                novoSaldo =
                                    Number(
                                        data[0]?.moedas_restantes
                                    );

                            } else {

                                novoSaldo =
                                    Number(
                                        data.moedas_restantes
                                    );
                            }
                        }


                        if (
                            !Number.isFinite(
                                novoSaldo
                            )
                        ) {

                            novoSaldo =
                                moedas - preco;
                        }


                        // ---------------------------------
                        // ATUALIZAR ALUNO
                        // ---------------------------------

                        aluno.moedas =
                            novoSaldo;


                        localStorage.setItem(
                            "alunoLogado",
                            JSON.stringify(aluno)
                        );


                        // ---------------------------------
                        // ATUALIZAR MOEDAS
                        // ---------------------------------

                        atualizarMoedas(
                            novoSaldo
                        );


                        // ---------------------------------
                        // SALVAR COMPRA NA MEMÓRIA
                        // ---------------------------------

                        compras.push({
                            aluno_id:
                                aluno.id,

                            item:
                                item,

                            preco:
                                preco
                        });


                        // ---------------------------------
                        // APLICAR RECOMPENSA
                        // ---------------------------------

                        aplicarRecompensa(
                            item
                        );


                        // ---------------------------------
                        // ATUALIZAR LOJA
                        // ---------------------------------

                        atualizarLoja();


                        // ---------------------------------
                        // MENSAGEM
                        // ---------------------------------

                        alert(
                            "🎉 COMPRA REALIZADA!\n\n" +
                            `${item}\n` +
                            `🪙 -${preco} moedas\n\n` +
                            `💰 Saldo: ${novoSaldo} moedas`
                        );


                        botao.textContent =
                            "COMPRADO ✓";

                        botao.disabled =
                            true;
                    }
                );
            }
        );


    // Atualizar imediatamente
    atualizarLoja();
}


// =====================================================
// CARREGAR ÁREA DO ALUNO
// =====================================================

async function carregarAreaAluno() {

    console.log(
        "CARREGANDO ÁREA DO ALUNO..."
    );


    // -------------------------------------------------
    // SESSÃO
    // -------------------------------------------------

    const {
        data: sessaoData,
        error: sessaoError
    } = await supabase.auth.getSession();


    if (sessaoError) {

        console.error(
            "ERRO AO PEGAR SESSÃO:",
            sessaoError
        );

        return;
    }


    const sessao =
        sessaoData?.session;


    if (!sessao) {

        console.log(
            "NENHUM ALUNO LOGADO."
        );

        window.location.href =
            "aluno.html";

        return;
    }


    // -------------------------------------------------
    // BUSCAR ALUNO
    // -------------------------------------------------

    const email =
        sessao.user.email;


    const {
        data: aluno,
        error
    } = await supabase
        .from("alunos")
        .select("*")
        .eq("email", email)
        .maybeSingle();


    if (error) {

        console.error(
            "ERRO AO BUSCAR ALUNO:",
            error
        );

        return;
    }


    if (!aluno) {

        alert(
            "Aluno não encontrado no cadastro."
        );

        return;
    }


    console.log(
        "ALUNO ENCONTRADO:",
        aluno
    );

    // Se a presença foi marcada em uma semana anterior,
    // ela volta para AUSENTE na nova semana (quarta-feira).
    await sincronizarPresencaDaSemana(
        aluno
    );


    // -------------------------------------------------
    // SALVAR ALUNO
    // -------------------------------------------------

    localStorage.setItem(
        "alunoLogado",
        JSON.stringify(aluno)
    );


    // -------------------------------------------------
    // NOME
    // -------------------------------------------------

    const nome =
        document.getElementById(
            "nomeAluno"
        );


    if (nome) {

        nome.textContent =
            aluno.nome;
    }


    // -------------------------------------------------
    // XP
    // -------------------------------------------------

    atualizarXP(
        Number(aluno.xp || 0)
    );


    // -------------------------------------------------
    // MOEDAS
    // -------------------------------------------------

    atualizarMoedas(
        Number(aluno.moedas || 0)
    );


    // -------------------------------------------------
    // RECOMPENSAS SALVAS
    // -------------------------------------------------

    atualizarRecompensas();


    // -------------------------------------------------
    // PRESENÇA
    // -------------------------------------------------

    atualizarPresencaNaTela(
        aluno.presente === true
    );


    // -------------------------------------------------
    // BOTÃO DE PRESENÇA
    // -------------------------------------------------

    const botaoPresenca =
        document.getElementById(
            "botaoPresencaAluno"
        );


    if (botaoPresenca) {

        botaoPresenca.onclick =
            async () => {

                await marcarPresencaAluno(
                    aluno
                );
            };
    }


    // -------------------------------------------------
    // MISSÕES
    // -------------------------------------------------

    await carregarMissoes(
        aluno
    );

    await atualizarConquistas(
        aluno
    );


    // -------------------------------------------------
    // COMPRAS
    // -------------------------------------------------

    const compras =
        await carregarComprasAluno(
            aluno
        );

// -------------------------------------------------
// DESBLOQUEIOS DOS JOGOS
// -------------------------------------------------

const desbloqueios =
    await carregarDesbloqueiosJogos(
        aluno
    );


// -------------------------------------------------
// CONFIGURAR CLICK RUSH
// -------------------------------------------------

configurarClickRush(
    aluno,
    desbloqueios
);
    // -------------------------------------------------
    // APLICAR COMPRAS ANTIGAS
    // -------------------------------------------------

    compras.forEach(
        (compra) => {

            aplicarRecompensa(
                compra.item
            );
        }
    );


    // -------------------------------------------------
    // COLEÇÃO DO RPG
    // -------------------------------------------------

    const colecaoCriaturas = await carregarColecaoCriaturas(
        aluno
    );

    if (colecaoCriaturas) {
        mostrarColecaoCriaturas(
            aluno,
            colecaoCriaturas
        );
    }


    // -------------------------------------------------
    // LOJA
    // -------------------------------------------------

    await configurarLoja(
        compras
    );
}


// =====================================================
// INICIAR ÁREA DO ALUNO
// =====================================================

if (
    document.getElementById("nomeAluno") ||
    document.getElementById(
        "botaoPresencaAluno"
    )
) {

    carregarAreaAluno();
}
