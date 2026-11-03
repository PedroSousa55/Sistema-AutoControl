import { usuarioApi, dashboardApi, veiculoApi } from "./api.js";

const btnSair = document.getElementById("sair_button");

const btnAbrirCadastroVeiculo = document.getElementById(
  "abrir_cadastro_veiculo",
);

// Abre o modal de cadastro de veículo
btnAbrirCadastroVeiculo.addEventListener("click", (e) => {
  e.preventDefault();
  abrirFormularioVeiculo();
});

// Elementos do modal
const modal = document.getElementById("modal");
const modalConteudo = document.getElementById("modal-conteudo");

const TELAS = [
  { menu: "inicio_menu", tela: "dashboard", restrita: false },
  { menu: "veiculo_menu", tela: "veiculo_main", restrita: true },
  { menu: "entrada_menu", tela: "entrada_main", restrita: false },
  { menu: "saida_menu", tela: "saida_main", restrita: false },
  { menu: "relatorios_menu", tela: "relatorios_main", restrita: true },
  { menu: "config_menu", tela: "config_main", restrita: true },
];

// Abre o modal com o conteúdo informado
function abrirModal(conteudo) {
  modalConteudo.innerHTML = conteudo;
  modal.hidden = false;
}

// Fecha o modal e limpa seu conteúdo
function fecharModal() {
  modal.hidden = true;
  modalConteudo.innerHTML = "";
}

// Abre o formulário de cadastro de veículo
function abrirFormularioVeiculo() {
  const formulario = `
  <h2>Cadastrar Veículo</h2>

  <form id="form_cadastro_veiculo">
    <label for="placa_veiculo">Placa</label>
    <input
      type="text"
      id="placa_veiculo"
      placeholder="ABC1D23"
      maxlength="7"
      required
    />

    <label for="tipo_veiculo">Tipo de veículo</label>
    <select id="tipo_veiculo" required>
      <option value="">Selecione</option>
      <option value="CARRO">Carro</option>
      <option value="MOTO">Moto</option>
    </select>

    <div class="modal-botoes">
      <button type="submit">Cadastrar</button>
      <button type="button" id="cancelar_modal">Cancelar</button>
    </div>
  </form>
`;

  abrirModal(formulario);

  document
    .getElementById("cancelar_modal")
    .addEventListener("click", fecharModal);

  document
    .getElementById("form_cadastro_veiculo")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const placa = document
        .getElementById("placa_veiculo")
        .value.trim()
        .toUpperCase();

      const tipo = document.getElementById("tipo_veiculo").value;
      const btnCadastrar = e.target.querySelector('button[type="submit"]');

      try {
        btnCadastrar.disabled = true;
        btnCadastrar.textContent = "Cadastrando...";

        const resposta = await veiculoApi.registerVeiculo({
          placa,
          tipo,
        });

        alert(resposta.message);
        fecharModal();
      } catch (error) {
        console.error("Erro ao cadastrar veículo:", error);
        alert(error.message || "Não foi possível cadastrar o veículo.");
      } finally {
        if (document.getElementById("form_cadastro_veiculo")) {
          btnCadastrar.disabled = false;
          btnCadastrar.textContent = "Cadastrar";
        }
      }
    });
}

function sairDashboard() {
  localStorage.removeItem("token");
  window.location.href = "../../login.html";
}

btnSair.addEventListener("click", (e) => {
  e.preventDefault();
  sairDashboard();
});

// Verifica se o usuário está autenticado
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

// Carrega os dados do dashboard
async function carregarResumo() {
  try {
    const resumo = await dashboardApi.resumo();

    document.getElementById("Totalcarros").textContent = resumo.dentro;

    document.getElementById("EntradasVeiculos").textContent =
      resumo.entradas_hoje;

    document.getElementById("SaidasVeiculos").textContent = resumo.saidas_hoje;

    document.getElementById("Vagasdisponivel").textContent =
      resumo.vagas_disponiveis;
  } catch (error) {
    console.error("Erro ao carregar dashboard:", error);
    alert("Não foi possível carregar os dados do dashboard.");
  }
}

// Carrega a lista de veículos cadastrados
async function carregarVeiculos() {
  const lista = document.getElementById("lista_veiculos");
  const mensagemVazia = document.getElementById("veiculos_vazio");

  try {
    const veiculos = await veiculoApi.listVeiculos();

    lista.innerHTML = "";

    mensagemVazia.style.display = veiculos.length === 0 ? "block" : "none";

    veiculos.forEach((veiculo) => {
      const linha = document.createElement("tr");

      linha.innerHTML = `
        <td>${veiculo.placa}</td>
        <td>${veiculo.tipo}</td>
        <td>
          <button type="button">Editar</button>
          <button type="button">Excluir</button>
        </td>
      `;

      lista.appendChild(linha);
    });
  } catch (error) {
    console.error("Erro ao carregar veículos:", error);
    alert("Não foi possível carregar os veículos.");
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

// Inicialização
const user = await protegePagina();

if (user) {
  configPermissao(user.tipo);
  carregarResumo();
}
