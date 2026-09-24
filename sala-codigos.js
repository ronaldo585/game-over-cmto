import { supabase } from "./supabase.js";

const formulario = document.getElementById("formCodigo");
const input = document.getElementById("codigoAcesso");
const botao = document.getElementById("botaoCodigo");
const status = document.getElementById("statusCodigo");
const jogosLiberados = document.getElementById("jogosLiberados");
const listaJogos = document.getElementById("listaJogosCodigo");

const JOGOS = {
    "arena-tiro": {
        icone: "🌲",
        titulo: "Bosque de Batalha 3D",
        descricao: "Entre na floresta em 3D, mire com o mouse, lance orbes e enfrente outros jogadores na Clareira de Batalha.",
        href: "arena-tiro-godot/index.html",
        hrefMobile: "arena-tiro/arena-tiro.html"
    },
    "mansao-eclipse": {
        icone: "🏚️",
        titulo: "Mansão Eclipse 3D",
        descricao: "Sobreviva a 100 portas, enfrente chefes na porta 50 e 100 e fuja das criaturas da mansão.",
        href: "mansao-eclipse-godot/index.html",
        hrefMobile: "mansao-eclipse/mansao-eclipse.html"
    }
};

// Código inicial da Sala de Códigos. A tabela do Supabase pode receber
// novos códigos sem que seja necessário alterar a interface.
const CODIGOS_INICIAIS = {
    "165432": { codigo: "165432", jogo: "arena-tiro", titulo: "Pacote da Aula: Bosque e Mansão" }
};

// Um código pode liberar mais de um jogo. Códigos futuros ainda podem apontar
// para apenas um jogo pela tabela codigos_arcade do Supabase.
const PACOTES_CODIGO = {
    "165432": ["arena-tiro", "mansao-eclipse"]
};

input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 6);
    status.className = "status-codigo";
    status.textContent = input.value.length === 6 ? "Código completo. Clique para liberar." : "Aguardando um código de 6 dígitos.";
});

function mostrarStatus(texto, tipo = "") {
    status.textContent = texto;
    status.className = `status-codigo ${tipo}`;
}

function linkDoJogo(jogo) {
    const userAgent = navigator.userAgent || "";
    const dispositivoMovel = window.matchMedia("(pointer: coarse)").matches;
    const chromebook = /CrOS/i.test(userAgent);
    const celularOuTablet = /Android|iPhone|iPad|iPod/i.test(userAgent);

    // Godot 3D depende de WebGL e pode não abrir nos Chromebooks da escola.
    // Nessas máquinas, a versão leve em HTML/Canvas abre direto no navegador.
    const usarVersaoLeve = chromebook || celularOuTablet || dispositivoMovel;

    return usarVersaoLeve && jogo.hrefMobile ? jogo.hrefMobile : jogo.href;
}

function liberarDesafios(registro) {
    const idsDosJogos = PACOTES_CODIGO[registro.codigo] || [registro.jogo];
    const jogos = idsDosJogos.map(id => ({ id, ...JOGOS[id] })).filter(jogo => jogo.titulo);
    if (!jogos.length) {
        mostrarStatus("Este código pertence a um desafio que ainda está chegando.", "erro");
        return;
    }

    listaJogos.innerHTML = jogos.map(jogo => `
        <article class="jogo-codigo-card">
            <span aria-hidden="true">${jogo.icone}</span>
            <p class="codigo-kicker">DESAFIO LIBERADO</p>
            <h3>${jogo.titulo}</h3>
            <p>${jogo.descricao}</p>
            <a href="${linkDoJogo(jogo)}" data-jogo="${jogo.id}">▶ JOGAR AGORA</a>
        </article>`).join("");

    listaJogos.querySelectorAll("a[data-jogo]").forEach(link => {
        link.addEventListener("click", () => {
            const jogo = JOGOS[link.dataset.jogo];
            sessionStorage.setItem("gameOverCodigoAtivo", JSON.stringify({
                codigo: registro.codigo,
                jogo: link.dataset.jogo,
                titulo: jogo.titulo,
                liberadoEm: Date.now()
            }));
        });
    });
    jogosLiberados.classList.remove("escondido");
    mostrarStatus(`Código confirmado. ${jogos.length} desafios foram liberados!`, "sucesso");
}

formulario.addEventListener("submit", async event => {
    event.preventDefault();
    const codigo = input.value.trim();
    if (!/^\d{6}$/.test(codigo)) {
        mostrarStatus("Digite exatamente 6 números.", "erro");
        input.focus();
        return;
    }

    botao.disabled = true;
    botao.textContent = "VERIFICANDO...";
    const { data, error } = await supabase
        .from("codigos_arcade")
        .select("codigo,jogo,titulo,expira_em")
        .eq("codigo", codigo)
        .eq("ativo", true)
        .maybeSingle();
    botao.disabled = false;
    botao.textContent = "⚡ LIBERAR DESAFIOS";

    if (error) {
        console.error("ERRO AO VALIDAR CÓDIGO:", error);
        const codigoInicial = CODIGOS_INICIAIS[codigo];
        if (codigoInicial) {
            liberarDesafios(codigoInicial);
            return;
        }
        mostrarStatus("Código não encontrado. Confirme os 6 dígitos com o professor.", "erro");
        return;
    }
    if (!data && CODIGOS_INICIAIS[codigo]) {
        liberarDesafios(CODIGOS_INICIAIS[codigo]);
        return;
    }
    if (!data) {
        mostrarStatus("Código não encontrado ou já encerrado. Confirme com o professor.", "erro");
        return;
    }
    if (data.expira_em && new Date(data.expira_em).getTime() < Date.now()) {
        mostrarStatus("Este código já expirou. Peça um código novo ao professor.", "erro");
        return;
    }
    liberarDesafios(data);
});
