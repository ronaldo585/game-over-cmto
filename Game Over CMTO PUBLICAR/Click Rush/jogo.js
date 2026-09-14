import { supabase } from "../supabase.js";


// =====================================================
// CONFIGURAÇÕES
// =====================================================

const TEMPO_TOTAL = 30;
const MOEDA_POR_CLIQUE = 1;


// =====================================================
// ELEMENTOS
// =====================================================

const botaoIniciar =
    document.getElementById("botaoIniciar");

const botaoMoeda =
    document.getElementById("botaoMoeda");

const botaoJogarNovamente =
    document.getElementById("botaoJogarNovamente");

const moedasJogo =
    document.getElementById("moedasJogo");

const tempoElemento =
    document.getElementById("tempo");

const comboElemento =
    document.getElementById("combo");

const tituloJogo =
    document.getElementById("tituloJogo");

const mensagemJogo =
    document.getElementById("mensagemJogo");

const resultado =
    document.getElementById("resultado");

const resultadoMoedas =
    document.getElementById("resultadoMoedas");


// =====================================================
// VARIÁVEIS
// =====================================================

let moedas = 0;
let tempo = TEMPO_TOTAL;
let combo = 0;

let jogoAtivo = false;

let intervalo = null;

// Horário real (timestamp) em que o tempo acaba.
// Usamos isso em vez de simplesmente contar "ticks" do
// setInterval, porque o setInterval pode atrasar se o
// navegador estiver ocupado processando muitos cliques
// seguidos. Baseando no horário real, o jogo sempre
// termina na hora certa, mesmo que algum tick atrase.
let tempoFimReal = 0;


// =====================================================
// FILA DE SALVAMENTO
// =====================================================
//
// As recompensas são salvas uma por uma.
// O jogador NÃO precisa esperar.
// =====================================================

let filaSalvamento = Promise.resolve();


// =====================================================
// LIMITE DE CLIQUES
// =====================================================
//
// Cliques em excesso (spam/macro) fazem o navegador
// despachar uma quantidade enorme de eventos de clique
// em pouco tempo, e isso pode travar a página inteira,
// mesmo que o código dentro do clique seja leve.
//
// A forma mais eficaz de evitar isso é DESABILITAR o
// botão por uma fração de segundo depois de cada clique
// aceito. Um botão desabilitado nem recebe o evento de
// clique do navegador — diferente de só "ignorar" o
// clique dentro da função, que ainda deixa o navegador
// processar cada evento.
// =====================================================

const INTERVALO_MINIMO_CLIQUE = 80; // em milissegundos


// =====================================================
// ESTADO INICIAL
// =====================================================

botaoMoeda.disabled = true;

botaoIniciar.style.display = "block";

resultado.classList.remove("mostrar");

moedasJogo.textContent = "0";

tempoElemento.textContent =
    TEMPO_TOTAL;

comboElemento.textContent =
    "0";


// =====================================================
// PEGAR ALUNO
// =====================================================

async function pegarAluno() {

    try {

        const {
            data,
            error
        } = await supabase.auth.getSession();


        if (error) {

            console.error(
                "ERRO NA SESSÃO:",
                error
            );

            return null;
        }


        const sessao =
            data?.session;


        if (!sessao) {

            window.location.href =
                "../aluno.html";

            return null;
        }


        const {
            data: aluno,
            error: erroAluno
        } = await supabase
            .from("alunos")
            .select("id, moedas")
            .eq("email", sessao.user.email)
            .maybeSingle();


        if (erroAluno) {

            console.error(
                "ERRO AO BUSCAR ALUNO:",
                erroAluno
            );

            return null;
        }


        if (!aluno) {

            console.error(
                "ALUNO NÃO ENCONTRADO"
            );

            return null;
        }


        return aluno;

    } catch (erro) {

        console.error(
            "ERRO GERAL:",
            erro
        );

        return null;
    }
}


// =====================================================
// COMEÇAR JOGO
// =====================================================

function iniciarJogo() {

    // Nunca iniciar duas partidas ao mesmo tempo

    if (jogoAtivo) {
        return;
    }


    // Parar contador anterior

    clearInterval(intervalo);


    // Reset

    moedas = 0;

    tempo = TEMPO_TOTAL;

    combo = 0;

    jogoAtivo = true;

    // Guarda o horário real em que o tempo deve zerar
    tempoFimReal =
        Date.now() + (TEMPO_TOTAL * 1000);


    // Tela

    moedasJogo.textContent =
        "0";

    tempoElemento.textContent =
        TEMPO_TOTAL;

    comboElemento.textContent =
        "0";


    tituloJogo.textContent =
        "VALENDO! 🔥";


    mensagemJogo.textContent =
        "Clique na moeda!";


    resultado.classList.remove(
        "mostrar"
    );


    // Botões

    botaoIniciar.style.display =
        "none";

    botaoMoeda.disabled =
        false;


    // =================================================
    // CONTADOR
    // =================================================

    intervalo =
        setInterval(() => {

            if (!jogoAtivo) {
                return;
            }


            // Calcula quanto tempo REALMENTE falta,
            // baseado no relógio do computador, e não
            // em quantos "ticks" já passaram.

            const restante =
                Math.max(
                    0,
                    Math.ceil(
                        (tempoFimReal - Date.now()) / 1000
                    )
                );


            if (restante !== tempo) {

                tempo = restante;

                tempoElemento.textContent =
                    tempo;
            }


            if (restante <= 0) {

                clearInterval(intervalo);

                finalizarJogo();
            }

        }, 200);
}


// =====================================================
// CLICAR NA MOEDA
// =====================================================

function clicarMoeda() {

    if (!jogoAtivo) {
        return;
    }


    moedas +=
        MOEDA_POR_CLIQUE;


    combo++;


    moedasJogo.textContent =
        moedas;


    comboElemento.textContent =
        combo;


    // Mensagens

    if (combo >= 50) {

        mensagemJogo.textContent =
            "🔥 COMBO INSANO!";

    } else if (combo >= 30) {

        mensagemJogo.textContent =
            "⚡ COMBO ABSURDO!";

    } else if (combo >= 15) {

        mensagemJogo.textContent =
            "🔥 COMBO!";

    } else {

        mensagemJogo.textContent =
            "Continue clicando!";
    }


    // Bloqueia novos cliques por um instante, pra não
    // deixar o navegador despachar uma enxurrada de
    // eventos de clique e travar a página.

    botaoMoeda.disabled = true;

    setTimeout(() => {

        if (jogoAtivo) {

            botaoMoeda.disabled = false;
        }

    }, INTERVALO_MINIMO_CLIQUE);
}


// =====================================================
// FINALIZAR JOGO
// =====================================================

function finalizarJogo() {

    if (!jogoAtivo) {
        return;
    }


    jogoAtivo = false;


    clearInterval(intervalo);


    botaoMoeda.disabled =
        true;


    // Mostrar resultado

    tituloJogo.textContent =
        "FIM DE JOGO! 🏆";


    mensagemJogo.textContent =
        "🎉 Recompensa recebida!";


    resultadoMoedas.textContent =
        moedas;


    resultado.classList.add(
        "mostrar"
    );


    // =================================================
    // MUITO IMPORTANTE
    // =================================================
    //
    // O botão fica livre IMEDIATAMENTE.
    //
    // O Supabase salva em segundo plano.
    // =================================================

    botaoJogarNovamente.disabled =
        false;


    // Guardar quantidade desta partida

    const recompensa =
        moedas;


    // Salvar sem bloquear o próximo jogo

    colocarNaFilaDeSalvamento(
        recompensa
    );
}


// =====================================================
// FILA DE SALVAMENTO
// =====================================================

function colocarNaFilaDeSalvamento(
    quantidade
) {

    if (quantidade <= 0) {
        return;
    }


    filaSalvamento =
        filaSalvamento.then(
            async () => {

                await salvarRecompensa(
                    quantidade
                );

            }
        ).catch((erro) => {

            console.error(
                "ERRO NA FILA:",
                erro
            );

        });
}


// =====================================================
// SALVAR RECOMPENSA
// =====================================================

async function salvarRecompensa(
    quantidade
) {

    console.log(
        "SALVANDO RECOMPENSA:",
        quantidade
    );


    const aluno =
        await pegarAluno();


    if (!aluno) {

        console.error(
            "Não foi possível encontrar o aluno."
        );

        return;
    }


    const saldoAtual =
        Number(
            aluno.moedas || 0
        );


    const novoSaldo =
        saldoAtual + quantidade;


    console.log(
        "SALDO ANTERIOR:",
        saldoAtual
    );


    console.log(
        "MOEDAS GANHAS:",
        quantidade
    );


    console.log(
        "NOVO SALDO:",
        novoSaldo
    );


    // =================================================
    // SALVAR NO SUPABASE
    // =================================================

    const {
        error
    } = await supabase
        .from("alunos")
        .update({
            moedas: novoSaldo
        })
        .eq("id", aluno.id);


    if (error) {

        console.error(
            "ERRO AO SALVAR MOEDAS:",
            error
        );

        return;
    }


    // =================================================
    // ATUALIZAR LOCALSTORAGE
    // =================================================

    const alunoLocal =
        JSON.parse(
            localStorage.getItem(
                "alunoLogado"
            ) || "{}"
        );


    alunoLocal.moedas =
        novoSaldo;


    localStorage.setItem(
        "alunoLogado",
        JSON.stringify(
            alunoLocal
        )
    );


    console.log(
        "✅ RECOMPENSA SALVA:",
        novoSaldo
    );
}





// =====================================================
// EVENTOS
// =====================================================

if (botaoIniciar) {

    botaoIniciar.addEventListener(
        "click",
        iniciarJogo
    );
}


if (botaoMoeda) {

    botaoMoeda.addEventListener(
        "click",
        clicarMoeda
    );
}


window.jogarNovamente = function () {

    console.log("🔄 JOGAR NOVAMENTE");

    clearInterval(intervalo);

    jogoAtivo = false;

    moedas = 0;
    tempo = TEMPO_TOTAL;
    combo = 0;

    resultado.classList.remove("mostrar");

    moedasJogo.textContent = "0";
    tempoElemento.textContent = TEMPO_TOTAL;
    comboElemento.textContent = "0";

    tituloJogo.textContent = "VALENDO! 🔥";
    mensagemJogo.textContent = "Clique na moeda!";

    botaoMoeda.disabled = false;

    iniciarJogo();
};
// =====================================================
// NOVA PARTIDA AUTOMÁTICA
// =====================================================

const parametros =
    new URLSearchParams(window.location.search);

const novaPartida =
    parametros.get("novaPartida");


if (novaPartida === "1") {

    // Tirar o parâmetro da URL
    // para não ficar reiniciando sozinho

    window.history.replaceState(
        {},
        document.title,
        "index.html"
    );


    // Esperar a página carregar

    setTimeout(() => {

        iniciarJogo();

    }, 100);

}