import { usuarioApi, dashboardApi } from "./api.js";

const btnSair = document.getElementById("sair_button");

const TELAS = [
  { menu: "inicio_menu", tela: "dashboard", restrita: false },
  { menu: "veiculo_menu", tela: "veiculo_main", restrita: true },
  { menu: "entrada_menu", tela: "entrada_main", restrita: false },
  { menu: "saida_menu", tela: "saida_main", restrita: false },
  { menu: "relatorios_menu", tela: "relatorios_main", restrita: true },
  { menu: "config_menu", tela: "config_main", restrita: true },
];

function sairDashboard() {
  localStorage.removeItem("token");
  window.location.href = "../../login.html";
}

btnSair.addEventListener("click", (e) => {
  e.preventDefault();
  sairDashboard();
});

async function protegePagina() {
  const token = localStorage.getItem("token");

  if (!token) {
    sairDashboard();
    return null;
  }

  try {
    const { user } = await usuarioApi.findUserAuthenticator();
    return user;
  } catch (error) {
    console.error(error);

    if (error instanceof TypeError) {
      alert("Não foi possível conectar ao servidor.");
      return null;
    }

    sairDashboard();
    return null;
  }
}

// Mostra somente a tela selecionada
function telaSelecionada(idTela) {
  TELAS.forEach(({ tela: id }) => {
    const elemento = document.getElementById(id);

    if (!elemento) return;

    if (id === idTela) {
      elemento.style.display = "block";
    } else {
      elemento.style.display = "none";
    }
  });

  const saudacao = document.getElementById("admin-header");

  if (saudacao) {
    if (idTela === "dashboard") {
      saudacao.style.display = "block";
    } else {
      saudacao.style.display = "none";
    }
  }
}

// Configura as permissões dos menus
function configPermissao(tipo) {
  const adm = tipo === "ADM";

  TELAS.forEach(({ menu, tela: idTela, restrita }) => {
    const botaoMenu = document.getElementById(menu);
    const elementoTela = document.getElementById(idTela);

    // Remove telas restritas para usuários que não são ADM
    if (restrita && !adm) {
      if (botaoMenu) {
        botaoMenu.remove();
      }

      if (elementoTela) {
        elementoTela.remove();
      }

      return;
    }

    if (!botaoMenu) {
      return;
    }

    botaoMenu.addEventListener("click", (e) => {
      e.preventDefault();
      telaSelecionada(idTela);
    });
  });

  // Começa sempre no dashboard
  telaSelecionada("dashboard");
}

const user = await protegePagina();

if (user) {
  configPermissao(user.tipo);
}
