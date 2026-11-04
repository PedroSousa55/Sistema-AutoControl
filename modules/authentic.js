
const tipoUsuario = "vigia";
// Trocar para admin para testar
// admin ou adm 

const menusRestritos = [
    "relatorios_menu",
    "config_menu",
    "veiculo_menu"
];

const telasRestritas = [
    "relatorios_main",
    "config_main",
    "veiculo_main"
];




// if (menuInicio) {
//     menuInicio.classList.add("active");
// }


function configurarPermissoes() {
    const eAdmin = tipoUsuario === "admin" || "adm";


    if (!eAdmin) {
        menusRestritos.forEach(function (id) {
            const menu = document.getElementById(id);

            if (menu) {
                menu.style.display = "none";
            }
        });

        telasRestritas.forEach(function (id) {
            const tela = document.getElementById(id);

            if (tela) {
                tela.style.display = "none";
            }
        });

        const inicio = document.getElementById("dashboard");

        if (inicio) {
            inicio.style.display = "block";
        }
        const menuInicio = document.getElementById("inicio_menu");

        if (menuInicio) {
            menuInicio.classList.add("active");
        }
    }
}

document.addEventListener("DOMContentLoaded", function () {
    configurarPermissoes();
});

export default configurarPermissoes
