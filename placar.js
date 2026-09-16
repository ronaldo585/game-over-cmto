import { supabase } from "./supabase.js";

const lista = document.getElementById("lista-placar");
const status = document.getElementById("placar-status");
const botoes = document.querySelectorAll(".placar-tab");

const nomesDosJogos = {
    "cat-rush": "Cat Rush",
    "click-rush": "Click Rush",
    "lendas-do-bosque": "Lendas do Bosque"
};

function nomePublico(nome) {

    const partes = String(nome || "Jogador")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (partes.length <= 1) {
        return partes[0] || "Jogador";
    }

    return `${partes[0]} ${partes[partes.length - 1][0]}.`;
}

function medalha(posicao) {

    if (posicao === 1) return "🥇";
    if (posicao === 2) return "🥈";
    if (posicao === 3) return "🥉";

    return String(posicao);
}

function escaparHTML(texto) {

    const div = document.createElement("div");
    div.textContent = texto;

    return div.innerHTML;
}

async function carregarPlacar(jogo) {

    status.textContent = `Carregando os recordes de ${nomesDosJogos[jogo]}...`;
    lista.innerHTML = "";

    const {
        data: recordes,
        error: erroRecordes
    } = await supabase
        .from("recordes_games")
        .select("aluno_id, pontuacao")
        .eq("jogo", jogo)
        .order("pontuacao", { ascending: false })
        .limit(10);

    if (erroRecordes) {

        console.error("ERRO AO CARREGAR PLACAR:", erroRecordes);
        status.textContent = "Não foi possível carregar o placar agora.";

        return;
    }

    if (!recordes || recordes.length === 0) {

        status.textContent = `Ainda não há recordes no ${nomesDosJogos[jogo]}. Seja o primeiro a jogar!`;

        return;
    }

    const ids = [
        ...new Set(recordes.map(recorde => recorde.aluno_id))
    ];

    const {
        data: alunos,
        error: erroAlunos
    } = await supabase
        .from("alunos")
        .select("id, nome")
        .in("id", ids);

    if (erroAlunos) {
        console.error("ERRO AO CARREGAR NOMES DO PLACAR:", erroAlunos);
    }

    const nomesPorId = new Map(
        (alunos || []).map(aluno => [
            aluno.id,
            nomePublico(aluno.nome)
        ])
    );

    const maiorPontuacao = Math.max(
        ...recordes.map(recorde => Number(recorde.pontuacao || 0)),
        1
    );

    recordes.forEach((recorde, indice) => {

        const posicao = indice + 1;
        const pontuacao = Number(recorde.pontuacao || 0);
        const jogador = nomesPorId.get(recorde.aluno_id) || "Jogador da turma";
        const item = document.createElement("li");

        item.className = `linha-placar posicao-${posicao}`;
        item.innerHTML = `
            <span class="posicao-placar">${medalha(posicao)}</span>
            <span class="jogador-placar">${escaparHTML(jogador)}</span>
            <span class="pontuacao-placar"><b>${pontuacao}</b> pontos</span>
            <span class="barra-placar"><i style="width: ${(pontuacao / maiorPontuacao) * 100}%"></i></span>
        `;

        lista.appendChild(item);
    });

    status.textContent = `Top ${recordes.length} • ${nomesDosJogos[jogo]}`;
}

botoes.forEach(botao => {

    botao.addEventListener("click", () => {

        botoes.forEach(outroBotao => {
            const ativo = outroBotao === botao;
            outroBotao.classList.toggle("ativo", ativo);
            outroBotao.setAttribute("aria-selected", String(ativo));
        });

        carregarPlacar(botao.dataset.jogo);
    });
});

carregarPlacar("cat-rush");
