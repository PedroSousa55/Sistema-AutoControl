const horarioEntrada = Date.now();
function atualizarTempo() {
    const agora = Date.now();

    const diferenca = Math.floor(
        (agora - horarioEntrada) / 1000
    );

    const horas = Math.floor(diferenca / 3600);
    const minutos = Math.floor((diferenca % 3600) / 60);
    const segundos = diferenca % 60;

    const tempoFormatado =
        `${String(horas).padStart(2, "0")}:` +
        `${String(minutos).padStart(2, "0")}:` +
        `${String(segundos).padStart(2, "0")}`;

    document.getElementById("tempo").textContent = tempoFormatado;
}

atualizarTempo();
setInterval(atualizarTempo, 1000);