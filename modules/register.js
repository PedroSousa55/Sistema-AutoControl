
const formulario = document.getElementById("form_cadastro");
const mensagem = document.getElementById("mensagem");

const nome = document.getElementById("nome");
const email = document.getElementById("email");
const senha = document.getElementById("senha");
const confirmarSenha = document.getElementById("confirmar_senha");
const tipo = document.getElementById('tipo_user')

const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

document.querySelectorAll(".mostrar-senha").forEach(function (botao) {
    botao.addEventListener("click", function () {
        const campo = document.getElementById(botao.dataset.senha);

        if (campo.type === "password") {
            campo.type = "text";
            botao.textContent = "Ocultar";
        } else {
            campo.type = "password";
            botao.textContent = "Mostrar";
        }
    });
});

formulario.addEventListener("submit", function (event) {
    event.preventDefault();

    const nomeValor = nome.value.trim();
    const emailValor = email.value.trim().toLowerCase();
    const senhaValor = senha.value;
    const confirmarValor = confirmarSenha.value;
    const tipoValor =  tipo_user.value.trim().toLowerCase()

    if (senhaValor !== confirmarValor) {
        mensagem.textContent = "As senhas não coincidem.";
        mensagem.style.color = "#ff7777";
        return;
    }

    const usuarioExiste = usuarios.some(function (usuario) {
        return usuario.email === emailValor;
    });

    if (usuarioExiste) {
        mensagem.textContent = "Este e-mail já está cadastrado.";
        mensagem.style.color = "#ff7777";
        return;
    }

    usuarios.push({
        id: Date.now(),
        nome: nomeValor,
        email: emailValor,
        senha: senhaValor,
        tipo: tipoValor
    });

    localStorage.setItem("usuarios", JSON.stringify(usuarios));

    mensagem.textContent = "Cadastro realizado com sucesso!";
    mensagem.style.color = "#65d99a";

    formulario.reset();

    document.querySelectorAll(".mostrar-senha").forEach(function (botao) {
        botao.textContent = "Mostrar";
    });
});
