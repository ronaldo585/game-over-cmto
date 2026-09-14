import { supabase } from "./supabase.js";


const formulario = document.getElementById("formCadastro");

if (formulario) {
    formulario.addEventListener("submit", async function (event) {
        event.preventDefault();

        const nome = document.getElementById("nome").value.trim();
        const email = document.getElementById("email").value.trim().toLowerCase();
        const senha = document.getElementById("senha").value;
        const confirmarSenha = document.getElementById("confirmar-senha").value;
        const turma = document.getElementById("turma").value;

        if (!nome || !email || !turma || !senha || !confirmarSenha) {
            alert("Preencha todos os campos.");
            return;
        }

        if (senha !== confirmarSenha) {
            alert("As senhas não são iguais.");
            return;
        }

        const dominioPermitido = "@aluno.seduc.to.gov.br";

if (
    !email.endsWith(dominioPermitido) &&
    !email.endsWith("@gmail.com")
) {
    alert("Use um e-mail escolar ou Gmail.");
    return;
}

        // Cria a conta no Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: senha
        });

        if (error) {
            alert("Erro ao criar conta: " + error.message);
            return;
        }

        // Salva os dados do aluno na tabela alunos
        const { error: erroAluno } = await supabase
    .from("alunos")
    .insert([
        {
            nome: nome,
            email: email,
            turma: turma,
            xp: 0,
            nivel: 1,
            presente: false
        }
    ]);

        if (erroAluno) {
            alert("Conta criada, mas houve erro ao salvar o aluno: " + erroAluno.message);
            return;
        }

        alert("Cadastro realizado com sucesso! 🎮");

        window.location.href = "aluno.html";
    });
}
// ================================
// LOGIN DO PROFESSOR
// ================================

const formularioProfessor = document.querySelector("#formLoginProfessor");

if (formularioProfessor) {

    formularioProfessor.addEventListener("submit", function(event) {

        event.preventDefault();

        const email = document
            .getElementById("email")
            .value
            .trim()
            .toLowerCase();

        const senha = document
            .getElementById("senha")
            .value;

        const professores =
            JSON.parse(localStorage.getItem("professores")) || [];

        const professor = professores.find(function(professor) {

            return professor.email === email &&
                   professor.senha === senha;

        });

        if (!professor) {

            alert("E-mail ou senha incorretos.");

            return;
        }

        // Guarda o professor que fez login
        localStorage.setItem(
            "professorLogado",
            JSON.stringify(professor)
        );

        // Mostra a área do professor
        mostrarAreaProfessor();

    });
}


// ================================
// MOSTRAR ÁREA DO PROFESSOR
// ================================

function mostrarAreaProfessor() {

    const area = document.getElementById("areaProfessor");

    if (!area) return;

    const professorLogado =
        JSON.parse(localStorage.getItem("professorLogado"));

    if (!professorLogado) return;

    area.innerHTML = `

        <div class="painel-professor">

            <h3>Bem-vindo, ${professorLogado.nome}! 👨‍🏫</h3>

            <a href="chamada.html" class="botao-chamada">
                ABRIR CHAMADA
            </a>

            <button
                class="botao-sair"
                onclick="sairProfessor()">
                SAIR
            </button>

        </div>

    `;
}


// ================================
// SAIR DA CONTA
// ================================

function sairProfessor() {

    localStorage.removeItem("professorLogado");

    location.reload();

}


// Verifica se já existe login
mostrarAreaProfessor();