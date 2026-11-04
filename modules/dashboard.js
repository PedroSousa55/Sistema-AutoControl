const button = document.getElementById("sair_button");
const menuItems = document.querySelectorAll(".menu a");
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.querySelector(".sidebar");
const ctxLinha = document.getElementById("Grafico_Movimento");
const modal = document.getElementById("modalVeiculo");
const formulario = document.getElementById("formVeiculo");

//  button do menu
const inicio_button = document.getElementById("inicio_menu");
const veiculo_button = document.getElementById("veiculo_menu");
const entrada_button = document.getElementById("entrada_menu");
const saida_button = document.getElementById("saida_menu");
const relatorios_button = document.getElementById("relatorios_menu");
const config_button = document.getElementById("config_menu");
// conteudos dos main's

const main_dashboard = document.getElementById("dashboard");
const main_veiculo = document.getElementById("veiculo_main");
const main_entrada = document.getElementById("entrada_main");
const main_saida = document.getElementById("saida_main");
const main_relatorios = document.getElementById("relatorios_main");
const main_config = document.getElementById("config_main");
const h1_admin = document.getElementById('h1_admin')

inicio_button.addEventListener("click", (e) => {
  e.preventDefault();
  main_dashboard.style.display = "block";
  main_veiculo.style.display = "none";
  main_entrada.style.display = "none";
  main_saida.style.display = "none";
  main_relatorios.style.display = "none";
  main_config.style.display = "none";
  h1_admin.style.display = "block"

});
veiculo_button.addEventListener("click", (e) => {
  e.preventDefault();

  main_dashboard.style.display = "none";
  main_veiculo.style.display = "block";
  main_entrada.style.display = "none";
  main_saida.style.display = "none";
  main_relatorios.style.display = "none";
  main_config.style.display = "none";
  h1_admin.style.display = "none"

});

entrada_button.addEventListener("click", (e) => {
  e.preventDefault();

  main_dashboard.style.display = "none";
  main_veiculo.style.display = "none";
  main_entrada.style.display = "block";
  main_saida.style.display = "none";
  main_relatorios.style.display = "none";
  main_config.style.display = "none";
  h1_admin.style.display = "none"

});
saida_button.addEventListener("click", (e) => {
  e.preventDefault();

  main_dashboard.style.display = "none";
  main_veiculo.style.display = "none";
  main_entrada.style.display = "none";
  main_saida.style.display = "block";
  main_relatorios.style.display = "none";
  main_config.style.display = "none";
  h1_admin.style.display = "none"

});
relatorios_button.addEventListener("click", (e) => {
  e.preventDefault();

  main_dashboard.style.display = "none";
  main_veiculo.style.display = "none";
  main_entrada.style.display = "none";
  main_saida.style.display = "none";
  main_relatorios.style.display = "block";
  main_config.style.display = "none";
  h1_admin.style.display = "none"

});

config_button.addEventListener("click", (e) => {
  e.preventDefault();

  main_dashboard.style.display = "none";
  main_veiculo.style.display = "none";
  main_entrada.style.display = "none";
  main_saida.style.display = "none";
  main_relatorios.style.display = "none";
  main_config.style.display = "block";
  h1_admin.style.display = "none"

});



const menuSalvo = localStorage.getItem("menuSelecionado");

if (menuSalvo) {
  const itemSalvo = document.querySelector(`.menu a[data-menu="${menuSalvo}"]`);

  if (itemSalvo) {
    menuItems.forEach((item) => item.classList.remove("active"));
    itemSalvo.classList.add("active");
  }
}

menuItems.forEach((item) => {
  item.addEventListener("click", () => {
    menuItems.forEach((link) => link.classList.remove("active"));
    item.classList.add("active");

    localStorage.setItem("menuSelecionado", item.dataset.menu);

    if (window.innerWidth <= 600) {
      sidebar.classList.remove("menu-open");
      document.body.classList.remove("menu-visible");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Abrir menu");
    }
  });
});

menuToggle.addEventListener("click", () => {
  const aberto = sidebar.classList.toggle("menu-open");

  document.body.classList.toggle("menu-visible", aberto);
  menuToggle.setAttribute("aria-expanded", aberto);
  menuToggle.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
});

// usar o target pra ver qual elemento foi clicado

document.addEventListener("click", (event) => {
  const clickF =
    !sidebar.contains(event.target) && !menuToggle.contains(event.target);

  if (clickF && sidebar.classList.contains("menu-open")) {
    sidebar.classList.remove("menu-open");
    document.body.classList.remove("menu-visible");

    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menu");
  }
});

let movimentacao = "entrada";

function abrirModal(tipo) {
  movimentacao = tipo;

  if (tipo === "entrada") {
    document.getElementById("tituloModal").textContent = "Adicionar entrada";
  } else {
    document.getElementById("tituloModal").textContent = "Adicionar saída";
  }

  formulario.reset();
  modal.hidden = false;
}

function fecharModal() {
  modal.hidden = true;
}

formulario.addEventListener("submit", function (event) {
  event.preventDefault();

  let horario = document.getElementById("horarioVeiculo").value;
  let placa = document.getElementById("placaVeiculo").value.toUpperCase();
  let tipo = document.getElementById("tipoVeiculo").value;

  if (horario === "" || placa === "" || tipo === "") {
    alert("Preencha todos os campos!");
    return;
  }

  let historico;

  if (movimentacao === "entrada") {
    historico = document.querySelector(
      ".historico-grid .historico-card:first-child .historico-tabela",
    );
  } else {
    historico = document.querySelector(
      ".historico-grid .historico-card:last-child .historico-tabela",
    );
  }

  let linha = document.createElement("div");
  linha.className = "historico-linha";

  let horarioTexto = document.createElement("span");
  horarioTexto.textContent = horario;

  let placaTexto = document.createElement("span");
  placaTexto.textContent = placa;

  let tipoTexto = document.createElement("span");
  tipoTexto.textContent = tipo;
  tipoTexto.className = "tipo-veiculo";

  if (movimentacao === "entrada") {
    tipoTexto.classList.add("entrada-tipo");
  } else {
    tipoTexto.classList.add("saida-tipo");
  }

  linha.appendChild(horarioTexto);
  linha.appendChild(placaTexto);
  linha.appendChild(tipoTexto);

  let cabecalho = historico.querySelector(".historico-colunas");
  cabecalho.insertAdjacentElement("afterend", linha);

  fecharModal();
});

//  fazer parte dos graficos

new Chart(ctxLinha, {
  type: "line",
  data: {
    labels: [
      "02hr",
      "04hr",
      "06hr",
      "08h",
      "10h",
      "12h",
      "14h",
      "16h",
      "18h",
      "20hr",
      "22hr",
      "24hr",
    ],
    datasets: [
      {
        label: "Entradas",
        data: [4, 6, 8, 12, 19, 15, 39, 25, 20, 30, 50, 10],
        borderColor: "#16a77b",
        backgroundColor: "#16a77b",
        tension: 0.4,
      },
      {
        label: "Saídas",
        data: [8, 20, 14, 12, 18, 22, 25, 10, 37, 23, 2, 50],
        borderColor: "#ed3861",
        backgroundColor: "#ed3861",
        tension: 0.4,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
  },
});

const ctxPizza = document.getElementById("Grafico_Pizza");

new Chart(ctxPizza, {
  type: "doughnut",
  data: {
    labels: ["Livre", "Ocup."],
    datasets: [
      {
        data: [138, 110],
        backgroundColor: ["#16a77b", "#F64468"],
        borderWidth: 0,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    straked: {
      y: {
        backgroundColor: "White",
      },
    },
  },
});

const veiculos = [
  {
    id: 1,
    placa: "ABC1D23",
    tipo: "Carro",
    status: "Dentro",
  },
  {
    id: 2,
    placa: "DEF4G56",
    tipo: "Moto",
    status: "Fora",
  },
  {
    id: 3,
    placa: "GHI7J89",
    tipo: "Carro",
    status: "Dentro",
  },
  {
    id: 4,
    placa: "JKL2M34",
    tipo: "Caminhão",
    status: "Fora",
  },
];

let proximoId = 5;

const lista = document.getElementById("lista_veiculos");
const busca = document.getElementById("buscar_veiculo");
const vazio = document.getElementById("veiculos_vazio");
const textoPaginacao = document.getElementById("texto_paginacao");

const botaoCadastrar = document.getElementById("abrir_cadastro_veiculo");

function mostrarVeiculos() {
  const pesquisa = busca.value.toUpperCase().trim();

  const encontrados = veiculos.filter(function (veiculo) {
    return veiculo.placa.includes(pesquisa);
  });

  lista.innerHTML = "";

  encontrados.forEach(function (veiculo) {
    const linha = document.createElement("tr");

    linha.innerHTML = `
            <td class="placa-veiculo">${veiculo.placa}</td>
            <td>${veiculo.tipo}</td>
            <td>
                <span class="status-veiculo ${veiculo.status === "Dentro" ? "dentro" : "fora"}">
                    ${veiculo.status}
                </span>
            </td>
            <td>
                <div class="acoes-veiculo">
                    <button class="botao-editar" type="button">Editar</button>
                    <button class="botao-excluir" type="button">Excluir</button>
                </div>
            </td>
        `;

    linha.querySelector(".botao-editar").addEventListener("click", function () {
      editarVeiculo(veiculo.id);
    });

    linha
      .querySelector(".botao-excluir")
      .addEventListener("click", function () {
        excluirVeiculo(veiculo.id);
      });

    lista.appendChild(linha);
  });

  vazio.style.display = encontrados.length === 0 ? "block" : "none";

  textoPaginacao.textContent = `Mostrando ${encontrados.length} de ${veiculos.length} veículos`;
}

function cadastrarVeiculo() {
  const placa = prompt("Digite a placa do veículo:");
  if (placa === null || placa.trim() === "") return;
  if (!verificarPlaca(placa.trim()))  return alert("A placa deve ter exatamente 7 caracteres!");
    
  const placaFormatada = placa.toUpperCase().trim();

  if (
    veiculos.some(function (veiculo) {
      return veiculo.placa === placaFormatada;
    })
  ) {
    alert("Essa placa já está cadastrada!");
    return;
  }

  const tipo = prompt("Digite o tipo: Carro, Moto ou Caminhão:");
  if (tipo === null || tipo.trim() === "") return;

  const status = prompt("Digite o status: Dentro ou Fora:");
  if (status === null) return;

  const statusFormatado = status.trim().toLowerCase();

  if (statusFormatado !== "dentro" && statusFormatado !== "fora") {
    alert("Status inválido! Digite Dentro ou Fora.");
    return;
  }

  veiculos.push({
    id: proximoId++,
    horario: new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    placa: placaFormatada,
    tipo: tipo.trim(),
    status: statusFormatado === "dentro" ? "Dentro" : "Fora",
  });

  mostrarVeiculos();
}

function editarVeiculo(id) {
  const veiculo = veiculos.find(function (item) {
    return item.id === id;
  });

  if (!veiculo) return;

  const novaPlaca = prompt("Digite a nova placa:", veiculo.placa);
  if (novaPlaca === null || novaPlaca.trim() === "") return;
  

  const placaFormatada = novaPlaca.toUpperCase().trim();

  if (
    veiculos.some(function (item) {
      return item.id !== id && item.placa === placaFormatada;
    })
  ) {
    alert("Essa placa já está cadastrada!");
    return;
  }

  const novoTipo = prompt("Digite o novo tipo:", veiculo.tipo);
  if (novoTipo === null || novoTipo.trim() === "") return;

  const novoStatus = prompt("Digite o status: Dentro ou Fora:", veiculo.status);
  if (novoStatus === null) return;

  const statusFormatado = novoStatus.trim().toLowerCase();

  if (statusFormatado !== "dentro" && statusFormatado !== "fora") {
    alert("Status inválido! Digite Dentro ou Fora.");
    return;
  }

  veiculo.placa = placaFormatada;
  veiculo.tipo = novoTipo.trim();
  veiculo.status = statusFormatado === "dentro" ? "Dentro" : "Fora";

  mostrarVeiculos();
}

function excluirVeiculo(id) {
  const indice = veiculos.findIndex(function (veiculo) {
    return veiculo.id === id;
  });

  if (indice === -1) return;

  const confirmar = confirm("Deseja excluir este veículo?");

  if (confirmar) {
    veiculos.splice(indice, 1);
    mostrarVeiculos();
  }
}

busca.addEventListener("input", mostrarVeiculos);

botaoCadastrar.addEventListener("click", function (event) {
  event.preventDefault();
  cadastrarVeiculo();
});

mostrarVeiculos();

function verificarPlaca(placa) {
  if (placa.length !== 7) {
    return false;
  }

  return true;
}
