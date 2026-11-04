import { usuarioApi } from "./api.js";

const form = document.getElementById("formLogin");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const mostrarSenha = document.getElementById("mostrarSenha");
const botao = document.getElementById("botao-entrar");
const textoBotao = document.getElementById("login_button");
const message = document.getElementById("mensagem");

//funcao para mostrar as  messsage
function mostrarMessage(texto, cor) {
  message.textContent = texto;
  message.style.color = cor;
}

//função para mostrar a senha
mostrarSenha.addEventListener("click", () => {
  const escondida = senhaInput.type === "password";
  if (escondida) {
    senhaInput.type = "text";
    mostrarSenha.setAttribute("aria-label", "Ocultar senha");
  } else {
    senhaInput.type = "password";
    mostrarSenha.setAttribute("aria-label", "Mostrar senha");
  }
});

//evento que executa a funcao async quando o form for enviado
form.addEventListener("submit", manipulaForm);

async function manipulaForm(e) {
  e.preventDefault();

  const email = emailInput.value;
  const senha = senhaInput.value;

  if (!email || !senha) {
    mostrarMessage("Preencha todos os campos.", "#ff7777");
    return;
  }

  botao.disabled = true;
  textoBotao.textContent = "Entrando...";
  mostrarMessage("", "");

  try {
    const resultado = await usuarioApi.loginUser({ email, senha });

    localStorage.setItem("token", resultado.token);

    sessionStorage.setItem("autocontrol_boas_vindas_pendente", "true");

    mostrarMessage("Login realizado com sucesso!", "#65d99a");
    setTimeout(() => {
      window.location.href = "/src/html/dashboard.html";
    }, 300);
  } catch (error) {
    console.error(error);

    let texto = error.message;

    if (error instanceof TypeError) {
      texto = "Não foi possível conectar ao servidor.";
    }

    mostrarMessage(texto, "#ff7777");
    botao.disabled = false;
    textoBotao.textContent = "Entrar";
  }
}
