import { movimentacaoApi } from "../api/api.js";

// Elementos da tela
const tabelaRelatorio = document.getElementById("relatorio_tbody");
const buscarPlaca = document.getElementById("buscar_placa");
const filtrarData = document.getElementById("filtrar_data");

// Armazena as movimentações concluídas
let movimentacoesRelatorio = [];

// Evita adicionar os eventos mais de uma vez
let eventosConfigurados = false;

// Extrai a data e o horário sem provocar alterações de fuso horário
function separarDataHora(valor) {
  if (!valor) {
    return { data: "", horario: "" };
  }

  const partes = String(valor).trim().replace("T", " ").split(" ");

  return {
    data: partes[0].slice(0, 10),
    horario: (partes[1] || "").slice(0, 8),
  };
}

// Formata a data para o padrão brasileiro
function formatarData(valor) {
  const { data } = separarDataHora(valor);

  if (!data) return "—";

  const [ano, mes, dia] = data.split("-");

  if (!ano || !mes || !dia) return "—";

  return `${dia}/${mes}/${ano}`;
}

// Formata o horário
function formatarHorario(valor) {
  const { horario } = separarDataHora(valor);

  return horario ? horario.slice(0, 5) : "—";
}

// Exibe uma mensagem dentro da tabela
function mostrarMensagem(mensagem) {
  tabelaRelatorio.innerHTML = "";

  const linha = document.createElement("tr");
  const coluna = document.createElement("td");

  coluna.colSpan = 6;
  coluna.className = "relatorio_mensagem";
  coluna.textContent = mensagem;

  linha.appendChild(coluna);
  tabelaRelatorio.appendChild(linha);
}

// Cria uma célula da tabela
function criarCelula(valor) {
  const coluna = document.createElement("td");

  coluna.textContent = valor || "—";

  return coluna;
}

// Renderiza as movimentações na tabela
function renderizarRelatorios(registros) {
  tabelaRelatorio.innerHTML = "";

  if (registros.length === 0) {
    mostrarMensagem("Nenhuma movimentação encontrada.");
    return;
  }

  registros.forEach((movimentacao) => {
    const linha = document.createElement("tr");

    linha.append(
      criarCelula(movimentacao.placa),
      criarCelula(movimentacao.tipo),
      criarCelula(formatarData(movimentacao.data_entrada)),
      criarCelula(formatarHorario(movimentacao.data_entrada)),
      criarCelula(formatarData(movimentacao.data_saida)),
      criarCelula(formatarHorario(movimentacao.data_saida)),
    );

    tabelaRelatorio.appendChild(linha);
  });
}

// Busca movimentações concluídas na API
async function carregarRelatorios() {
  mostrarMensagem("Carregando movimentações...");

  try {
    movimentacoesRelatorio = await movimentacaoApi.listSaidas();

    renderizarRelatorios(movimentacoesRelatorio);
  } catch (error) {
    console.error("Erro ao carregar relatórios:", error);

    mostrarMensagem("Não foi possível carregar as movimentações.");
  }
}

// Pesquisa somente pela placa
function filtrarPorPlaca() {
  const placa = buscarPlaca.value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  const registrosFiltrados = movimentacoesRelatorio.filter((movimentacao) => {
    const placaRegistro = String(movimentacao.placa || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

    return placaRegistro.includes(placa);
  });

  renderizarRelatorios(registrosFiltrados);
}

// Filtra somente pela data de entrada
function filtrarPorData() {
  const dataSelecionada = filtrarData.value;

  const registrosFiltrados = movimentacoesRelatorio.filter((movimentacao) => {
    const { data } = separarDataHora(movimentacao.data_entrada);

    return data === dataSelecionada;
  });

  renderizarRelatorios(registrosFiltrados);
}

// Configura os eventos dos filtros
function configurarFiltros() {
  if (eventosConfigurados) return;

  buscarPlaca.addEventListener("input", () => {
    filtrarData.value = "";
    filtrarPorPlaca();
  });

  filtrarData.addEventListener("change", () => {
    buscarPlaca.value = "";
    filtrarPorData();
  });

  eventosConfigurados = true;
}

// Inicializa a tela de relatórios
export async function inicializarRelatorios() {
  configurarFiltros();

  await carregarRelatorios();
}
