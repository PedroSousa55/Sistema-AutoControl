import { inicializarRelatorios } from "../relatorio/relatorio.js";

import {
  carregarGraficoMovimento,
  carregarGraficoPizza,
} from "../dashboard/graficos.js";

import {
  usuarioApi,
  dashboardApi,
  veiculoApi,
  movimentacaoApi,
} from "./api.js";

const btnSair = document.getElementById("sair_button");

let usuarioLogado = null;

const saudacao = document.getElementById("admin-header");
const textoSaudacao = document.getElementById("user_h1");

const nomePerfil = document.querySelector(".profile-info strong");
const tipoPerfil = document.querySelector(".profile-info span");

let saudacaoAtiva = false;
let temporizadorSaudacao = null;

// Retorna somente o primeiro e o segundo nome
function formatarNome(nome) {
  return nome.trim().split(/\s+/).slice(0, 2).join(" ");
}

// Preenche as informações do usuário
function carregarPerfilUsuario(user) {
  const nome = formatarNome(user.nome);

  textoSaudacao.textContent = `Olá, ${nome}!`;

  nomePerfil.textContent = nome;

  tipoPerfil.textContent = user.tipo === "ADM" ? "Administrador" : "Vigia";
}

function exibirSaudacao() {
  const mostrar = sessionStorage.getItem("autocontrol_boas_vindas_pendente");

  if (mostrar !== "true") {
    saudacaoAtiva = false;
    saudacao.style.display = "none";
    return;
  }

  sessionStorage.removeItem("autocontrol_boas_vindas_pendente");

  saudacaoAtiva = true;
  saudacao.style.display = "block";

  setTimeout(() => {
    saudacaoAtiva = false;
    saudacao.style.display = "none";
  }, 10000);
}

const btnAbrirCadastroVeiculo = document.getElementById(
  "abrir_cadastro_veiculo",
);

// Botão para abrir o cadastro de saída
const btnAbrirCadastroSaida = document.getElementById("abrir_cadastro_saida");

btnAbrirCadastroSaida.addEventListener("click", (e) => {
  e.preventDefault();
  abrirFormularioSaida();
});

// Abre o modal de cadastro de veículo
btnAbrirCadastroVeiculo.addEventListener("click", (e) => {
  e.preventDefault();
  abrirFormularioVeiculo();
});

// Abre o modal de cadastro de entrada
document
  .getElementById("abrir_cadastro_entrada")
  .addEventListener("click", (e) => {
    e.preventDefault();
    abrirFormularioEntrada();
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

// Área global das notificações
const areaNotificacoes = document.getElementById("notificacoes");

// Exibe uma notificação de sucesso, erro ou aviso
function mostrarNotificacao(mensagem, tipo = "sucesso", titulo = "Sucesso") {
  const notificacao = document.createElement("div");
  notificacao.className = `notificacao notificacao-${tipo}`;

  const conteudo = document.createElement("div");
  conteudo.className = "notificacao-conteudo";

  const tituloElemento = document.createElement("h3");
  tituloElemento.className = "notificacao-titulo";
  tituloElemento.textContent = titulo;

  const mensagemElemento = document.createElement("p");
  mensagemElemento.className = "notificacao-mensagem";
  mensagemElemento.textContent = mensagem;

  const btnFechar = document.createElement("button");
  btnFechar.type = "button";
  btnFechar.className = "notificacao-fechar";
  btnFechar.textContent = "×";
  btnFechar.setAttribute("aria-label", "Fechar notificação");

  conteudo.append(tituloElemento, mensagemElemento);
  notificacao.append(conteudo, btnFechar);
  areaNotificacoes.appendChild(notificacao);

  const remover = () => notificacao.remove();

  btnFechar.addEventListener("click", remover);

  // Notificações comuns desaparecem após 4 segundos
  setTimeout(remover, 4000);
}

// Exibe uma confirmação discreta no canto da tela
function confirmarAcao({
  titulo,
  mensagem,
  textoConfirmar = "Excluir",
  aoConfirmar,
}) {
  const notificacao = document.createElement("div");
  notificacao.className = "notificacao notificacao-confirmacao";

  const conteudo = document.createElement("div");
  conteudo.className = "notificacao-conteudo";

  const tituloElemento = document.createElement("h3");
  tituloElemento.className = "notificacao-titulo";
  tituloElemento.textContent = titulo;

  const mensagemElemento = document.createElement("p");
  mensagemElemento.className = "notificacao-mensagem";
  mensagemElemento.textContent = mensagem;

  const acoes = document.createElement("div");
  acoes.className = "notificacao-acoes";

  const btnCancelar = document.createElement("button");
  btnCancelar.type = "button";
  btnCancelar.className = "notificacao-cancelar";
  btnCancelar.textContent = "Cancelar";

  const btnConfirmar = document.createElement("button");
  btnConfirmar.type = "button";
  btnConfirmar.className = "notificacao-confirmar";
  btnConfirmar.textContent = textoConfirmar;

  acoes.append(btnCancelar, btnConfirmar);
  conteudo.append(tituloElemento, mensagemElemento, acoes);
  notificacao.appendChild(conteudo);

  areaNotificacoes.appendChild(notificacao);

  btnCancelar.addEventListener("click", () => {
    notificacao.remove();
  });

  btnConfirmar.addEventListener("click", async () => {
    try {
      btnConfirmar.disabled = true;
      btnCancelar.disabled = true;
      btnConfirmar.textContent = "Aguarde...";

      await aoConfirmar();

      notificacao.remove();
    } catch (error) {
      // A função responsável pela ação pode tratar o erro.
      btnConfirmar.disabled = false;
      btnCancelar.disabled = false;
      btnConfirmar.textContent = textoConfirmar;
    }
  });
}

// Abre o formulário de cadastro de entrada
function abrirFormularioEntrada() {
  const formulario = `
    <h2>Cadastrar Entrada</h2>

    <form id="form_cadastro_entrada">
      <label for="placa_entrada">Placa do veículo</label>
      <input
        type="text"
        id="placa_entrada"
        placeholder="ABC1D23"
        maxlength="7"
        required
      />

      <label for="tipo_entrada">Tipo de veículo</label>
      <select id="tipo_entrada" required>
        <option value="">Selecione</option>
        <option value="CARRO">Carro</option>
        <option value="MOTO">Moto</option>
      </select>

      <div class="modal-botoes">
        <button type="submit">Registrar entrada</button>
        <button type="button" id="cancelar_entrada">
          Cancelar
        </button>
      </div>
    </form>
  `;

  abrirModal(formulario);

  document
    .getElementById("cancelar_entrada")
    .addEventListener("click", fecharModal);

  document
    .getElementById("form_cadastro_entrada")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const placa = document
        .getElementById("placa_entrada")
        .value.trim()
        .toUpperCase();

      const tipo = document.getElementById("tipo_entrada").value;

      const btnRegistrar = e.target.querySelector('button[type="submit"]');

      try {
        btnRegistrar.disabled = true;
        btnRegistrar.textContent = "Registrando...";

        const resposta = await movimentacaoApi.registerEntrada({
          placa,
          tipo,
        });

        mostrarNotificacao(resposta.message, "sucesso", "Entrada registrada");
        fecharModal();

        await carregarResumo();
        await carregarEntradas();
      } catch (error) {
        console.error("Erro ao registrar entrada:", error);

        mostrarNotificacao(
          error.message || "Não foi possível registrar a entrada.",
          "erro",
          "Erro ao registrar entrada",
        );
      } finally {
        if (document.getElementById("form_cadastro_entrada")) {
          btnRegistrar.disabled = false;
          btnRegistrar.textContent = "Registrar entrada";
        }
      }
    });
}

function abrirFormularioEdicao(veiculo) {
  abrirModal(`
    <h2>Editar veículo</h2>

    <form id="form-editar-veiculo">
      <label for="placa-editar">Placa</label>
      <input
        type="text"
        id="placa-editar"
        value="${veiculo.placa}"
        maxlength="7"
        required
      >

      <label for="tipo-editar">Tipo</label>
      <select id="tipo-editar" required>
        <option value="CARRO" ${veiculo.tipo === "CARRO" ? "selected" : ""}>
          Carro
        </option>

        <option value="MOTO" ${veiculo.tipo === "MOTO" ? "selected" : ""}>
          Moto
        </option>
      </select>

      <div class="modal-botoes">
        <button type="button" id="cancelar-edicao">Cancelar</button>
        <button type="submit">Salvar alterações</button>
      </div>
    </form>
  `);

  document
    .getElementById("cancelar-edicao")
    .addEventListener("click", fecharModal);

  document
    .getElementById("form-editar-veiculo")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const placa = document
        .getElementById("placa-editar")
        .value.trim()
        .toUpperCase();

      const tipo = document.getElementById("tipo-editar").value;

      const btnSalvar = e.target.querySelector('button[type="submit"]');

      try {
        btnSalvar.disabled = true;
        btnSalvar.textContent = "Salvando...";

        const resposta = await veiculoApi.editVeiculo(veiculo.id, {
          placa,
          tipo,
        });

        mostrarNotificacao(
          resposta.message,
          "sucesso",
          "Veiculo Atualizado com sucesso!",
        );
        fecharModal();
        await carregarVeiculos();
      } catch (error) {
        console.error("Erro ao editar veículo:", error);

        mostrarNotificacao(
          error.message || "Não foi possível atualizar registro de veículo.",
          "erro",
          "Erro ao editar veículo",
        );
      } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = "Salvar alterações";
      }
    });
}

function abrirConfirmacaoExclusao(veiculo) {
  confirmarAcao({
    titulo: "Excluir veículo",
    mensagem: `Deseja realmente excluir o veículo ${veiculo.placa}?`,
    textoConfirmar: "Excluir",

    aoConfirmar: async () => {
      try {
        const resposta = await veiculoApi.deleteVeiculo(veiculo.id);

        mostrarNotificacao(resposta.message, "sucesso", "Veículo excluído");

        await carregarVeiculos();
      } catch (error) {
        mostrarNotificacao(
          error.message || "Não foi possível excluir o veículo.",
          "erro",
          "Erro ao excluir",
        );

        throw error;
      }
    },
  });
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

        mostrarNotificacao(
          resposta.message || "Veículo cadastrado com sucesso!",
          "sucesso",
          "Cadastro concluído",
        );
        fecharModal();

        await carregarVeiculos();
      } catch (error) {
        console.error("Erro ao cadastrar veículo:", error);
        mostrarNotificacao(
          error.message || "Não foi possível registrar o veículo.",
          "erro",
          "Erro ao cadastrar veículo",
        );
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
      mostrarNotificacao(
        "Não foi possível conectar ao servidor.",
        "erro",
        "Erro de conexão",
      );
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

    // Atualiza os gráficos do dashboard
    carregarGraficoMovimento(resumo);
    carregarGraficoPizza(resumo);
    await carregarHistoricos();
  } catch (error) {
    console.error("Erro ao carregar dashboard:", error);
    mostrarNotificacao(
      "Não foi possível carregar os dados do dashboard.",
      "erro",
      "Erro ao carregar dashboard",
    );
  }
}

// Carrega os últimos registros de entrada e saída no dashboard
async function carregarHistoricos() {
  const listaEntradas = document.getElementById("ultimas_entradas");
  const listaSaidas = document.getElementById("ultimas_saidas");

  try {
    const [entradas, saidas] = await Promise.all([
      movimentacaoApi.listMovimentacoes(),
      movimentacaoApi.listSaidas(),
    ]);

    // Limita a exibição aos cinco registros mais recentes
    renderizarHistorico(
      listaEntradas,
      entradas.slice(0, 5),
      "data_entrada",
      "entrada-tipo",
    );

    renderizarHistorico(
      listaSaidas,
      saidas.slice(0, 5),
      "data_saida",
      "saida-tipo",
    );
  } catch (error) {
    console.error("Erro ao carregar históricos:", error);
  }
}

// Renderiza os registros dentro do histórico
function renderizarHistorico(container, registros, campoData, classeTipo) {
  container.innerHTML = "";

  if (registros.length === 0) {
    const mensagem = document.createElement("div");
    mensagem.className = "historico-linha";
    mensagem.textContent = "Nenhum registro encontrado.";

    container.appendChild(mensagem);
    return;
  }

  registros.forEach((registro) => {
    const linha = document.createElement("div");
    linha.className = "historico-linha";

    const data = new Date(registro[campoData].replace(" ", "T"));

    const horario = document.createElement("span");
    horario.className = "historico-horario";
    horario.textContent = data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const placa = document.createElement("span");
    placa.textContent = registro.placa;

    const tipoContainer = document.createElement("span");

    const tipo = document.createElement("span");
    tipo.className = `tipo-veiculo ${classeTipo}`;
    tipo.textContent = registro.tipo;

    tipoContainer.appendChild(tipo);

    linha.append(horario, placa, tipoContainer);
    container.appendChild(linha);
  });
}

// Carrega a lista de entradas
async function carregarEntradas() {
  const lista = document.getElementById("lista_entradas");

  try {
    const movimentacoes = await movimentacaoApi.listMovimentacoes();

    lista.innerHTML = "";

    movimentacoes.forEach((movimentacao) => {
      const linha = document.createElement("tr");

      const data = new Date(movimentacao.data_entrada.replace(" ", "T"));

      const dataFormatada = data.toLocaleDateString("pt-BR");

      const horaFormatada = data.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const status = movimentacao.data_saida ? "Fora" : "Dentro";

      linha.innerHTML = `
        <td>${dataFormatada}</td>
        <td>${horaFormatada}</td>
        <td>${movimentacao.placa}</td>
        <td>${movimentacao.tipo}</td>
        <td>${movimentacao.responsavel || "Não informado"}</td>
        <td>
          <span class="status-movimentacao status-${status.toLowerCase()}">
            ${status}
          </span>
        </td>
      `;

      const colunaEditar = document.createElement("td");
      const colunaExcluir = document.createElement("td");

      const acoes = criarAcoesMovimentacao(movimentacao);

      const btnEditar = acoes.querySelector(".botao-editar");
      const btnExcluir = acoes.querySelector(".botao-excluir");

      if (btnEditar) {
        colunaEditar.appendChild(btnEditar);
      }

      if (btnExcluir) {
        colunaExcluir.appendChild(btnExcluir);
      }

      linha.appendChild(colunaEditar);
      linha.appendChild(colunaExcluir);

      lista.appendChild(linha);
    });

    const rodape = document.querySelector(".entrada-rodape span");

    rodape.textContent =
      movimentacoes.length === 0
        ? "Nenhuma entrada encontrada."
        : `${movimentacoes.length} entrada(s) encontrada(s).`;
  } catch (error) {
    console.error("Erro ao carregar entradas:", error);
    mostrarNotificacao(
      "Não foi possível carregar as entradas.",
      "erro",
      "Erro ao carregar entradas",
    );
  }
}

// Converte a data do MySQL para o formato aceito pelo input datetime-local
function formatarDataInput(data) {
  if (!data) return "";

  return data.replace(" ", "T").slice(0, 16);
}

// Verifica se o usuário pode editar a movimentação
function podeEditarMovimentacao(movimentacao) {
  if (usuarioLogado?.tipo === "ADM") {
    return true;
  }

  return (
    usuarioLogado?.tipo === "VIGIA" &&
    movimentacao.origem_entrada === "MANUAL" &&
    Number(movimentacao.usuario_entrada_id) === Number(usuarioLogado.id)
  );
}

// Abre o formulário de edição da movimentação
function abrirFormularioEdicaoMovimentacao(movimentacao) {
  const adm = usuarioLogado?.tipo === "ADM";

  const camposData = adm
    ? `
      <label for="editar_data_entrada">Data e hora da entrada</label>
      <input
        type="datetime-local"
        id="editar_data_entrada"
        value="${formatarDataInput(movimentacao.data_entrada)}"
        required
      >

      <label for="editar_data_saida">Data e hora da saída</label>
      <input
        type="datetime-local"
        id="editar_data_saida"
        value="${formatarDataInput(movimentacao.data_saida)}"
      >

      <small>Deixe a saída vazia para reabrir a movimentação.</small>
    `
    : "";

  abrirModal(`
    <h2>Editar movimentação</h2>

    <form id="form_editar_movimentacao">
      <label for="editar_placa">Placa</label>
      <input
        type="text"
        id="editar_placa"
        value="${movimentacao.placa}"
        maxlength="7"
        required
      >

      <label for="editar_tipo">Tipo de veículo</label>
      <select id="editar_tipo" required>
        <option value="CARRO" ${movimentacao.tipo === "CARRO" ? "selected" : ""}>
          Carro
        </option>
        <option value="MOTO" ${movimentacao.tipo === "MOTO" ? "selected" : ""}>
          Moto
        </option>
      </select>

      ${camposData}

      <div class="modal-botoes">
        <button type="button" id="cancelar_edicao_movimentacao">
          Cancelar
        </button>

        <button type="submit">Salvar alterações</button>
      </div>
    </form>
  `);

  document
    .getElementById("cancelar_edicao_movimentacao")
    .addEventListener("click", fecharModal);

  document
    .getElementById("form_editar_movimentacao")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const placa = document
        .getElementById("editar_placa")
        .value.trim()
        .toUpperCase();

      const tipo = document.getElementById("editar_tipo").value;

      const dados = { placa, tipo };

      // Somente ADM envia datas para o backend
      if (adm) {
        dados.data_entrada = document.getElementById(
          "editar_data_entrada",
        ).value;

        const dataSaida = document.getElementById("editar_data_saida").value;

        dados.data_saida = dataSaida || null;
      }

      const btnSalvar = e.target.querySelector('button[type="submit"]');

      try {
        btnSalvar.disabled = true;
        btnSalvar.textContent = "Salvando...";

        const resposta = await movimentacaoApi.editMovimentacao(
          movimentacao.id,
          dados,
        );

        mostrarNotificacao(
          resposta.message || "Movimentação atualizada com sucesso!",
          "sucesso",
          "Movimentação atualizada",
        );

        fecharModal();

        await Promise.all([
          carregarEntradas(),
          carregarSaidas(),
          carregarResumo(),
        ]);
      } catch (error) {
        console.error("Erro ao editar movimentação:", error);
        mostrarNotificacao(
          error.message || "Não foi possível editar a movimentação.",
          "erro",
          "Erro ao editar movimentação",
        );
      } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = "Salvar alterações";
      }
    });
}

// Abre a confirmação de exclusão
function abrirConfirmacaoExclusaoMovimentacao(movimentacao) {
  confirmarAcao({
    titulo: "Excluir movimentação",
    mensagem: `Deseja realmente excluir a movimentação do veículo ${movimentacao.placa}? Essa ação não poderá ser desfeita.`,
    textoConfirmar: "Excluir",

    aoConfirmar: async () => {
      try {
        const resposta = await movimentacaoApi.deleteMovimentacao(
          movimentacao.id,
        );

        mostrarNotificacao(
          resposta.message,
          "sucesso",
          "Movimentação excluída",
        );

        await Promise.all([
          carregarEntradas(),
          carregarSaidas(),
          carregarResumo(),
        ]);
      } catch (error) {
        mostrarNotificacao(
          error.message || "Não foi possível excluir a movimentação.",
          "erro",
          "Erro ao excluir movimentação",
        );

        throw error;
      }
    },
  });
}

// Cria os botões de ação conforme as permissões
function criarAcoesMovimentacao(movimentacao) {
  const acoes = document.createElement("div");
  acoes.className = "acoes-veiculo";

  if (podeEditarMovimentacao(movimentacao)) {
    const btnEditar = document.createElement("button");

    btnEditar.type = "button";
    btnEditar.className = "botao-editar";
    btnEditar.textContent = "Editar";

    btnEditar.addEventListener("click", () => {
      abrirFormularioEdicaoMovimentacao(movimentacao);
    });

    acoes.appendChild(btnEditar);
  }

  if (usuarioLogado?.tipo === "ADM") {
    const btnExcluir = document.createElement("button");

    btnExcluir.type = "button";
    btnExcluir.className = "botao-excluir";
    btnExcluir.textContent = "Excluir";

    btnExcluir.addEventListener("click", () => {
      abrirConfirmacaoExclusaoMovimentacao(movimentacao);
    });

    acoes.appendChild(btnExcluir);
  }

  return acoes;
}

// Carrega a lista de saídas
async function carregarSaidas() {
  const lista = document.getElementById("lista_saidas");

  try {
    const saidas = await movimentacaoApi.listSaidas();

    lista.innerHTML = "";

    saidas.forEach((saida) => {
      const linha = document.createElement("tr");

      const data = new Date(saida.data_saida.replace(" ", "T"));

      const dataFormatada = data.toLocaleDateString("pt-BR");

      const horaFormatada = data.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      linha.innerHTML = `
        <td>${dataFormatada}</td>
        <td>${horaFormatada}</td>
        <td>${saida.placa}</td>
        <td>${saida.tipo}</td>
        <td>${saida.responsavel || "Não informado"}</td>
      `;

      const colunaEditar = document.createElement("td");
      const colunaExcluir = document.createElement("td");

      const acoes = criarAcoesMovimentacao(saida);

      const btnEditar = acoes.querySelector(".botao-editar");
      const btnExcluir = acoes.querySelector(".botao-excluir");

      if (btnEditar) {
        colunaEditar.appendChild(btnEditar);
      }
      if (btnExcluir) {
        colunaExcluir.appendChild(btnExcluir);
      }

      linha.appendChild(colunaEditar);
      linha.appendChild(colunaExcluir);
      lista.appendChild(linha);
    });

    const rodape = document.querySelector(".saida-rodape span");

    rodape.textContent =
      saidas.length === 0
        ? "Nenhuma saída encontrada."
        : `${saidas.length} saída(s) encontrada(s).`;
  } catch (error) {
    console.error("Erro ao carregar saídas:", error);
    mostrarNotificacao(
      "Não foi possível carregar as saídas.",
      "erro",
      "Erro ao carregar saídas",
    );
  }
}

// Abre o formulário para cadastrar uma saída
function abrirFormularioSaida() {
  abrirModal(`
    <h2>Cadastrar Saída</h2>

    <form id="form_cadastro_saida">
      <label for="placa_saida">Placa do veículo</label>

      <input
        type="text"
        id="placa_saida"
        placeholder="ABC1D23"
        maxlength="7"
        required
      />

      <div class="modal-botoes">
        <button type="submit">Registrar saída</button>
        <button type="button" id="cancelar_saida">Cancelar</button>
      </div>
    </form>
  `);

  document
    .getElementById("cancelar_saida")
    .addEventListener("click", fecharModal);

  document
    .getElementById("form_cadastro_saida")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const placa = document
        .getElementById("placa_saida")
        .value.trim()
        .toUpperCase();

      const btnRegistrar = e.target.querySelector('button[type="submit"]');

      try {
        btnRegistrar.disabled = true;
        btnRegistrar.textContent = "Registrando...";

        const resposta = await movimentacaoApi.registerSaida({
          placa,
        });

        mostrarNotificacao(
          resposta.message || "Saída cadastrada com sucesso!",
          "sucesso",
          "Saída registrada",
        );
        fecharModal();

        await Promise.all([
          carregarSaidas(),
          carregarEntradas(),
          carregarResumo(),
        ]);
      } catch (error) {
        console.error("Erro ao registrar saída:", error);

        mostrarNotificacao(
          error.message || "Não foi possível registrar a saída.",
          "erro",
          "Erro ao registrar saída.",
        );
      } finally {
        if (document.getElementById("form_cadastro_saida")) {
          btnRegistrar.disabled = false;
          btnRegistrar.textContent = "Registrar saída";
        }
      }
    });
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
  <td class="placa-veiculo">${veiculo.placa}</td>
  <td>${veiculo.tipo}</td>
  <td>
    <div class="acoes-veiculo">
      <button
        type="button"
        class="botao-editar"
        data-id="${veiculo.id}"
      >
        Editar
      </button>
    </div>
  </td>
    
  <td>
    <div class="acoes-veiculo">
      <button
        type="button"
        class="botao-excluir"
        data-id="${veiculo.id}"
        data-placa="${veiculo.placa}"
      >
        Excluir
      </button>
    </div>
  </td>
`;

      lista.appendChild(linha);
    });
  } catch (error) {
    console.error("Erro ao carregar veículos:", error);
    mostrarNotificacao(
      error.message || "Não foi possível carregar os veículos.",
      "erro",
      "Erro ao carregar veículo.",
    );
  }
}

document.getElementById("lista_veiculos").addEventListener("click", (e) => {
  const botaoEditar = e.target.closest(".botao-editar");
  const botaoExcluir = e.target.closest(".botao-excluir");

  if (!botaoEditar && !botaoExcluir) return;

  const linha = e.target.closest("tr");

  const veiculo = {
    id: (botaoEditar || botaoExcluir).dataset.id,
    placa: linha.children[0].textContent.trim(),
    tipo: linha.children[1].textContent.trim(),
  };

  if (botaoEditar) {
    abrirFormularioEdicao(veiculo);
  }

  if (botaoExcluir) {
    abrirConfirmacaoExclusao(veiculo);
  }
});

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

  saudacao.style.display =
    idTela === "dashboard" && saudacaoAtiva ? "block" : "none";
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

      if (idTela === "veiculo_main") {
        carregarVeiculos();
      }

      if (idTela === "entrada_main") {
        carregarEntradas();
      }

      if (idTela === "saida_main") {
        carregarSaidas();
      }
      if (idTela === "relatorios_main") {
        inicializarRelatorios();
      }
    });
  });

  // Começa sempre no dashboard
  telaSelecionada("dashboard");
}

// Inicialização
const user = await protegePagina();

if (user) {
  usuarioLogado = user;

  carregarPerfilUsuario(user);
  exibirSaudacao();

  configPermissao(user.tipo);
  carregarResumo();
}
