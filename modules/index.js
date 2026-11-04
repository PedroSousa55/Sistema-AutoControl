


const loginForm = document.getElementById("loginForm");
const placa = document.getElementById("placa");
const message = document.getElementById("message");

placa.addEventListener("input", () => {
    placa.value = placa.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
});

loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const placaInformada = placa.value.trim();

    if (placaInformada.length != 7) {
        return message.textContent = "Informe uma placa válida com 7 caracteres.";
    }

    


    message.textContent = `Placa ${placaInformada} informada. ESPERANDO API para consultar o veículo.`;
    window.location.href="/src/html/user.html"
});
