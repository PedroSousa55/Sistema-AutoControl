
const button = document.getElementById("sair_button");
const menuItems = document.querySelectorAll(".menu a");
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.querySelector(".sidebar");

const inicio_button = document.getElementById("inicio_menu");
const veiculo_button = document.getElementById("veiculo_menu");
const entrada_button = document.getElementById("entrada_menu");
const saida_button = document.getElementById("saida_menu");
const relatorios_button = document.getElementById("relatorios_menu");
const config_button = document.getElementById("config_menu");

const main_dashboard = document.getElementById("dashboard");
const main_veiculo = document.getElementById("veiculo_main");
const main_entrada = document.getElementById("entrada_main");
const main_saida = document.getElementById("saida_main");
const main_relatorios = document.getElementById("relatorios_main");
const main_config = document.getElementById("config_main");
const h1_admin = document.getElementById("h1_admin");

function mostrarMenu(menu) {
    main_dashboard.style.display = menu === "inicio" ? "block" : "none";
    main_veiculo.style.display = menu === "veiculo" ? "block" : "none";
    main_entrada.style.display = menu === "entrada" ? "block" : "none";
    main_saida.style.display = menu === "saida" ? "block" : "none";
    main_relatorios.style.display = menu === "relatorios" ? "block" : "none";
    main_config.style.display = menu === "config" ? "block" : "none";

    h1_admin.style.display = menu === "inicio" ? "block" : "none";
}

inicio_button.addEventListener("click", function (e) {
    e.preventDefault();
    mostrarMenu("inicio");
});

veiculo_button.addEventListener("click", function (e) {
    e.preventDefault();
    mostrarMenu("veiculo");
});

entrada_button.addEventListener("click", function (e) {
    e.preventDefault();
    mostrarMenu("entrada");
});

saida_button.addEventListener("click", function (e) {
    e.preventDefault();
    mostrarMenu("saida");
});

relatorios_button.addEventListener("click", function (e) {
    e.preventDefault();
    mostrarMenu("relatorios");
});

config_button.addEventListener("click", function (e) {
    e.preventDefault();
    mostrarMenu("config");
});
button.addEventListener("click", function () {
    window.location.href = "/index.html";
});

const menuSalvo = localStorage.getItem("menuSelecionado");

if (menuSalvo) {
    const itemSalvo = document.querySelector(
        `.menu a[data-menu="${menuSalvo}"]`
    );

    if (itemSalvo) {
        menuItems.forEach(function (item) {
            item.classList.remove("active");
        });

        itemSalvo.classList.add("active");
        mostrarMenu(menuSalvo);
    }
}

menuItems.forEach(function (item) {
    item.addEventListener("click", function () {
        menuItems.forEach(function (link) {
            link.classList.remove("active");
        });

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

menuToggle.addEventListener("click", function () {
    const aberto = sidebar.classList.toggle("menu-open");

    document.body.classList.toggle("menu-visible", aberto);

    menuToggle.setAttribute("aria-expanded", aberto);
    menuToggle.setAttribute(
        "aria-label",
        aberto ? "Fechar menu" : "Abrir menu"
    );
});

document.addEventListener("click", function (event) {
    const clickFora =
        !sidebar.contains(event.target) &&
        !menuToggle.contains(event.target);

    if (clickFora && sidebar.classList.contains("menu-open")) {
        sidebar.classList.remove("menu-open");
        document.body.classList.remove("menu-visible");

        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Abrir menu");
    }
});

const modalMovimentacao = document.getElementById("modalVeiculo");
const formularioMovimentacao = document.getElementById("formVeiculo");

let movimentacao = "entrada";

function abrirModal(tipo) {
    movimentacao = tipo;

    if (tipo === "entrada") {
        document.getElementById("tituloModal").textContent =
            "Adicionar entrada";
    } else {
        document.getElementById("tituloModal").textContent =
            "Adicionar saída";
    }

    formularioMovimentacao.reset();
    modalMovimentacao.hidden = false;
}

function fecharModal() {
    modalMovimentacao.hidden = true;
}

formularioMovimentacao.addEventListener("submit", function (event) {
    event.preventDefault();

    const horario = document.getElementById("horarioVeiculo").value;
    const placa = document.getElementById("placaVeiculo").value.toUpperCase();
    const tipo = document.getElementById("tipoVeiculo").value;

    if (horario === "" || placa === "" || tipo === "") {
        alert("Preencha todos os campos!");
        return;
    }

    let historico;

    if (movimentacao === "entrada") {
        historico = document.querySelector(
            ".historico-grid .historico-card:first-child .historico-tabela"
        );
    } else {
        historico = document.querySelector(
            ".historico-grid .historico-card:last-child .historico-tabela"
        );
    }

    const linha = document.createElement("div");
    linha.className = "historico-linha";

    const horarioTexto = document.createElement("span");
    horarioTexto.textContent = horario;

    const placaTexto = document.createElement("span");
    placaTexto.textContent = placa;

    const tipoTexto = document.createElement("span");
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

    const cabecalho = historico.querySelector(".historico-colunas");
    cabecalho.insertAdjacentElement("afterend", linha);

    fecharModal();
});

const ctxLinha = document.getElementById("Grafico_Movimento");

new Chart(ctxLinha, {
    type: "line",
    data: {
        labels: [
            "02hr", "04hr", "06hr", "08h",
            "10h", "12h", "14h", "16h",
            "18h", "20hr", "22hr", "24hr"
        ],
        datasets: [
            {
                label: "Entradas",
                data: [4, 6, 8, 12, 19, 15, 39, 25, 20, 30, 50, 10],
                borderColor: "#16a77b",
                backgroundColor: "#16a77b",
                tension: 0.4
            },
            {
                label: "Saídas",
                data: [8, 20, 14, 12, 18, 22, 25, 10, 37, 23, 2, 50],
                borderColor: "#ed3861",
                backgroundColor: "#ed3861",
                tension: 0.4
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false
    }
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
                borderWidth: 0
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false
    }
});

const veiculos = [
    {
        id: 1,
        placa: "ABC1D23",
        tipo: "Carro",
        status: "Dentro"
    },
    {
        id: 2,
        placa: "DEF4G56",
        tipo: "Moto",
        status: "Fora"
    },
    {
        id: 3,
        placa: "GHI7J89",
        tipo: "Carro",
        status: "Dentro"
    },
    {
        id: 4,
        placa: "JKL2M34",
        tipo: "Caminhão",
        status: "Fora"
    }
];

let proximoId = 5;

const lista = document.getElementById("lista_veiculos");
const busca = document.getElementById("buscar_veiculo");
const vazio = document.getElementById("veiculos_vazio");
const textoPaginacao = document.getElementById("texto_paginacao");

const botaoCadastrar = document.getElementById("abrir_cadastro_veiculo");
const modal = document.getElementById("modal");
const modalConteudo = document.getElementById("modal-conteudo");

function abrirModalDinamico(conteudo) {
    modalConteudo.innerHTML = conteudo;
    modal.hidden = false;
}

function fecharModalDinamico() {
    modal.hidden = true;
    modalConteudo.innerHTML = "";
}

function verificarPlaca(placa) {
    return placa.length === 7;
}

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

        linha.querySelector(".botao-excluir").addEventListener("click", function () {
            excluirVeiculo(veiculo.id);
        });

        lista.appendChild(linha);
    });

    vazio.style.display = encontrados.length === 0 ? "block" : "none";

    textoPaginacao.textContent =
        `Mostrando ${encontrados.length} de ${veiculos.length} veículos`;
}

function cadastrarVeiculo() {
    abrirModalDinamico(`
        <h2>Cadastrar</h2>

        <form id="formCadastroVeiculo">

            <input
                type="text"
                id="novaPlaca"
                placeholder="Digite a placa"
                maxlength="7"
                required
            >

            <input
                type="text"
                id="novoTipo"
                placeholder="Digite o tipo"
                required
            >

            <input
                type="text"
                id="novoStatus"
                placeholder="Digite o status"
                required
            >

            <div class="modal-botoes">
                <button type="button" id="cancelarModal">Cancelar</button>
                <button type="submit">Salvar</button>
            </div>

        </form>
    `);

    document.getElementById("cancelarModal").addEventListener("click", fecharModalDinamico);

    document.getElementById("formCadastroVeiculo").addEventListener("submit", function (event) {
        event.preventDefault();

        const placa = document.getElementById("novaPlaca").value.toUpperCase().trim();
        const tipo = document.getElementById("novoTipo").value.trim();
        const status = document.getElementById("novoStatus").value.trim().toLowerCase();

        if (!verificarPlaca(placa)) {
            alert("A placa deve ter exatamente 7 caracteres!");
            return;
        }

        if (veiculos.some(function (veiculo) {
            return veiculo.placa === placa;
        })) {
            alert("Essa placa já está cadastrada!");
            return;
        }

        if (tipo === "") {
            alert("Digite o tipo do veículo!");
            return;
        }

        if (status !== "dentro" && status !== "fora") {
            alert("Status inválido! Digite Dentro ou Fora.");
            return;
        }

        veiculos.push({
            id: proximoId++,
            horario: new Date().toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
            }),
            placa: placa,
            tipo: tipo,
            status: status === "dentro" ? "Dentro" : "Fora"
        });

        mostrarVeiculos();
        fecharModalDinamico();
    });
}

function editarVeiculo(id) {
    const veiculo = veiculos.find(function (item) {
        return item.id === id;
    });

    if (!veiculo) return;

    abrirModalDinamico(`
        <h2>${veiculo.placa}</h2>

        <form id="formEditarVeiculo">

            <input
                type="text"
                id="novaPlaca"
                placeholder="Digite a nova placa"
                value="${veiculo.placa}"
                maxlength="7"
                required
            >

            <input
                type="text"
                id="novoTipo"
                placeholder="Digite o tipo"
                value="${veiculo.tipo}"
                required
            >

            <input
                type="text"
                id="novoStatus"
                placeholder="Digite o status"
                value="${veiculo.status}"
                required
            >

            <div class="modal-botoes">
                <button type="button" id="cancelarModal">Cancelar</button>
                <button type="submit">Salvar</button>
            </div>

        </form>
    `);

    document.getElementById("cancelarModal").addEventListener("click", fecharModalDinamico);

    document.getElementById("formEditarVeiculo").addEventListener("submit", function (event) {
        event.preventDefault();

        const placa = document.getElementById("novaPlaca").value.toUpperCase().trim();
        const tipo = document.getElementById("novoTipo").value.trim();
        const status = document.getElementById("novoStatus").value.trim().toLowerCase();

        if (!verificarPlaca(placa)) {
            alert("A placa deve ter exatamente 7 caracteres!");
            return;
        }

        if (veiculos.some(function (item) {
            return item.id !== id && item.placa === placa;
        })) {
            alert("Essa placa já está cadastrada!");
            return;
        }

        if (tipo === "") {
            alert("Digite o tipo do veículo!");
            return;
        }

        if (status !== "dentro" && status !== "fora") {
            alert("Status inválido! Digite Dentro ou Fora.");
            return;
        }

        veiculo.placa = placa;
        veiculo.tipo = tipo;
        veiculo.status = status === "dentro" ? "Dentro" : "Fora";

        mostrarVeiculos();
        fecharModalDinamico();
    });
}

function excluirVeiculo(id) {
    const veiculo = veiculos.find(function (item) {
        return item.id === id;
    });

    if (!veiculo) return;

    abrirModalDinamico(`
        <h2>Excluir</h2>

        <p class="texto-modal">
            Deseja realmente excluir o veículo ${veiculo.placa}?
        </p>

        <div class="modal-botoes">
            <button type="button" id="cancelarModal">Cancelar</button>
            <button type="button" id="confirmarExcluir">Excluir</button>
        </div>
    `);

    document.getElementById("cancelarModal").addEventListener("click", fecharModalDinamico);

    document.getElementById("confirmarExcluir").addEventListener("click", function () {
        const indice = veiculos.findIndex(function (item) {
            return item.id === id;
        });

        if (indice === -1) return;

        veiculos.splice(indice, 1);

        mostrarVeiculos();
        fecharModalDinamico();
    });
}

// Fechar modal clicando fora
modal.addEventListener("click", function (event) {
    if (event.target === modal) {
        fecharModalDinamico();
    }
});

busca.addEventListener("input", mostrarVeiculos);

botaoCadastrar.addEventListener("click", function (event) {
    event.preventDefault();
    cadastrarVeiculo();
});

mostrarVeiculos();

const form = document.getElementById("form_usuario");

const campoNome = document.getElementById("usuario_nome");
const campoSobrenome = document.getElementById("usuario_sobrenome");
const campoEmail = document.getElementById("usuario_email");
const campoTelefone = document.getElementById("usuario_telefone");
const campoLocalizacao = document.getElementById("usuario_localizacao");

const botaoEditar = document.getElementById("editar_usuario");
const botaoSalvar = document.getElementById("salvar_usuario");
const botaoSair = document.getElementById("sair_config");

let nomeOriginal = campoNome.value;
let sobrenomeOriginal = campoSobrenome.value;
let emailOriginal = campoEmail.value;
let telefoneOriginal = campoTelefone.value;
let localizacaoOriginal = campoLocalizacao.value;

function bloquearCampos() {
    campoNome.readOnly = true;
    campoSobrenome.readOnly = true;
    campoEmail.readOnly = true;
    campoTelefone.readOnly = true;
    campoLocalizacao.disabled = true;

    form.classList.remove("editando");

    botaoSalvar.disabled = true;
    botaoEditar.textContent = "Editar";
}

function liberarCampos() {
    campoNome.readOnly = false;
    campoSobrenome.readOnly = false;
    campoEmail.readOnly = false;
    campoTelefone.readOnly = false;
    campoLocalizacao.disabled = false;

    form.classList.add("editando");

    botaoSalvar.disabled = false;
    botaoEditar.textContent = "Cancelar";
}

function guardarOriginais() {
    nomeOriginal = campoNome.value;
    sobrenomeOriginal = campoSobrenome.value;
    emailOriginal = campoEmail.value;
    telefoneOriginal = campoTelefone.value;
    localizacaoOriginal = campoLocalizacao.value;
}

function voltarOriginais() {
    campoNome.value = nomeOriginal;
    campoSobrenome.value = sobrenomeOriginal;
    campoEmail.value = emailOriginal;
    campoTelefone.value = telefoneOriginal;
    campoLocalizacao.value = localizacaoOriginal;
}

function salvarNoNavegador() {
    const dados = {
        nome: campoNome.value,
        sobrenome: campoSobrenome.value,
        email: campoEmail.value,
        telefone: campoTelefone.value,
        localizacao: campoLocalizacao.value
    };

    localStorage.setItem("autocontrol_usuario", JSON.stringify(dados));
}

function carregarDoNavegador() {
    const texto = localStorage.getItem("autocontrol_usuario");

    if (texto === null) return;

    const dados = JSON.parse(texto);

    campoNome.value = dados.nome;
    campoSobrenome.value = dados.sobrenome;
    campoEmail.value = dados.email;
    campoTelefone.value = dados.telefone;
    campoLocalizacao.value = dados.localizacao;
}

botaoEditar.addEventListener("click", function () {
    if (botaoEditar.textContent === "Cancelar") {
        voltarOriginais();
        bloquearCampos();
    } else {
        liberarCampos();
        campoNome.focus();
    }
});

form.addEventListener("submit", function (evento) {
    evento.preventDefault();

    if (campoNome.value.trim() === "") {
        alert("Digite o nome.");
        return;
    }

    if (!campoEmail.value.includes("@")) {
        alert("Digite um e-mail válido.");
        return;
    }

    guardarOriginais();
    salvarNoNavegador();
    bloquearCampos();
});
botaoSair.addEventListener("click", function () {
    document.getElementById("sair_button").click();
});

carregarDoNavegador();
guardarOriginais();
bloquearCampos();
