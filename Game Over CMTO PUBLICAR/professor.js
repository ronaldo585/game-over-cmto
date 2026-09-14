import { supabase } from "./supabase.js";


// =====================================================
// CADASTRO DO PROFESSOR
// =====================================================

const formCadastro =
    document.getElementById("formCadastroProfessor");

if (formCadastro) {

    formCadastro.addEventListener("submit", async (event) => {

        event.preventDefault();

        const nome =
            document.getElementById("nome").value.trim();

        const email =
            document.getElementById("email").value.trim().toLowerCase();

        const senha =
            document.getElementById("senha").value;

        const confirmarSenha =
            document.getElementById("confirmar-senha").value;


        if (!nome || !email || !senha || !confirmarSenha) {
            alert("Preencha todos os campos.");
            return;
        }


        if (senha !== confirmarSenha) {
            alert("As senhas não são iguais.");
            return;
        }


        if (senha.length < 6) {
            alert("A senha precisa ter pelo menos 6 caracteres.");
            return;
        }


        console.log("CRIANDO PROFESSOR:", email);


        // =================================================
        // CRIAR CONTA NO SUPABASE AUTH
        // =================================================

        const {
            data: cadastro,
            error: erroCadastro
        } = await supabase.auth.signUp({
            email: email,
            password: senha
        });


        if (erroCadastro) {

            console.error(
                "ERRO AO CRIAR CONTA:",
                erroCadastro
            );

            alert(
                "Erro ao criar a conta:\n\n" +
                erroCadastro.message
            );

            return;
        }


        console.log(
            "CONTA AUTH CRIADA:",
            cadastro
        );


        const usuario =
            cadastro.user;


        if (!usuario) {

            alert(
                "A conta não foi criada corretamente."
            );

            return;
        }


        // =================================================
        // SALVAR PROFESSOR NA TABELA
        // =================================================

        const {
            data: professor,
            error: erroProfessor
        } = await supabase
            .from("professores")
            .insert({
                nome: nome,
                email: email
            })
            .select()
            .single();


        if (erroProfessor) {

            console.error(
                "ERRO AO SALVAR PROFESSOR:",
                erroProfessor
            );

            alert(
                "A conta foi criada, mas houve um erro ao salvar os dados do professor:\n\n" +
                erroProfessor.message
            );

            return;
        }


        console.log(
            "PROFESSOR SALVO:",
            professor
        );


        // =================================================
        // SALVAR LOGIN LOCALMENTE
        // =================================================

        localStorage.setItem(
            "professorLogado",
            JSON.stringify(professor)
        );


        alert(
            "Professor cadastrado com sucesso! 🎉"
        );


        window.location.href =
            "professor.html";
    });
}


// =====================================================
// LOGIN DO PROFESSOR
// =====================================================

const formLogin =
    document.getElementById("formLoginProfessor");

if (formLogin) {

    formLogin.addEventListener("submit", async (event) => {

        event.preventDefault();


        const email =
            document.getElementById("email").value.trim().toLowerCase();

        const senha =
            document.getElementById("senha").value;


        if (!email || !senha) {

            alert(
                "Digite o e-mail e a senha."
            );

            return;
        }


        console.log(
            "TENTANDO LOGIN DO PROFESSOR:",
            email
        );


        // =================================================
        // LOGIN NO SUPABASE AUTH
        // =================================================

        const {
            data: login,
            error: erroLogin
        } = await supabase.auth.signInWithPassword({
            email: email,
            password: senha
        });


        if (erroLogin) {

            console.error(
                "ERRO NO LOGIN:",
                erroLogin
            );

            alert(
                "E-mail ou senha incorretos.\n\n" +
                erroLogin.message
            );

            return;
        }


        console.log(
            "LOGIN AUTH REALIZADO:",
            login
        );


        // =================================================
        // BUSCAR PROFESSOR
        // =================================================

        const {
            data: professor,
            error: erroProfessor
        } = await supabase
            .from("professores")
            .select("*")
            .eq("email", email)
            .maybeSingle();


        if (erroProfessor) {

            console.error(
                "ERRO AO BUSCAR PROFESSOR:",
                erroProfessor
            );

            alert(
                "Login realizado, mas não foi possível carregar os dados do professor."
            );

            return;
        }


        if (!professor) {

            console.error(
                "PROFESSOR NÃO ENCONTRADO NA TABELA."
            );

            alert(
                "Essa conta existe no sistema de login, mas não está cadastrada na tabela de professores."
            );

            return;
        }


        console.log(
            "PROFESSOR ENCONTRADO:",
            professor
        );


        // =================================================
        // SALVAR PROFESSOR LOGADO
        // =================================================

        localStorage.setItem(
            "professorLogado",
            JSON.stringify(professor)
        );


        // =================================================
        // MOSTRAR ÁREA DO PROFESSOR
        // =================================================

        const loginProfessor =
            document.getElementById("loginProfessor");

        const areaProfessor =
            document.getElementById("areaProfessor");

        const nomeProfessor =
            document.getElementById("nomeProfessor");


        if (loginProfessor) {
            loginProfessor.style.display = "none";
        }


        if (areaProfessor) {
            areaProfessor.style.display = "block";
        }


        if (nomeProfessor) {
            nomeProfessor.textContent =
                professor.nome;
        }


        console.log(
            "LOGIN DO PROFESSOR CONCLUÍDO!"
        );
    });
}


// =====================================================
// SAIR DA CONTA
// =====================================================

const btnSair =
    document.getElementById("btnSair");

if (btnSair) {

    btnSair.addEventListener("click", async () => {

        const confirmar =
            confirm(
                "Deseja realmente sair da conta?"
            );


        if (!confirmar) {
            return;
        }


        const { error } =
            await supabase.auth.signOut();


        if (error) {

            console.error(
                "ERRO AO SAIR:",
                error
            );

            return;
        }


        localStorage.removeItem(
            "professorLogado"
        );


        window.location.href =
            "professor.html";
    });
}


// =====================================================
// VERIFICAR PROFESSOR JÁ LOGADO
// =====================================================

async function verificarProfessorLogado() {

    const {
        data,
        error
    } = await supabase.auth.getSession();


    if (error) {

        console.error(
            "ERRO AO VERIFICAR SESSÃO:",
            error
        );

        return;
    }


    if (!data.session) {
        return;
    }


    const email =
        data.session.user.email;


    const {
        data: professor,
        error: erroProfessor
    } = await supabase
        .from("professores")
        .select("*")
        .eq("email", email)
        .maybeSingle();


    if (erroProfessor || !professor) {
        return;
    }


    localStorage.setItem(
        "professorLogado",
        JSON.stringify(professor)
    );


    const loginProfessor =
        document.getElementById("loginProfessor");

    const areaProfessor =
        document.getElementById("areaProfessor");

    const nomeProfessor =
        document.getElementById("nomeProfessor");


    if (loginProfessor) {
        loginProfessor.style.display = "none";
    }


    if (areaProfessor) {
        areaProfessor.style.display = "block";
    }


    if (nomeProfessor) {
        nomeProfessor.textContent =
            professor.nome;
    }
}


verificarProfessorLogado();