import { supabase } from "./supabase.js";

let alunos = [];

const lista = document.getElementById("listaAlunos");
const turmaSelect = document.getElementById("turma");

function obterTurmasDoAluno(aluno) {
    const valorDaTurma = Array.isArray(aluno?.turma)
        ? aluno.turma.join(" ")
        : String(aluno?.turma || "");
    const turmaNormalizada = valorDaTurma.toUpperCase();
    const turmas = [];

    if (turmaNormalizada.includes("T1")) turmas.push("T1");
    if (turmaNormalizada.includes("T2")) turmas.push("T2");

    // Cadastros antigos sem turma continuam aparecendo para o professor.
    return turmas.length ? turmas : ["T1", "T2"];
}

function alunoPertenceAoFiltro(aluno, filtro) {
    const turmasDoAluno = obterTurmasDoAluno(aluno);

    if (filtro === "T1_T2") {
        return turmasDoAluno.includes("T1") && turmasDoAluno.includes("T2");
    }

    return turmasDoAluno.includes(filtro);
}

function textoDasTurmas(aluno) {
    return obterTurmasDoAluno(aluno).join(" • ");
}

// ======================================================
// SEMANA
// A semana começa na quarta-feira
// ======================================================

function obterSemanaAtual() {
    const agora = new Date();

    const dia = agora.getDay(); // domingo = 0

    // Quantos dias voltamos até quarta-feira
    let diferenca = dia - 3;

    if (diferenca < 0) {
        diferenca += 7;
    }

    const quarta = new Date(agora);
    quarta.setHours(0, 0, 0, 0);
    quarta.setDate(agora.getDate() - diferenca);

    const ano = quarta.getFullYear();
    const mes = String(
        quarta.getMonth() + 1
    ).padStart(2, "0");
    const diaDoMes = String(
        quarta.getDate()
    ).padStart(2, "0");

    return `${ano}-${mes}-${diaDoMes}`;
}

// ======================================================
// REINICIAR PRESENÇAS NA NOVA SEMANA
// Cada presença confirmada gera xp_presenca na tabela
// progresso_semanal. Se não houver registro na semana
// atual, a presença mostrada é de uma semana anterior.
// ======================================================

async function sincronizarPresencasDaSemana() {

    const semana =
        obterSemanaAtual();

    const {
        data: registros,
        error
    } = await supabase
        .from("progresso_semanal")
        .select("aluno_id, xp_presenca")
        .eq("semana", semana);

    if (error) {

        console.error(
            "ERRO AO SINCRONIZAR PRESENÇAS:",
            error
        );

        return;
    }

    const alunosPresentesNestaSemana =
        new Set(
            (registros || [])
                .filter(
                    registro =>
                        Number(registro.xp_presenca || 0) > 0
                )
                .map(registro => registro.aluno_id)
        );

    const idsParaReiniciar = alunos
        .filter(
            aluno =>
                aluno.presente === true &&
                !alunosPresentesNestaSemana.has(aluno.id)
        )
        .map(aluno => aluno.id);

    if (idsParaReiniciar.length === 0) {
        return;
    }

    const { error: erroAtualizacao } =
        await supabase
            .from("alunos")
            .update({ presente: false })
            .in("id", idsParaReiniciar);

    if (erroAtualizacao) {

        console.error(
            "ERRO AO REINICIAR PRESENÇAS:",
            erroAtualizacao
        );

        return;
    }

    alunos.forEach(aluno => {

        if (idsParaReiniciar.includes(aluno.id)) {
            aluno.presente = false;
        }
    });
}

// ======================================================
// CARREGAR ALUNOS
// ======================================================

async function carregarAlunos() {

    if (!lista) return;

    lista.innerHTML = "<p>Carregando alunos...</p>";

    const { data, error } = await supabase
        .from("alunos")
        .select("*")
        .order("nome", { ascending: true });

    if (error) {
        console.error("Erro ao buscar alunos:", error);
        lista.innerHTML = `
            <div class="sem-alunos">
                <p>Erro ao carregar alunos.</p>
                <small>${error.message}</small>
            </div>
        `;
        return;
    }

    alunos = data || [];

    console.log("ALUNOS VINDOS DO SUPABASE:", alunos);

    await sincronizarPresencasDaSemana();

    mostrarAlunos();
}

// ======================================================
// MOSTRAR ALUNOS
// ======================================================

function mostrarAlunos() {

    if (!lista) return;

    const turma = turmaSelect ? turmaSelect.value : "T1";

    const alunosDaTurma = alunos.filter(aluno =>
        alunoPertenceAoFiltro(aluno, turma)
    );

    lista.innerHTML = "";

    if (alunosDaTurma.length === 0) {

        lista.innerHTML = `
            <div class="sem-alunos">
                Nenhum aluno encontrado na turma ${turma}.
            </div>
        `;

        atualizarTotais([]);
        return;
    }

    alunosDaTurma.forEach(aluno => {

        const alunoDiv = document.createElement("div");
        alunoDiv.className = "aluno-chamada";

        const presente = aluno.presente === true;

        alunoDiv.innerHTML = `
            <div class="dados-aluno">
                <strong class="nome-aluno-clicavel">
                    ${escaparHTML(aluno.nome || "Aluno sem nome")}
                </strong>

                <small>${escaparHTML(aluno.email || "")}</small>
                <small class="turmas-do-aluno">Turma${obterTurmasDoAluno(aluno).length > 1 ? "s" : ""}: ${escaparHTML(textoDasTurmas(aluno))}</small>
            </div>

            <div class="acoes-aluno">

                <span class="${presente ? "presente" : "ausente"}">
                    ${presente ? "PRESENTE" : "AUSENTE"}
                </span>

                <button
                    type="button"
                    class="botao-presenca"
                    data-id="${aluno.id}"
                >
                    ${presente ? "MARCAR AUSENTE" : "MARCAR PRESENTE"}
                </button>

            </div>
        `;

        // ==================================================
// CLICAR NO NOME DO ALUNO
// ==================================================

const nome = alunoDiv.querySelector(".nome-aluno-clicavel");

nome.style.cursor = "pointer";

nome.addEventListener("click", function(event) {

    event.stopPropagation();

    console.log(
        "CLICOU NO ALUNO:",
        aluno.nome
    );

    abrirPainelAluno(aluno);
});
        // ==================================================
        // PRESENÇA
        // ==================================================

        const botao = alunoDiv.querySelector(".botao-presenca");

        botao.addEventListener("click", async () => {

            await alterarPresenca(
                aluno.id,
                !presente
            );

        });

        lista.appendChild(alunoDiv);
    });

    atualizarTotais(alunosDaTurma);
}

// ======================================================
// ALTERAR PRESENÇA
// ======================================================

async function alterarPresenca(id, novaPresenca) {

    const aluno = alunos.find(a => a.id === id);

    if (!aluno) return false;

    const { error } = await supabase
        .from("alunos")
        .update({
            presente: novaPresenca
        })
        .eq("id", id);

    if (error) {

        console.error(error);

        alert(
            "Não foi possível atualizar a presença.\n\n" +
            error.message
        );

        return false;
    }

    // Atualiza localmente
    aluno.presente = novaPresenca;

    // Atualiza XP da presença
    await atualizarXPPresenca(aluno);

    mostrarAlunos();

    return true;
}

// ======================================================
// XP DA PRESENÇA
// ======================================================

async function atualizarXPPresenca(aluno) {

    const semana = obterSemanaAtual();

    // Busca progresso da semana
    let { data: progresso, error } = await supabase
        .from("progresso_semanal")
        .select("*")
        .eq("aluno_id", aluno.id)
        .eq("semana", semana)
        .maybeSingle();

    if (error) {
        console.error(error);
        return;
    }

    // Se ainda não existe, cria
    if (!progresso) {

        const { data, error: erroCriar } = await supabase
            .from("progresso_semanal")
            .insert({
                aluno_id: aluno.id,
                semana: semana,
                // O XP começa em zero para que a mudança
                // abaixo aplique corretamente +10 ou -10.
                xp_presenca: 0
            })
            .select()
            .single();

        if (erroCriar) {
            console.error(erroCriar);
            return;
        }

        progresso = data;
    }

    const xpAntigo = progresso.xp_presenca || 0;
    const xpNovo = aluno.presente ? 10 : 0;

    // Só altera se realmente mudou
    if (xpAntigo === xpNovo) return;

    const diferenca = xpNovo - xpAntigo;

    const novoXP = Math.max(
        0,
        (aluno.xp || 0) + diferenca
    );

    const novoNivel = calcularNivel(novoXP);

    // Atualiza XP do aluno
    const { error: erroAluno } = await supabase
        .from("alunos")
        .update({
            xp: novoXP,
            nivel: novoNivel
        })
        .eq("id", aluno.id);

    if (erroAluno) {
        console.error(erroAluno);
        return;
    }

    // Atualiza registro semanal
    const { error: erroSemana } = await supabase
        .from("progresso_semanal")
        .update({
            xp_presenca: xpNovo
        })
        .eq("aluno_id", aluno.id)
        .eq("semana", semana);

    if (erroSemana) {
        console.error(erroSemana);
    }

    aluno.xp = novoXP;
    aluno.nivel = novoNivel;

    console.log(
        `${aluno.nome}: XP atualizado para ${novoXP}`
    );
}

// ======================================================
// NÍVEL
// Cada 100 XP = 1 nível
// ======================================================

function calcularNivel(xp) {
    return Math.floor(xp / 100) + 1;
}

// ======================================================
// PAINEL DO ALUNO
// ======================================================

async function abrirPainelAluno(aluno) {

    const semana = obterSemanaAtual();

    // ==========================================
    // BUSCAR PROGRESSO DA SEMANA
    // ==========================================

    let { data: progresso, error } = await supabase
        .from("progresso_semanal")
        .select("*")
        .eq("aluno_id", aluno.id)
        .eq("semana", semana)
        .maybeSingle();

    if (error) {

        console.error("Erro ao buscar progresso:", error);

        alert("Erro ao carregar as missões.");

        return;
    }


    // ==========================================
    // CRIAR PROGRESSO SE NÃO EXISTIR
    // ==========================================

    if (!progresso) {

        const { data, error: erroCriar } = await supabase
            .from("progresso_semanal")
            .insert({
                aluno_id: aluno.id,
                semana: semana,
                missao1: false,
                missao2: false,
                missao3: false,
                xp_presenca: 0
            })
            .select()
            .single();

        if (erroCriar) {

            console.error(
                "Erro ao criar progresso:",
                erroCriar
            );

            alert("Erro ao criar progresso semanal.");

            return;
        }

        progresso = data;
    }


    // ==========================================
    // CRIAR MODAL
    // ==========================================

    const modal = document.createElement("div");

    modal.className = "modal-professor";


    modal.innerHTML = `

        <div class="modal-conteudo">

            <button
                type="button"
                class="fechar-modal"
            >
                ×
            </button>


            <h2>
                👤 ${escaparHTML(aluno.nome)}
            </h2>


            <p>
                ${escaparHTML(aluno.email || "")}
            </p>


            <div class="dados-xp-professor">

                <strong>
                    ⭐ Nível ${aluno.nivel || 1}
                </strong>

                <span>
                    ${aluno.xp || 0} XP
                </span>

            </div>


            <h3>
                🎯 Missões da semana
            </h3>


            <button
                type="button"
                class="botao-missao ${progresso.missao1 ? "concluida" : ""}"
                data-missao="missao1"
                data-xp="10"
            >

                <span>
                    ${progresso.missao1 ? "✅" : "⬜"}
                    Comparar a aula
                </span>

                <strong>
                    +10 XP
                </strong>

            </button>


            <button
                type="button"
                class="botao-missao ${progresso.missao2 ? "concluida" : ""}"
                data-missao="missao2"
                data-xp="20"
            >

                <span>
                    ${progresso.missao2 ? "✅" : "⬜"}
                    Completar atividade
                </span>

                <strong>
                    +20 XP
                </strong>

            </button>


            <button
                type="button"
                class="botao-missao ${progresso.missao3 ? "concluida" : ""}"
                data-missao="missao3"
                data-xp="30"
            >

                <span>
                    ${progresso.missao3 ? "✅" : "⬜"}
                    Participar do desafio
                </span>

                <strong>
                    +30 XP
                </strong>

            </button>


            <button
                type="button"
                class="botao-remover-aluno"
            >
                🗑️ REMOVER DA CHAMADA
            </button>

        </div>

    `;


    document.body.appendChild(modal);


    // ==========================================
    // FECHAR
    // ==========================================

    const fechar =
        modal.querySelector(".fechar-modal");

    fechar.addEventListener("click", () => {

        modal.remove();

    });


    // ==========================================
    // CLICAR NAS MISSÕES
    // ==========================================

    const botoesMissoes =
        modal.querySelectorAll(".botao-missao");


    botoesMissoes.forEach(botao => {

        botao.addEventListener("click", async () => {

            await alterarMissao(
                aluno,
                progresso,
                botao.dataset.missao,
                Number(botao.dataset.xp),
                botao,
                modal
            );

        });

    });


    // ==========================================
    // REMOVER DA CHAMADA
    // ==========================================

    const botaoRemover =
        modal.querySelector(
            ".botao-remover-aluno"
        );


    botaoRemover.addEventListener(
        "click",
        async () => {

            const confirmar = confirm(
                `Remover ${aluno.nome} da chamada?`
            );


            if (!confirmar) {
                return;
            }

            botaoRemover.disabled = true;
            botaoRemover.textContent =
                "REMOVENDO...";

            // Reutiliza a mesma rotina do botão
            // "Marcar ausente", incluindo o ajuste
            // correto de XP e da presença semanal.
            const removido = await alterarPresenca(
                aluno.id,
                false
            );

            if (removido) {
                modal.remove();
                return;
            }

            botaoRemover.disabled = false;
            botaoRemover.textContent =
                "🗑️ REMOVER DA CHAMADA";

        }
    );

}
// ======================================================
// ALTERAR MISSÃO
// ======================================================

async function alterarMissao(
    aluno,
    progresso,
    nomeMissao,
    xpMissao,
    botao,
    modal
) {

    try {

        // Verifica se a missão já estava concluída
        const jaConcluida = progresso[nomeMissao] === true;

        // Inverte a situação
        const novaSituacao = !jaConcluida;

        // XP atual do aluno
        const xpAtual = Number(aluno.xp) || 0;

        // Adiciona ou remove XP
        const diferencaXP = novaSituacao
            ? xpMissao
            : -xpMissao;

        const novoXP = Math.max(
            0,
            xpAtual + diferencaXP
        );

        const novoNivel = calcularNivel(novoXP);

        // ==============================
        // SALVAR XP DO ALUNO
        // ==============================

        const { error: erroXP } = await supabase
            .from("alunos")
            .update({
                xp: novoXP,
                nivel: novoNivel
            })
            .eq("id", aluno.id);

        if (erroXP) {

            console.error(
                "Erro ao atualizar XP:",
                erroXP
            );

            alert("Não foi possível atualizar o XP.");

            return;
        }

        // ==============================
        // SALVAR MISSÃO DA SEMANA
        // ==============================

        const { error: erroMissao } = await supabase
            .from("progresso_semanal")
            .update({
                [nomeMissao]: novaSituacao
            })
            .eq("aluno_id", aluno.id)
            .eq("semana", obterSemanaAtual());

        if (erroMissao) {

            console.error(
                "Erro ao atualizar missão:",
                erroMissao
            );

            alert("Não foi possível salvar a missão.");

            return;
        }

        
        // ==============================
        // SALVAR MISSÃO DA SEMANA
        // ==============================

        

        // ==============================
        // ATUALIZAR DADOS LOCAIS
        // ==============================

        aluno.xp = novoXP;
        aluno.nivel = novoNivel;

        progresso[nomeMissao] = novaSituacao;

        // ==============================
        // ATUALIZAR BOTÃO
        // ==============================

        botao.classList.toggle(
            "concluida",
            novaSituacao
        );

        botao.innerHTML = `
            <span>
                ${novaSituacao ? "✅" : "⬜"}
                ${nomeMissao === "missao1"
                    ? "Comparar a aula"
                    : nomeMissao === "missao2"
                        ? "Completar atividade"
                        : "Participar do desafio"
                }
            </span>

            <strong>
                ${novaSituacao ? "CONCLUÍDA" : "+" + xpMissao + " XP"}
            </strong>
        `;

        // ==============================
        // ATUALIZAR XP DO PAINEL
        // ==============================

        const xpPainel = modal.querySelector(".xp-aluno");

        if (xpPainel) {
            xpPainel.textContent = `${novoXP} XP`;
        }

        // Atualiza lista de alunos atrás do modal
        mostrarAlunos();

        console.log(
            novaSituacao
                ? `+${xpMissao} XP para ${aluno.nome}`
                : `-${xpMissao} XP de ${aluno.nome}`
        );

    } catch (erro) {

        console.error(
            "ERRO AO ALTERAR MISSÃO:",
            erro
        );

        alert("Erro ao salvar a missão.");
    }
}

// ======================================================
// TOTAIS
// ======================================================

function atualizarTotais(listaAlunos) {

    const total = listaAlunos.length;

    const presentes = listaAlunos.filter(
        aluno => aluno.presente === true
    ).length;

    const ausentes = total - presentes;

    const totalElemento =
        document.getElementById("totalAlunos");

    const presentesElemento =
        document.getElementById("totalPresentes");

    const ausentesElemento =
        document.getElementById("totalAusentes");

    if (totalElemento) {
        totalElemento.textContent = total;
    }

    if (presentesElemento) {
        presentesElemento.textContent = presentes;
    }

    if (ausentesElemento) {
        ausentesElemento.textContent = ausentes;
    }
}

// ======================================================
// ESCAPAR HTML
// ======================================================

function escaparHTML(texto) {

    const div = document.createElement("div");

    div.textContent = texto ?? "";

    return div.innerHTML;
}

// ======================================================
// TROCAR TURMA
// ======================================================

if (turmaSelect) {

    turmaSelect.addEventListener(
        "change",
        mostrarAlunos
    );
}



// ======================================================
// SAIR
// ======================================================

const btnSair =
    document.getElementById("btnSair");

if (btnSair) {

    btnSair.addEventListener("click", () => {

        localStorage.removeItem("professorLogado");

        window.location.href = "professor.html";
    });
}

// ======================================================
// INICIAR
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
    carregarAlunos();
});
