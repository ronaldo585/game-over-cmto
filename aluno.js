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

    return quarta
        .toISOString()
        .split("T")[0];
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


    if (elementoProximo) {

        elementoProximo.textContent =
            100;
    }


    if (barraXP) {

        const porcentagem =
            Math.min(xp, 100);

        barraXP.style.width =
            porcentagem + "%";
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


    if (moedasAluno) {

        moedasAluno.textContent =
            Number(moedas || 0);
    }


    if (moedasLoja) {

        moedasLoja.textContent =
            Number(moedas || 0);
    }
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


    if (titulo) {

        if (
            mestreGames === "true"
        ) {

            titulo.textContent =
                "👑 Mestre dos Games";

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

function configurarClickRush(
    aluno,
    desbloqueios
) {

    const area =
        document.getElementById(
            "areaClickRush"
        );

    if (!area) {
        return;
    }


    const desbloqueado =
        desbloqueios.some(
            (jogo) =>
                jogo.jogo === "Click Rush"
        );


    // -------------------------------------------------
    // JOGO JÁ DESBLOQUEADO
    // -------------------------------------------------

    if (desbloqueado) {

        area.innerHTML = `
            <a
                href="Click Rush/index.html"
                class="botao-game"
            >
                ▶ JOGAR
            </a>
        `;

        return;
    }


    // -------------------------------------------------
    // JOGO BLOQUEADO
    // -------------------------------------------------

    area.innerHTML = `
        <button
            type="button"
            id="btnClickRush"
            class="botao-game"
        >
            🔒 DESBLOQUEAR — 🪙 1000
        </button>
    `;


    const botao =
        document.getElementById(
            "btnClickRush"
        );


    if (!botao) {
        return;
    }


    botao.addEventListener(
        "click",
        async () => {

            // -----------------------------------------
            // CONFIRMAR
            // -----------------------------------------

            const confirmar =
                confirm(
                    "🔒 DESBLOQUEAR CLICK RUSH?\n\n" +
                    "🪙 Preço: 1000 moedas\n\n" +
                    "Depois do desbloqueio você poderá jogar quando quiser."
                );


            if (!confirmar) {
                return;
            }


            // -----------------------------------------
            // PEGAR SALDO ATUAL
            // -----------------------------------------

            const moedas =
                Number(
                    aluno.moedas || 0
                );


            if (moedas < 1000) {

                alert(
                    "🪙 Você não tem moedas suficientes!\n\n" +
                    "Você precisa de 1000 moedas."
                );

                return;
            }


            // -----------------------------------------
            // BLOQUEAR BOTÃO
            // -----------------------------------------

            botao.disabled = true;

            botao.textContent =
                "DESBLOQUEANDO...";


            // -----------------------------------------
            // CHAMAR SUPABASE
            // -----------------------------------------

            const {
                data,
                error
            } = await supabase.rpc(
                "desbloquear_jogo",
                {
                    p_aluno_id:
                        aluno.id,

                    p_jogo:
                        "Click Rush"
                }
            );


            console.log(
                "RESULTADO DESBLOQUEIO:",
                data
            );

            console.log(
                "ERRO DESBLOQUEIO:",
                error
            );


            // -----------------------------------------
            // ERRO
            // -----------------------------------------

            if (error) {

                console.error(
                    "ERRO AO DESBLOQUEAR:",
                    error
                );

                alert(
                    "❌ Não foi possível desbloquear o jogo.\n\n" +
                    error.message
                );

                botao.disabled =
                    false;

                botao.textContent =
                    "🔒 DESBLOQUEAR — 🪙 1000";

                return;
            }


            // -----------------------------------------
            // NOVO SALDO
            // -----------------------------------------

            let novoSaldo;


            if (
                data &&
                typeof data === "object"
            ) {

                novoSaldo =
                    Number(
                        data.moedas_restantes
                    );
            }


            if (
                !Number.isFinite(
                    novoSaldo
                )
            ) {

                novoSaldo =
                    moedas - 1000;
            }


            // -----------------------------------------
            // ATUALIZAR ALUNO
            // -----------------------------------------

            aluno.moedas =
                novoSaldo;


            localStorage.setItem(
                "alunoLogado",
                JSON.stringify(aluno)
            );


            // -----------------------------------------
            // ATUALIZAR SALDO NA TELA
            // -----------------------------------------

            atualizarMoedas(
                novoSaldo
            );


            // -----------------------------------------
            // LIBERAR JOGO
            // -----------------------------------------

            area.innerHTML = `
                <a
                    href="Click Rush/index.html"
                    class="botao-game"
                >
                    ▶ JOGAR
                </a>
            `;


            alert(
                "🎉 CLICK RUSH DESBLOQUEADO!\n\n" +
                "🪙 -1000 moedas\n" +
                "💰 Saldo restante: " +
                novoSaldo +
                " moedas"
            );
        }
    );
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