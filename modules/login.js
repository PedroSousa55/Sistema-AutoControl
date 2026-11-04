import configurarPermissoes from "./authentic.js";

const formulario = document.getElementById("formLogin");
const mensagem = document.getElementById("mensagem");

const usuario = document.getElementById("usuario");
const senha = document.getElementById("senha");
const mostrarSenha = document.getElementById("mostrarSenha");
const lembrar = document.getElementById("lembrar");
const loginButton = document.getElementById("login_button");

mostrarSenha.addEventListener("click", function () {
    if (senha.type === "password") {
        senha.type = "text";
        mostrarSenha.setAttribute("aria-label", "Ocultar senha");
    } else {
        senha.type = "password";
        mostrarSenha.setAttribute("aria-label", "Mostrar senha");
    }
});

formulario.addEventListener("submit", function (event) {
    event.preventDefault();

    const usuarioValor = usuario.value.trim().toLowerCase();
    const senhaValor = senha.value;

    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    const usuarioEncontrado = usuarios.find(function (item) {
        return item.email === usuarioValor &&
               item.senha === senhaValor;
    });

    if (!usuarioEncontrado) {
        mensagem.textContent = "E-mail ou senha incorretos.";
        mensagem.style.color = "#ff7777";
        return;
    }

    const dadosUsuario = {
        id: usuarioEncontrado.id,
        nome: usuarioEncontrado.nome,
        email: usuarioEncontrado.email,
    };

    localStorage.setItem(
        "usuarioLogado",
        JSON.stringify(dadosUsuario)
    );

    if (lembrar.checked) {
        localStorage.setItem("lembrarUsuario", usuarioEncontrado.email);
    } else {
        localStorage.removeItem("lembrarUsuario");
    }

    mensagem.textContent = "Login realizado com sucesso!";
    mensagem.style.color = "#65d99a";

    loginButton.textContent = "Entrando...";
    configurarPermissoes()
    setTimeout(function () {
        window.location.href = "/src/html/dashboard.html";
    }, 1000);
});

const emailLembrado = localStorage.getItem("lembrarUsuario");

if (emailLembrado) {
    usuario.value = emailLembrado;
    lembrar.checked = true;
}
